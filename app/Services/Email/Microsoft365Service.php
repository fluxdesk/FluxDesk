<?php

namespace App\Services\Email;

use App\Contracts\EmailProviderInterface;
use App\Integrations\Contracts\Integration;
use App\Models\EmailChannel;
use App\Models\Message;
use App\Models\OrganizationIntegration;
use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Microsoft 365 email provider service.
 *
 * Handles OAuth authentication and email operations via the Microsoft Graph API.
 * Supports fetching emails, sending emails with proper threading headers,
 * and token refresh.
 */
class Microsoft365Service implements EmailProviderInterface
{
    private const GRAPH_URL = 'https://graph.microsoft.com/v1.0';

    /**
     * The organization's integration configuration.
     */
    private ?OrganizationIntegration $orgIntegration = null;

    /**
     * The integration class instance.
     */
    private ?Integration $integration = null;

    /**
     * Set the organization integration to use for OAuth operations.
     */
    public function setIntegration(OrganizationIntegration $orgIntegration): self
    {
        $this->orgIntegration = $orgIntegration;
        $this->integration = $orgIntegration->getIntegrationInstance();

        return $this;
    }

    /**
     * Get the OAuth authorization URL to start the authentication flow.
     */
    public function getAuthorizationUrl(string $state): string
    {
        $this->ensureIntegration();

        return $this->integration->authorizationUrl($this->orgIntegration->credentials ?? [], $state);
    }

