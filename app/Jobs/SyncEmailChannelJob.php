<?php

namespace App\Jobs;

use App\Contracts\EmailProviderInterface;
use App\Enums\PostImportAction;
use App\Models\EmailChannel;
use App\Models\EmailChannelLog;
use App\Services\Email\EmailProviderFactory;
use App\Services\EmailParser;
use App\Services\OrganizationContext;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sync emails from an email channel.
 *
 * Fetches new messages from the email provider (Microsoft 365, Google, etc.)
 * and creates tickets or adds replies to existing tickets.
 */
class SyncEmailChannelJob implements ShouldQueue
{
    use Queueable;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 60;

    /**
     * Delete the job if its models no longer exist.
     */
    public bool $deleteWhenMissingModels = true;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public EmailChannel $emailChannel,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(
        EmailProviderFactory $providerFactory,
        EmailParser $emailParser,
        OrganizationContext $organizationContext,
    ): void {
        $channel = $this->emailChannel;

        // Set the organization context so all scoped queries and observers work correctly
        $organizationContext->set($channel->organization);

        // Skip if channel is not active
        if (! $channel->is_active) {
            return;
        }

        // Skip if no OAuth token
        if (! $channel->oauth_token) {
            Log::warning('Skipping sync for email channel without OAuth token', [
                'channel_id' => $channel->id,
            ]);

            return;
        }

        try {
            $provider = $providerFactory->make($channel);

            // Determine the date from which to fetch emails
            // Priority: import_emails_since cutoff > last_sync_at > default 24h
            if ($channel->import_emails_since) {
                // Use the configured cutoff date (for historical import filtering)
                // On subsequent syncs, use the later of: cutoff date or (last_sync - 1 hour buffer)
                $cutoffDate = $channel->import_emails_since;
                $lastSyncBuffer = $channel->last_sync_at?->subHour();

                $since = $lastSyncBuffer && $lastSyncBuffer->gt($cutoffDate)
                    ? $lastSyncBuffer
                    : $cutoffDate;
            } else {
                // Default behavior: since last sync (with buffer) or 24h
                $since = $channel->last_sync_at
                    ? $channel->last_sync_at->subHour()
                    : now()->subDay();
            }

            $messages = $provider->fetchMessages($channel, $since);

            $created = 0;
            $updated = 0;
            $skipped = 0;
            $postActionProcessed = 0;

            foreach ($messages as $emailData) {
                try {
                    // Skip emails from our own email address (to avoid loops)
                    if (strtolower($emailData['from_email']) === strtolower($channel->email_address)) {
                        $skipped++;

                        continue;
                    }

                    $ticket = $emailParser->parse($emailData, $channel);

                    // Check if this was a new ticket or a reply
                    if ($ticket->wasRecentlyCreated) {
                        $created++;
                    } else {
                        $updated++;
                    }

                    // Execute post-import action on the source email
                    // IMPORTANT: This may change the message ID (when moving)
                    $newMessageId = $this->executePostImportAction($provider, $channel, $emailData['id']);

                    // Update ticket with new message ID if it changed
                    if ($newMessageId && $newMessageId !== $emailData['id']) {
                        $ticket->update(['email_original_message_id' => $newMessageId]);
                    }

                    $postActionProcessed++;
                } catch (Throwable $e) {
                    Log::error('Failed to process email message', [
                        'channel_id' => $channel->id,
                        'message_id' => $emailData['internet_message_id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Mark channel as synced
            $channel->markSynced();

            // Log sync result
            EmailChannelLog::logSync(
                emailChannelId: $channel->id,
                status: 'success',
                emailsProcessed: count($messages),
                ticketsCreated: $created,
                messagesAdded: $updated,
            );

            Log::info('Email sync completed', [
                'channel_id' => $channel->id,
                'emails' => count($messages),
                'created' => $created,
                'updated' => $updated,
                'skipped' => $skipped,
            ]);
        } catch (Throwable $e) {
            Log::error('Email sync failed for channel', [
                'channel_id' => $channel->id,
                'error' => $e->getMessage(),
            ]);

            // Log sync failure
            EmailChannelLog::logSync(
                emailChannelId: $channel->id,
                status: 'failed',
                error: $e->getMessage(),
            );

            // Mark channel with error
            $channel->markSyncError($e->getMessage());

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(?Throwable $exception): void
    {
        Log::error('SyncEmailChannelJob failed permanently', [
            'channel_id' => $this->emailChannel->id,
            'error' => $exception?->getMessage(),
        ]);

        $this->emailChannel->markSyncError(
            $exception?->getMessage() ?? 'Unknown error'
        );
    }

    /**
     * Get the tags that should be assigned to the job.
     *
     * @return array<string>
     */
    public function tags(): array
    {
        return [
            'email-sync',
            'channel:'.$this->emailChannel->id,
            'organization:'.$this->emailChannel->organization_id,
        ];
    }

    /**
     * Execute the configured post-import action on an email.
     *
     * @return string|null The new message ID if it changed (move/archive), null otherwise
     */
    private function executePostImportAction(
        EmailProviderInterface $provider,
        EmailChannel $channel,
        string $messageId
    ): ?string {
        $action = $channel->post_import_action ?? PostImportAction::Nothing;

        if ($action === PostImportAction::Nothing) {
            return null;
        }

        try {
            // These operations may return a new message ID
            $newMessageId = match ($action) {
                PostImportAction::Delete => null, // Message is deleted, no new ID
                PostImportAction::Archive => $provider->archiveMessage($channel, $messageId),
                PostImportAction::MoveToFolder => $this->moveToConfiguredFolder($provider, $channel, $messageId),
                PostImportAction::Nothing => null,
            };

            return $newMessageId;
        } catch (Throwable $e) {
            Log::warning('Post-import action failed', [
                'channel_id' => $channel->id,
                'message_id' => $messageId,
                'action' => $action->value,
                'error' => $e->getMessage(),
            ]);

            // Don't rethrow - the email was imported successfully, just the cleanup failed
            return null;
        }
    }

    /**
     * Move an email to the configured post-import folder.
     *
     * @return string|null The new message ID after moving, or null if no folder configured
     */
    private function moveToConfiguredFolder(
        EmailProviderInterface $provider,
        EmailChannel $channel,
        string $messageId
    ): ?string {
        if (! $channel->post_import_folder) {
            Log::warning('Post-import action is move_to_folder but no folder configured', [
                'channel_id' => $channel->id,
            ]);

            return null;
        }

        return $provider->moveMessage($channel, $messageId, $channel->post_import_folder);
    }
}
