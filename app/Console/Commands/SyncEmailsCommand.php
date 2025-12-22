<?php

namespace App\Console\Commands;

use App\Jobs\SyncEmailChannelJob;
use App\Models\EmailChannel;
use Illuminate\Console\Command;

/**
 * Sync emails from all active email channels.
 *
 * This command dispatches sync jobs for email channels that need syncing
 * based on their configured sync interval.
 */
class SyncEmailsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:sync
                            {--channel= : Sync a specific channel by ID}
                            {--force : Force sync even if not due}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync emails from active email channels';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $channelId = $this->option('channel');
        $force = $this->option('force');

        if ($channelId) {
            return $this->syncChannel($channelId, $force);
        }

        return $this->syncAllChannels($force);
    }

    /**
     * Sync a specific email channel.
     */
    private function syncChannel(int $channelId, bool $force): int
    {
        $channel = EmailChannel::find($channelId);

        if (! $channel) {
            $this->error("Email channel with ID {$channelId} not found.");

            return self::FAILURE;
        }

        if (! $channel->is_active) {
            $this->warn("Email channel {$channel->name} is not active.");

            return self::FAILURE;
        }

        if (! $channel->oauth_token) {
            $this->warn("Email channel {$channel->name} has no OAuth token.");

            return self::FAILURE;
        }

        if (! $force && ! $channel->needsSync()) {
            $this->info("Email channel {$channel->name} does not need sync yet.");

            return self::SUCCESS;
        }

        $this->info("Dispatching sync job for channel: {$channel->name}");
        SyncEmailChannelJob::dispatch($channel);

        return self::SUCCESS;
    }

    /**
     * Sync all email channels that need syncing.
     */
    private function syncAllChannels(bool $force): int
    {
        $query = EmailChannel::query()
            ->where('is_active', true)
            ->whereNotNull('oauth_token');

        $channels = $query->get();

        if ($channels->isEmpty()) {
            $this->info('No active email channels with OAuth tokens found.');

            return self::SUCCESS;
        }

        $dispatched = 0;
        $skipped = 0;

        foreach ($channels as $channel) {
            if (! $force && ! $channel->needsSync()) {
                $skipped++;

                continue;
            }

            $this->line("Dispatching sync job for: {$channel->name} ({$channel->email_address})");
            SyncEmailChannelJob::dispatch($channel);
            $dispatched++;
        }

        $this->info("Dispatched {$dispatched} sync jobs, skipped {$skipped} channels (not due for sync).");

        return self::SUCCESS;
    }
}