    /**
     * Handle the OAuth callback and store tokens.
     */
    public function handleCallback(string $code, EmailChannel $channel): void
    {
        $this->ensureIntegration();

        $credentials = $this->orgIntegration->credentials ?? [];
        $tokenUrl = $this->integration->tokenUrl($credentials);

        $response = Http::asForm()->post($tokenUrl, [
            'client_id' => $credentials['client_id'] ?? '',
            'client_secret' => $credentials['client_secret'] ?? '',
            'code' => $code,
            'redirect_uri' => $this->integration->redirectUri(),
            'grant_type' => 'authorization_code',
        ]);

        if ($response->failed()) {
            Log::error('Microsoft 365 OAuth token exchange failed', [
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to exchange authorization code for tokens');
        }

        $data = $response->json();

        $channel->update([
            'oauth_token' => $data['access_token'],
            'oauth_refresh_token' => $data['refresh_token'] ?? null,
            'oauth_token_expires_at' => now()->addSeconds($data['expires_in'] ?? 3600),
        ]);

        // Get and update the email address from the user profile
        $email = $this->getUserEmail($channel);
        if ($email && $channel->email_address !== $email) {
            $channel->update(['email_address' => $email]);
        }
    }

    /**
     * Refresh the OAuth access token using the refresh token.
     */
    public function refreshToken(EmailChannel $channel): void
    {
        if (! $channel->oauth_refresh_token) {
            throw new \Exception('No refresh token available');
        }

        $this->ensureIntegration();

        $credentials = $this->orgIntegration->credentials ?? [];
        $tokenUrl = $this->integration->tokenUrl($credentials);

        $response = Http::asForm()->post($tokenUrl, [
            'client_id' => $credentials['client_id'] ?? '',
            'client_secret' => $credentials['client_secret'] ?? '',
            'refresh_token' => $channel->oauth_refresh_token,
            'grant_type' => 'refresh_token',
        ]);

        if ($response->failed()) {
            Log::error('Microsoft 365 token refresh failed', [
                'channel_id' => $channel->id,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to refresh access token');
        }

        $data = $response->json();

        $channel->update([
            'oauth_token' => $data['access_token'],
            'oauth_refresh_token' => $data['refresh_token'] ?? $channel->oauth_refresh_token,
            'oauth_token_expires_at' => now()->addSeconds($data['expires_in'] ?? 3600),
        ]);
    }

    /**
     * Fetch new messages from Microsoft 365.
     */
    public function fetchMessages(EmailChannel $channel, ?Carbon $since = null): Collection
    {
        $this->ensureValidToken($channel);

        $query = [
            '$select' => 'id,internetMessageId,conversationId,from,toRecipients,ccRecipients,bccRecipients,subject,body,bodyPreview,receivedDateTime,importance,internetMessageHeaders,hasAttachments',
            '$orderby' => 'receivedDateTime desc',
            '$top' => 50,
        ];

        // Build filter for the folder and date
        $filters = [];

        if ($since) {
            $filters[] = "receivedDateTime ge {$since->toIso8601String()}";
        }

        if (! empty($filters)) {
            $query['$filter'] = implode(' and ', $filters);
        }

        $endpoint = self::GRAPH_URL.'/me/mailFolders/'.$channel->fetch_folder.'/messages';

        $response = $this->makeRequest($channel)
            ->get($endpoint, $query);

        if ($response->failed()) {
            Log::error('Microsoft 365 fetch messages failed', [
                'channel_id' => $channel->id,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to fetch messages from Microsoft 365');
        }

        $messages = collect($response->json('value', []));

        return $messages->map(function (array $message) use ($channel) {
            $normalized = $this->normalizeMessage($message);

            // Fetch attachments if the message has any
            if ($message['hasAttachments'] ?? false) {
                $normalized['attachments'] = $this->fetchAttachments($channel, $message['id']);
            }

            return $normalized;
        });
    }

    /**
     * Fetch attachments for a specific message.
     *
     * @return array<int, array{id: string, name: string, content_type: string, size: int, content_id: string|null, is_inline: bool, content: string}>
     */
    public function fetchAttachments(EmailChannel $channel, string $messageId): array
    {
        $this->ensureValidToken($channel);

        $endpoint = self::GRAPH_URL."/me/messages/{$messageId}/attachments";

        $response = $this->makeRequest($channel)->get($endpoint);

        if ($response->failed()) {
            Log::warning('Failed to fetch attachments', [
                'channel_id' => $channel->id,
                'message_id' => $messageId,
                'status' => $response->status(),
            ]);

            return [];
        }

        $attachments = [];
        foreach ($response->json('value', []) as $attachment) {
            // Only process file attachments (skip item attachments like embedded emails)
            if (($attachment['@odata.type'] ?? '') !== '#microsoft.graph.fileAttachment') {
                continue;
            }

            $attachments[] = [
                'id' => $attachment['id'],
                'name' => $attachment['name'],
                'content_type' => $attachment['contentType'] ?? 'application/octet-stream',
                'size' => $attachment['size'] ?? 0,
                'content_id' => $attachment['contentId'] ?? null,
                'is_inline' => $attachment['isInline'] ?? false,
                'content' => $attachment['contentBytes'] ?? '',
            ];
        }

        return $attachments;
    }

    /**
     * Send an email message via Microsoft Graph API.
     */
    public function sendMessage(
        EmailChannel $channel,
        Message $message,
        Ticket $ticket,
        array $headers
    ): string {
        $this->ensureValidToken($channel);

        // Build the email payload
        $payload = [
            'message' => [
                'subject' => $headers['subject'],
                'body' => [
                    'contentType' => 'HTML',
                    'content' => $message->body_html ?? nl2br(e($message->body)),
                ],
                'toRecipients' => [
                    [
                        'emailAddress' => [
                            'address' => $headers['to_email'],
                            'name' => $headers['to_name'] ?? $headers['to_email'],
                        ],
                    ],
                ],
                'internetMessageHeaders' => $this->buildInternetMessageHeaders($headers),
            ],
            'saveToSentItems' => true,
        ];

        $response = $this->makeRequest($channel)
            ->post(self::GRAPH_URL.'/me/sendMail', $payload);

        if ($response->failed()) {
            Log::error('Microsoft 365 send message failed', [
                'channel_id' => $channel->id,
                'message_id' => $message->id,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to send email via Microsoft 365');
        }

        // Microsoft doesn't return the sent message ID directly from sendMail
        // We use our custom Message-ID that we set in headers
        return $headers['message_id'];
    }

    /**
     * Get a specific message by its provider ID.
     */
    public function getMessageById(EmailChannel $channel, string $messageId): ?array
    {
        $this->ensureValidToken($channel);

        $response = $this->makeRequest($channel)
            ->get(self::GRAPH_URL."/me/messages/{$messageId}", [
                '$select' => 'id,internetMessageId,conversationId,from,subject,body,bodyPreview,receivedDateTime,importance,internetMessageHeaders',
            ]);

        if ($response->failed()) {
            if ($response->status() === 404) {
                return null;
            }
            throw new \Exception('Failed to get message: '.$response->body());
        }

        return $this->normalizeMessage($response->json());
    }

    /**
     * Verify the OAuth connection is working.
     */
    public function testConnection(EmailChannel $channel): array
    {
        try {
            $this->ensureValidToken($channel);

            $response = $this->makeRequest($channel)
                ->get(self::GRAPH_URL.'/me', [
                    '$select' => 'mail,userPrincipalName',
                ]);

            if ($response->failed()) {
                return [
                    'success' => false,
                    'email' => null,
                    'error' => 'Failed to connect: '.$response->status(),
                ];
            }

            $data = $response->json();

            return [
                'success' => true,
                'email' => $data['mail'] ?? $data['userPrincipalName'] ?? null,
                'error' => null,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'email' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get the user's email address from Microsoft Graph.
     */
    public function getUserEmail(EmailChannel $channel): string
    {
        $this->ensureValidToken($channel);

        $response = $this->makeRequest($channel)
            ->get(self::GRAPH_URL.'/me', [
                '$select' => 'mail,userPrincipalName',
            ]);

        if ($response->failed()) {
            throw new \Exception('Failed to get user email: '.$response->body());
        }

        $data = $response->json();

        return $data['mail'] ?? $data['userPrincipalName'];
    }

    /**
     * Get available mail folders from Microsoft 365.
     *
     * @return array<int, array{id: string, name: string, display_name: string}>
     */
    public function getMailFolders(EmailChannel $channel): array
    {
        $this->ensureValidToken($channel);

        $response = $this->makeRequest($channel)
            ->get(self::GRAPH_URL.'/me/mailFolders', [
                '$select' => 'id,displayName',
                '$top' => 100,
            ]);

        if ($response->failed()) {
            Log::error('Microsoft 365 get mail folders failed', [
                'channel_id' => $channel->id,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to get Microsoft 365 mail folders');
        }

        $folders = $response->json('value', []);

        return array_map(function (array $folder) {
            return [
                'id' => $folder['id'],
                'name' => $folder['displayName'],
                'display_name' => $folder['displayName'],
            ];
        }, $folders);
    }

    /**
     * Delete a message from Microsoft 365.
     */
    public function deleteMessage(EmailChannel $channel, string $messageId): void
    {
        $this->ensureValidToken($channel);

        $response = $this->makeRequest($channel)
            ->delete(self::GRAPH_URL."/me/messages/{$messageId}");

        if ($response->failed()) {
            Log::error('Microsoft 365 delete message failed', [
                'channel_id' => $channel->id,
                'message_id' => $messageId,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to delete Microsoft 365 message');
        }
    }

    /**
     * Archive a message (move to Deleted Items as Microsoft 365 doesn't have a standard Archive folder).
     * Note: Microsoft 365 uses "archive" wellknown folder name for archiving.
     */
    public function archiveMessage(EmailChannel $channel, string $messageId): ?string
    {
        $this->ensureValidToken($channel);

        // Try to get the Archive folder, fall back to deleteditems if not available
        $archiveFolderId = $this->getWellKnownFolderId($channel, 'archive');

        if (! $archiveFolderId) {
            // Fall back to simply deleting if no archive folder exists
            Log::warning('No archive folder found, falling back to delete', [
                'channel_id' => $channel->id,
                'message_id' => $messageId,
            ]);
            $this->deleteMessage($channel, $messageId);

            return null; // Message deleted, no new ID
        }

        return $this->moveMessage($channel, $messageId, $archiveFolderId);
    }

    /**
     * Move a message to a specific folder.
     *
     * IMPORTANT: When a message is moved, Microsoft Graph assigns it a NEW ID.
     * This method returns the new message ID so callers can update their references.
     *
     * @return string The NEW message ID after moving
     */
    public function moveMessage(EmailChannel $channel, string $messageId, string $folderId): string
    {
        $this->ensureValidToken($channel);

        $response = $this->makeRequest($channel)
            ->post(self::GRAPH_URL."/me/messages/{$messageId}/move", [
                'destinationId' => $folderId,
            ]);

        if ($response->failed()) {
            Log::error('Microsoft 365 move message failed', [
                'channel_id' => $channel->id,
                'message_id' => $messageId,
                'folder_id' => $folderId,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to move Microsoft 365 message');
        }

        // Microsoft returns the moved message with its NEW ID
        return $response->json('id');
    }

    /**
     * Send a notification email with threading support.
     *
     * If original_message_id exists (from customer's email), uses /reply endpoint.
     * This threads the notification under the customer's original email.
     * Falls back to sendMail if /reply fails (e.g., email was archived/deleted).
     */
    public function sendNotification(EmailChannel $channel, array $data): ?string
    {
        $this->ensureValidToken($channel);

        // If we have the original email's ID, use /reply for threading
        if (! empty($data['original_message_id'])) {
            if ($this->sendAsReply($channel, $data)) {
                return null; // Threaded reply sent successfully
            }
            // Reply failed (email was archived/deleted), fall through to send as new
        }

        // Send as new email (fallback or no original message to reply to)
        return $this->sendNewEmail($channel, $data);
    }

    /**
     * Send as a reply using /reply endpoint for threading.
     *
     * Uses the original customer email's ID to thread notifications.
     *
     * @return bool True if successful, false if failed (caller should fall back)
     */
    private function sendAsReply(EmailChannel $channel, array $data): bool
    {
        $originalMessageId = $data['original_message_id'];

        $replyPayload = [
            'message' => [
                'toRecipients' => [
                    ['emailAddress' => ['address' => $data['to_email'], 'name' => $data['to_name'] ?? $data['to_email']]],
                ],
                'body' => [
                    'contentType' => 'HTML',
                    'content' => $data['html'],
                ],
            ],
        ];

        if (! empty($data['cc'])) {
            $replyPayload['message']['ccRecipients'] = array_map(
                fn ($cc) => ['emailAddress' => ['address' => $cc['email'], 'name' => $cc['name'] ?? $cc['email']]],
                $data['cc']
            );
        }

        // Add X-Ticket-ID header for reliable matching of replies
        if (! empty($data['headers']['ticket_number'])) {
            $replyPayload['message']['internetMessageHeaders'] = [
                ['name' => 'X-Ticket-ID', 'value' => $data['headers']['ticket_number']],
            ];
        }

        $endpoint = self::GRAPH_URL."/me/messages/{$originalMessageId}/reply";
        $response = $this->makeRequest($channel)->post($endpoint, $replyPayload);

        if ($response->failed()) {
            return false;
        }

        return true;
    }

    /**
     * Send email via sendMail (no threading).
     *
     * Used as fallback when original email is not available or was deleted.
     */
    private function sendNewEmail(EmailChannel $channel, array $data): ?string
    {
        $message = [
            'subject' => $data['subject'],
            'body' => [
                'contentType' => 'HTML',
                'content' => $data['html'],
            ],
            'toRecipients' => [
                ['emailAddress' => ['address' => $data['to_email'], 'name' => $data['to_name'] ?? $data['to_email']]],
            ],
        ];

        if (! empty($data['cc'])) {
            $message['ccRecipients'] = array_map(
                fn ($cc) => ['emailAddress' => ['address' => $cc['email'], 'name' => $cc['name'] ?? $cc['email']]],
                $data['cc']
            );
        }

        if (! empty($data['reply_to'])) {
            $message['replyTo'] = [['emailAddress' => ['address' => $data['reply_to']]]];
        }

        // Add X-Ticket-ID header for reliable matching of replies
        if (! empty($data['headers']['ticket_number'])) {
            $message['internetMessageHeaders'] = [
                ['name' => 'X-Ticket-ID', 'value' => $data['headers']['ticket_number']],
            ];
        }

        $response = $this->makeRequest($channel)->post(self::GRAPH_URL.'/me/sendMail', [
            'message' => $message,
            'saveToSentItems' => true,
        ]);

        if ($response->failed()) {
            throw new \Exception('Failed to send notification: '.$response->body());
        }

        return null;
    }

    /**
     * Get the ID of a well-known folder by name.
     */
    private function getWellKnownFolderId(EmailChannel $channel, string $folderName): ?string
    {
        try {
            $response = $this->makeRequest($channel)
                ->get(self::GRAPH_URL."/me/mailFolders/{$folderName}");

            if ($response->successful()) {
                return $response->json('id');
            }
        } catch (\Exception $e) {
            // Folder doesn't exist
        }

        return null;
    }

    /**
     * Ensure the integration is set before OAuth operations.
     *
     * @throws \RuntimeException
     */
    private function ensureIntegration(): void
    {
        if (! $this->orgIntegration || ! $this->integration) {
            throw new \RuntimeException('Integration must be set before OAuth operations. Call setIntegration() first.');
        }

        if (! $this->orgIntegration->isConfigured()) {
            throw new \RuntimeException('Integration credentials are not properly configured.');
        }
    }

    /**
     * Ensure the OAuth token is valid, refreshing if necessary.
     */
    private function ensureValidToken(EmailChannel $channel): void
    {
        if ($channel->isTokenExpired()) {
            $this->refreshToken($channel);
            $channel->refresh();
        }
    }

    /**
     * Create an HTTP client with the authorization header.
     */
    private function makeRequest(EmailChannel $channel): PendingRequest
    {
        return Http::withToken($channel->oauth_token)
            ->acceptJson()
            ->asJson();
    }

    /**
     * Normalize a Microsoft Graph message to our standard format.
     *
     * @return array<string, mixed>
     */
    private function normalizeMessage(array $message): array
    {
        $headers = $this->extractInternetHeaders($message['internetMessageHeaders'] ?? []);

        return [
            'id' => $message['id'],
            'internet_message_id' => $message['internetMessageId'] ?? null,
            'conversation_id' => $message['conversationId'] ?? null,
            'thread_id' => null, // Microsoft uses conversationId instead
            'from_email' => $message['from']['emailAddress']['address'] ?? '',
            'from_name' => $message['from']['emailAddress']['name'] ?? null,
            'to_recipients' => $this->normalizeRecipients($message['toRecipients'] ?? []),
            'cc_recipients' => $this->normalizeRecipients($message['ccRecipients'] ?? []),
            'bcc_recipients' => $this->normalizeRecipients($message['bccRecipients'] ?? []),
            'subject' => $message['subject'] ?? '',
            'body_text' => strip_tags($message['body']['content'] ?? ''),
            'body_html' => $message['body']['contentType'] === 'html'
                ? $message['body']['content']
                : null,
            'received_at' => Carbon::parse($message['receivedDateTime']),
            'in_reply_to' => $headers['In-Reply-To'] ?? null,
            'references' => $this->parseReferences($headers['References'] ?? ''),
            'importance' => $message['importance'] ?? 'normal',
            'headers' => $headers,
            'attachments' => [], // Will be fetched separately if needed
        ];
    }

    /**
     * Normalize recipient data from Microsoft Graph format.
     *
     * @param  array<int, array{emailAddress: array{address: string, name?: string}}>  $recipients
     * @return array<int, array{email: string, name: string|null}>
     */
    private function normalizeRecipients(array $recipients): array
    {
        return array_map(fn ($r) => [
            'email' => $r['emailAddress']['address'] ?? '',
            'name' => $r['emailAddress']['name'] ?? null,
        ], $recipients);
    }

    /**
     * Extract internet headers into an associative array.
     *
     * @param  array<int, array{name: string, value: string}>  $headers
     * @return array<string, string>
     */
    private function extractInternetHeaders(array $headers): array
    {
        $result = [];
        foreach ($headers as $header) {
            $result[$header['name']] = $header['value'];
        }

        return $result;
    }

    /**
     * Build internet message headers for the email.
     *
     * Microsoft Graph API only allows custom headers starting with 'X-' or 'x-'.
     * Standard headers (Message-ID, In-Reply-To, References) are NOT allowed
     * and will cause an InvalidInternetMessageHeader error.
     *
     * Threading relies on:
     * - X-Ticket-Reference: Our custom header with ticket number (bulletproof matching)
     * - Subject line: Contains [TKT-XXXXX] for fallback matching
     * - conversation_id: Microsoft's thread identifier (matched on incoming emails)
     *
     * @return array<int, array{name: string, value: string}>
     */
    private function buildInternetMessageHeaders(array $headers): array
    {
        $internetHeaders = [];

        // Custom header for ticket reference (primary matching method)
        if (! empty($headers['ticket_number'])) {
            $internetHeaders[] = [
                'name' => 'X-Ticket-Reference',
                'value' => $headers['ticket_number'],
            ];
        }

        return $internetHeaders;
    }

    /**
     * Parse the References header into an array of message IDs.
     *
     * @return array<string>
     */
    private function parseReferences(string $references): array
    {
        if (empty($references)) {
            return [];
        }

        preg_match_all('/<([^>]+)>/', $references, $matches);

        return $matches[1] ?? [];
    }
}
