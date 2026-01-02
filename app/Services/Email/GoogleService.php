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
use Illuminate\Support\Facades\Storage;

/**
 * Google Workspace / Gmail email provider service.
 *
 * Handles OAuth authentication and email operations via the Gmail API.
 * Supports fetching emails, sending emails with proper threading headers,
 * and token refresh.
 */
class GoogleService implements EmailProviderInterface
{
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const GMAIL_URL = 'https://gmail.googleapis.com/gmail/v1';

    private const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

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

        $response = Http::asForm()->post(self::TOKEN_URL, [
            'client_id' => $credentials['client_id'] ?? '',
            'client_secret' => $credentials['client_secret'] ?? '',
            'code' => $code,
            'redirect_uri' => $this->integration->redirectUri(),
            'grant_type' => 'authorization_code',
        ]);

        if ($response->failed()) {
            Log::error('Google OAuth token exchange failed', [
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

        $response = Http::asForm()->post(self::TOKEN_URL, [
            'client_id' => $credentials['client_id'] ?? '',
            'client_secret' => $credentials['client_secret'] ?? '',
            'refresh_token' => $channel->oauth_refresh_token,
            'grant_type' => 'refresh_token',
        ]);

        if ($response->failed()) {
            Log::error('Google token refresh failed', [
                'channel_id' => $channel->id,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to refresh access token');
        }

        $data = $response->json();

        // Google doesn't always return a new refresh token, keep existing one
        $channel->update([
            'oauth_token' => $data['access_token'],
            'oauth_refresh_token' => $data['refresh_token'] ?? $channel->oauth_refresh_token,
            'oauth_token_expires_at' => now()->addSeconds($data['expires_in'] ?? 3600),
        ]);
    }

    /**
     * Fetch new messages from Gmail.
     */
    public function fetchMessages(EmailChannel $channel, ?Carbon $since = null): Collection
    {
        $this->ensureValidToken($channel);

        // Build Gmail search query
        $query = $this->buildSearchQuery($channel->fetch_folder, $since);

        $response = $this->makeRequest($channel)
            ->get(self::GMAIL_URL.'/users/me/messages', [
                'q' => $query,
                'maxResults' => 50,
            ]);

        if ($response->failed()) {
            Log::error('Google fetch messages failed', [
                'channel_id' => $channel->id,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to fetch messages from Gmail');
        }

        $messageIds = collect($response->json('messages', []));

        // Gmail only returns IDs, we need to fetch full messages
        return $messageIds->map(function (array $msg) use ($channel) {
            return $this->getMessageById($channel, $msg['id']);
        })->filter();
    }

    /**
     * Get a specific message by its provider ID.
     */
    public function getMessageById(EmailChannel $channel, string $messageId): ?array
    {
        $this->ensureValidToken($channel);

        $response = $this->makeRequest($channel)
            ->get(self::GMAIL_URL."/users/me/messages/{$messageId}", [
                'format' => 'full',
            ]);

        if ($response->failed()) {
            if ($response->status() === 404) {
                return null;
            }
            Log::warning('Failed to fetch message', [
                'channel_id' => $channel->id,
                'message_id' => $messageId,
                'status' => $response->status(),
            ]);

            return null;
        }

        $message = $response->json();
        $normalized = $this->normalizeMessage($message);

        // Fetch attachments if the message has any
        if ($this->hasAttachments($message)) {
            $normalized['attachments'] = $this->fetchAttachments($channel, $messageId, $message);
        }

        // Log received email threading info
        Log::debug('Gmail received', [
            'id' => $normalized['id'],
            'thread_id' => $normalized['thread_id'],
            'in_reply_to' => $normalized['in_reply_to'],
            'refs' => count($normalized['references'] ?? []),
        ]);

        return $normalized;
    }

    /**
     * Send an email message via Gmail API.
     */
    public function sendMessage(
        EmailChannel $channel,
        Message $message,
        Ticket $ticket,
        array $headers
    ): string {
        $this->ensureValidToken($channel);

        // Build RFC 2822 message
        $rawMessage = $this->buildRawMessage($channel, $message, $headers);

        // Base64URL encode the message
        $encodedMessage = $this->base64UrlEncode($rawMessage);

        // Build payload with threading support
        $payload = ['raw' => $encodedMessage];

        // Include threadId for threading if we have it
        if ($ticket->email_thread_id) {
            $payload['threadId'] = $ticket->email_thread_id;
        }

        // Log outgoing email threading info
        Log::debug('Gmail sending reply', [
            'ticket' => $ticket->id,
            'thread_id' => $ticket->email_thread_id,
            'in_reply_to' => $headers['in_reply_to'] ?? null,
        ]);

        $response = $this->makeRequest($channel)
            ->post(self::GMAIL_URL.'/users/me/messages/send', $payload);

        if ($response->failed()) {
            Log::error('Google send message failed', [
                'channel_id' => $channel->id,
                'message_id' => $message->id,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to send email via Gmail');
        }

        return $headers['message_id'];
    }

    /**
     * Verify the OAuth connection is working.
     */
    public function testConnection(EmailChannel $channel): array
    {
        try {
            $this->ensureValidToken($channel);

            $response = $this->makeRequest($channel)
                ->get(self::USERINFO_URL);

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
                'email' => $data['email'] ?? null,
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
     * Get the user's email address from Google.
     */
    public function getUserEmail(EmailChannel $channel): string
    {
        $this->ensureValidToken($channel);

        $response = $this->makeRequest($channel)
            ->get(self::USERINFO_URL);

        if ($response->failed()) {
            throw new \Exception('Failed to get user email: '.$response->body());
        }

        $data = $response->json();

        return $data['email'];
    }

    /**
     * Get available mail labels from Gmail.
     *
     * @return array<int, array{id: string, name: string, display_name: string}>
     */
    public function getMailFolders(EmailChannel $channel): array
    {
        $this->ensureValidToken($channel);

        $response = $this->makeRequest($channel)
            ->get(self::GMAIL_URL.'/users/me/labels');

        if ($response->failed()) {
            Log::error('Google get labels failed', [
                'channel_id' => $channel->id,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to get Gmail labels');
        }

        $labels = $response->json('labels', []);

        return array_map(function (array $label) {
            return [
                'id' => $label['id'],
                'name' => $label['name'],
                'display_name' => $this->formatLabelDisplayName($label['name']),
            ];
        }, $labels);
    }

    /**
     * Delete a message from Gmail (move to trash).
     */
    public function deleteMessage(EmailChannel $channel, string $messageId): void
    {
        $this->ensureValidToken($channel);

        $response = $this->makeRequest($channel)
            ->post(self::GMAIL_URL."/users/me/messages/{$messageId}/trash");

        if ($response->failed()) {
            Log::error('Google delete message failed', [
                'channel_id' => $channel->id,
                'message_id' => $messageId,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to delete Gmail message');
        }
    }

    /**
     * Archive a message (remove INBOX label in Gmail).
     */
    public function archiveMessage(EmailChannel $channel, string $messageId): ?string
    {
        $this->ensureValidToken($channel);

        $response = $this->makeRequest($channel)
            ->post(self::GMAIL_URL."/users/me/messages/{$messageId}/modify", [
                'removeLabelIds' => ['INBOX'],
            ]);

        if ($response->failed()) {
            Log::error('Google archive message failed', [
                'channel_id' => $channel->id,
                'message_id' => $messageId,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to archive Gmail message');
        }

        // Gmail doesn't change message ID on label modification
        return $messageId;
    }

    /**
     * Move a message to a specific label.
     *
     * Unlike Microsoft, Gmail doesn't change message ID on label modification.
     *
     * @return string The same message ID (unchanged)
     */
    public function moveMessage(EmailChannel $channel, string $messageId, string $folderId): string
    {
        $this->ensureValidToken($channel);

        $response = $this->makeRequest($channel)
            ->post(self::GMAIL_URL."/users/me/messages/{$messageId}/modify", [
                'addLabelIds' => [$folderId],
                'removeLabelIds' => ['INBOX'],
            ]);

        if ($response->failed()) {
            Log::error('Google move message failed', [
                'channel_id' => $channel->id,
                'message_id' => $messageId,
                'label_id' => $folderId,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to move Gmail message');
        }

        return $messageId;
    }

    /**
     * Send a notification email with threading support.
     */
    public function sendNotification(EmailChannel $channel, array $data): ?string
    {
        $this->ensureValidToken($channel);

        // Build RFC 2822 notification message
        $rawMessage = $this->buildNotificationMessage($channel, $data);
        $encodedMessage = $this->base64UrlEncode($rawMessage);

        $payload = ['raw' => $encodedMessage];

        // Include threadId for threading if provided
        if (! empty($data['thread_id'])) {
            $payload['threadId'] = $data['thread_id'];
        }

        // Log full threading data before sending
        Log::debug('Gmail sending notification', [
            'thread_id' => $data['thread_id'] ?? null,
            'in_reply_to' => $data['in_reply_to'] ?? null,
            'references' => $data['references'] ?? null,
            'message_id' => $data['message_id'] ?? null,
            'subject' => $data['subject'] ?? null,
        ]);

        $response = $this->makeRequest($channel)
            ->post(self::GMAIL_URL.'/users/me/messages/send', $payload);

        if ($response->failed()) {
            Log::error('Google send notification failed', [
                'channel_id' => $channel->id,
                'status' => $response->status(),
            ]);
            throw new \Exception('Failed to send Gmail notification');
        }

        // Log Gmail's response to verify threading
        $responseData = $response->json();
        $requestedThreadId = $data['thread_id'] ?? null;
        $assignedThreadId = $responseData['threadId'] ?? null;

        Log::debug('Gmail notification result', [
            'gmail_id' => $responseData['id'] ?? null,
            'requested_thread' => $requestedThreadId,
            'assigned_thread' => $assignedThreadId,
            'thread_match' => $requestedThreadId === $assignedThreadId,
        ]);

        // Return the sent message ID for threading
        return $responseData['id'] ?? null;
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
     * Build Gmail search query string.
     */
    private function buildSearchQuery(?string $label, ?Carbon $since): string
    {
        $parts = [];

        // Filter by label/folder
        if ($label) {
            // Handle system labels (INBOX, SENT, etc.) vs custom labels
            if (in_array(strtoupper($label), ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'STARRED', 'IMPORTANT', 'UNREAD'])) {
                $parts[] = 'in:'.strtolower($label);
            } else {
                $parts[] = 'label:'.$label;
            }
        }

        // Filter by date
        if ($since) {
            $parts[] = 'after:'.$since->format('Y/m/d');
        }

        return implode(' ', $parts);
    }

    /**
     * Normalize a Gmail message to our standard format.
     *
     * @return array<string, mixed>
     */
    private function normalizeMessage(array $message): array
    {
        $payload = $message['payload'] ?? [];
        $headers = $this->extractHeaders($payload['headers'] ?? []);
        $body = $this->extractBody($payload);

        // Clean the Message-ID (remove angle brackets) for consistent storage
        // This matches how we search for messages and how Microsoft stores them
        $messageId = $headers['Message-ID'] ?? $headers['Message-Id'] ?? null;

        return [
            'id' => $message['id'],
            'internet_message_id' => $messageId ? $this->cleanMessageId($messageId) : null,
            'conversation_id' => null, // Gmail doesn't use conversationId
            'thread_id' => $message['threadId'] ?? null,
            'thread_index' => $headers['Thread-Index'] ?? null, // Outlook threading
            'from_email' => $this->parseEmailAddress($headers['From'] ?? ''),
            'from_name' => $this->parseEmailName($headers['From'] ?? ''),
            'to_recipients' => $this->parseRecipientList($headers['To'] ?? ''),
            'cc_recipients' => $this->parseRecipientList($headers['Cc'] ?? ''),
            'bcc_recipients' => $this->parseRecipientList($headers['Bcc'] ?? ''),
            'subject' => $headers['Subject'] ?? '',
            'body_text' => $body['text'] ?? '',
            'body_html' => $body['html'] ?? null,
            'received_at' => Carbon::createFromTimestampMs($message['internalDate']),
            'in_reply_to' => $this->cleanMessageId($headers['In-Reply-To'] ?? null),
            'references' => $this->parseReferences($headers['References'] ?? ''),
            'importance' => $this->parseImportance($headers),
            'headers' => $headers,
            'attachments' => [],
        ];
    }

    /**
     * Extract headers into an associative array.
     *
     * @param  array<int, array{name: string, value: string}>  $headers
     * @return array<string, string>
     */
    private function extractHeaders(array $headers): array
    {
        $result = [];
        foreach ($headers as $header) {
            $result[$header['name']] = $header['value'];
        }

        return $result;
    }

    /**
     * Extract body content from message payload.
     *
     * @return array{text: string|null, html: string|null}
     */
    private function extractBody(array $payload): array
    {
        $text = null;
        $html = null;

        // Direct body (simple messages)
        if (! empty($payload['body']['data'])) {
            $content = $this->base64UrlDecode($payload['body']['data']);
            $mimeType = $payload['mimeType'] ?? 'text/plain';

            if (str_contains($mimeType, 'html')) {
                $html = $content;
            } else {
                $text = $content;
            }
        }

        // Multipart messages (most emails)
        if (! empty($payload['parts'])) {
            foreach ($payload['parts'] as $part) {
                $extracted = $this->extractBodyFromPart($part);
                if ($extracted['text'] && ! $text) {
                    $text = $extracted['text'];
                }
                if ($extracted['html'] && ! $html) {
                    $html = $extracted['html'];
                }
            }
        }

        // If we only have HTML, generate text version
        if ($html && ! $text) {
            $text = strip_tags($html);
        }

        return ['text' => $text, 'html' => $html];
    }

    /**
     * Extract body from a message part (recursive for nested multipart).
     *
     * @return array{text: string|null, html: string|null}
     */
    private function extractBodyFromPart(array $part): array
    {
        $text = null;
        $html = null;
        $mimeType = $part['mimeType'] ?? 'text/plain';

        // Handle nested multipart
        if (str_starts_with($mimeType, 'multipart/') && ! empty($part['parts'])) {
            foreach ($part['parts'] as $subPart) {
                $extracted = $this->extractBodyFromPart($subPart);
                if ($extracted['text'] && ! $text) {
                    $text = $extracted['text'];
                }
                if ($extracted['html'] && ! $html) {
                    $html = $extracted['html'];
                }
            }
        } elseif (! empty($part['body']['data'])) {
            $content = $this->base64UrlDecode($part['body']['data']);

            if ($mimeType === 'text/html') {
                $html = $content;
            } elseif ($mimeType === 'text/plain') {
                $text = $content;
            }
        }

        return ['text' => $text, 'html' => $html];
    }

    /**
     * Check if a message has attachments.
     */
    private function hasAttachments(array $message): bool
    {
        return $this->findAttachmentParts($message['payload'] ?? []) !== [];
    }

    /**
     * Fetch attachments for a message.
     *
     * @return array<int, array{id: string, name: string, content_type: string, size: int, content_id: string|null, is_inline: bool, content: string}>
     */
    private function fetchAttachments(EmailChannel $channel, string $messageId, array $message): array
    {
        $attachmentParts = $this->findAttachmentParts($message['payload'] ?? []);
        $attachments = [];

        foreach ($attachmentParts as $part) {
            $attachmentId = $part['body']['attachmentId'] ?? null;
            if (! $attachmentId) {
                continue;
            }

            $response = $this->makeRequest($channel)
                ->get(self::GMAIL_URL."/users/me/messages/{$messageId}/attachments/{$attachmentId}");

            if ($response->failed()) {
                Log::warning('Failed to fetch attachment', [
                    'channel_id' => $channel->id,
                    'message_id' => $messageId,
                    'attachment_id' => $attachmentId,
                ]);

                continue;
            }

            $attachmentData = $response->json();
            $headers = $this->extractHeaders($part['headers'] ?? []);
            $contentId = $headers['Content-ID'] ?? $headers['Content-Id'] ?? null;

            // Clean content ID (remove angle brackets)
            if ($contentId) {
                $contentId = trim($contentId, '<>');
            }

            $attachments[] = [
                'id' => $attachmentId,
                'name' => $part['filename'] ?? 'attachment',
                'content_type' => $part['mimeType'] ?? 'application/octet-stream',
                'size' => $part['body']['size'] ?? 0,
                'content_id' => $contentId,
                'is_inline' => ! empty($contentId),
                'content' => $this->base64UrlToBase64($attachmentData['data'] ?? ''),
            ];
        }

        return $attachments;
    }

    /**
     * Find all attachment parts in a message payload (recursive).
     *
     * @return array<int, array>
     */
    private function findAttachmentParts(array $payload, array &$parts = []): array
    {
        // Check if this part is an attachment
        if (! empty($payload['filename']) && ! empty($payload['body']['attachmentId'])) {
            $parts[] = $payload;
        }

        // Recursively check nested parts
        if (! empty($payload['parts'])) {
            foreach ($payload['parts'] as $part) {
                $this->findAttachmentParts($part, $parts);
            }
        }

        return $parts;
    }

    /**
     * Build an RFC 2822 message for sending.
     */
    private function buildRawMessage(EmailChannel $channel, Message $message, array $headers): string
    {
        $boundary = 'boundary_'.uniqid();

        $raw = "MIME-Version: 1.0\r\n";
        $raw .= 'From: '.($channel->name ? $channel->name.' <'.$channel->email_address.'>' : $channel->email_address)."\r\n";
        $raw .= 'To: '.($headers['to_name'] ? $headers['to_name'].' <'.$headers['to_email'].'>' : $headers['to_email'])."\r\n";

        // Add CC recipients
        if (! empty($headers['cc'])) {
            $ccList = array_map(function ($cc) {
                return $cc['name'] ? $cc['name'].' <'.$cc['email'].'>' : $cc['email'];
            }, $headers['cc']);
            $raw .= 'Cc: '.implode(', ', $ccList)."\r\n";
        }

        $raw .= 'Subject: '.$this->encodeHeader($headers['subject'])."\r\n";
        $raw .= 'Message-ID: <'.$headers['message_id'].">\r\n";

        // Threading headers - clean message IDs to avoid double brackets
        if (! empty($headers['in_reply_to'])) {
            $cleanInReplyTo = $this->cleanMessageId($headers['in_reply_to']);
            $raw .= 'In-Reply-To: <'.$cleanInReplyTo.">\r\n";
        }
        if (! empty($headers['references'])) {
            $raw .= 'References: '.$headers['references']."\r\n";
        }

        // Custom header for ticket matching
        if (! empty($headers['ticket_number'])) {
            $raw .= 'X-Ticket-ID: '.$headers['ticket_number']."\r\n";
            $raw .= 'X-Ticket-Reference: '.$headers['ticket_number']."\r\n";
        }

        $raw .= "Content-Type: text/html; charset=UTF-8\r\n";
        $raw .= "Content-Transfer-Encoding: base64\r\n";
        $raw .= "\r\n";
        $raw .= chunk_split(base64_encode($message->body_html ?? nl2br(e($message->body))));

        return $raw;
    }

    /**
     * Build an RFC 2822 notification message.
     */
    private function buildNotificationMessage(EmailChannel $channel, array $data): string
    {
        $attachments = $data['attachments'] ?? collect();
        $hasAttachments = $attachments->isNotEmpty();

        $raw = "MIME-Version: 1.0\r\n";
        $raw .= 'From: '.($channel->name ? $channel->name.' <'.$channel->email_address.'>' : $channel->email_address)."\r\n";
        $raw .= 'To: '.($data['to_name'] ? $data['to_name'].' <'.$data['to_email'].'>' : $data['to_email'])."\r\n";
        $raw .= 'Subject: '.$this->encodeHeader($data['subject'])."\r\n";

        // Message-ID header for unique identification
        if (! empty($data['message_id'])) {
            $raw .= 'Message-ID: <'.$data['message_id'].">\r\n";
        }

        // Threading headers - clean to avoid double brackets
        if (! empty($data['in_reply_to'])) {
            $cleanInReplyTo = $this->cleanMessageId($data['in_reply_to']);
            $raw .= 'In-Reply-To: <'.$cleanInReplyTo.">\r\n";
        }
        if (! empty($data['references'])) {
            $raw .= 'References: '.$data['references']."\r\n";
        }

        // Outlook-specific threading headers
        if (! empty($data['thread_topic'])) {
            $raw .= 'Thread-Topic: '.$this->encodeHeader($data['thread_topic'])."\r\n";
        }
        if (! empty($data['thread_index'])) {
            $raw .= 'Thread-Index: '.$data['thread_index']."\r\n";
        }

        // Add CC recipients
        if (! empty($data['cc'])) {
            $ccList = array_map(function ($cc) {
                return $cc['name'] ? $cc['name'].' <'.$cc['email'].'>' : $cc['email'];
            }, $data['cc']);
            $raw .= 'Cc: '.implode(', ', $ccList)."\r\n";
        }

        // Add Reply-To if specified
        if (! empty($data['reply_to'])) {
            $raw .= 'Reply-To: '.$data['reply_to']."\r\n";
        }

        // Custom header for ticket matching
        if (! empty($data['headers']['ticket_number'])) {
            $raw .= 'X-Ticket-ID: '.$data['headers']['ticket_number']."\r\n";
            $raw .= 'X-Ticket-Reference: '.$data['headers']['ticket_number']."\r\n";
        }

        if ($hasAttachments) {
            // Multipart message with attachments
            $boundary = 'boundary_'.uniqid();
            $raw .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";
            $raw .= "\r\n";

            // HTML body part
            $raw .= "--{$boundary}\r\n";
            $raw .= "Content-Type: text/html; charset=UTF-8\r\n";
            $raw .= "Content-Transfer-Encoding: base64\r\n";
            $raw .= "\r\n";
            $raw .= chunk_split(base64_encode($data['html']));

            // Attachment parts
            foreach ($attachments as $attachment) {
                if (empty($attachment->path) || ! Storage::disk('local')->exists($attachment->path)) {
                    continue;
                }

                $content = Storage::disk('local')->get($attachment->path);
                $filename = $attachment->original_filename;
                $mimeType = $attachment->mime_type;

                $raw .= "--{$boundary}\r\n";
                $raw .= "Content-Type: {$mimeType}; name=\"{$filename}\"\r\n";
                $raw .= "Content-Disposition: attachment; filename=\"{$filename}\"\r\n";
                $raw .= "Content-Transfer-Encoding: base64\r\n";
                $raw .= "\r\n";
                $raw .= chunk_split(base64_encode($content));
            }

            // Close boundary
            $raw .= "--{$boundary}--\r\n";
        } else {
            // Simple HTML message without attachments
            $raw .= "Content-Type: text/html; charset=UTF-8\r\n";
            $raw .= "Content-Transfer-Encoding: base64\r\n";
            $raw .= "\r\n";
            $raw .= chunk_split(base64_encode($data['html']));
        }

        return $raw;
    }

    /**
     * Encode a header value for RFC 2822 compliance.
     */
    private function encodeHeader(string $value): string
    {
        // If ASCII only, return as-is
        if (mb_check_encoding($value, 'ASCII')) {
            return $value;
        }

        // Use RFC 2047 encoded-word syntax for non-ASCII
        return '=?UTF-8?B?'.base64_encode($value).'?=';
    }

    /**
     * Base64URL encode (Gmail-specific encoding).
     */
    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64URL decode.
     */
    private function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Convert Base64URL to standard Base64.
     */
    private function base64UrlToBase64(string $data): string
    {
        return strtr($data, '-_', '+/');
    }

    /**
     * Parse email address from a header value like "Name <email@example.com>".
     */
    private function parseEmailAddress(string $value): string
    {
        if (preg_match('/<([^>]+)>/', $value, $matches)) {
            return $matches[1];
        }

        return trim($value);
    }

    /**
     * Parse display name from a header value like "Name <email@example.com>".
     */
    private function parseEmailName(string $value): ?string
    {
        if (preg_match('/^([^<]+)</', $value, $matches)) {
            $name = trim($matches[1], ' "\'');

            return $name !== '' ? $name : null;
        }

        return null;
    }

    /**
     * Parse a recipient list header into an array.
     *
     * @return array<int, array{email: string, name: string|null}>
     */
    private function parseRecipientList(string $value): array
    {
        if (empty($value)) {
            return [];
        }

        $recipients = [];

        // Split by comma, but be careful of commas inside quotes
        $parts = preg_split('/,(?=(?:[^"]*"[^"]*")*[^"]*$)/', $value);

        foreach ($parts as $part) {
            $part = trim($part);
            if ($part === '') {
                continue;
            }

            $recipients[] = [
                'email' => $this->parseEmailAddress($part),
                'name' => $this->parseEmailName($part),
            ];
        }

        return $recipients;
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

    /**
     * Clean a message ID (remove angle brackets if present).
     */
    private function cleanMessageId(?string $messageId): ?string
    {
        if ($messageId === null) {
            return null;
        }

        return trim($messageId, '<>');
    }

    /**
     * Parse importance from headers.
     */
    private function parseImportance(array $headers): string
    {
        // Check X-Priority header (1-5, lower is higher priority)
        $xPriority = $headers['X-Priority'] ?? null;
        if ($xPriority !== null) {
            $priority = (int) $xPriority;
            if ($priority <= 2) {
                return 'high';
            }
            if ($priority >= 4) {
                return 'low';
            }
        }

        // Check Importance header
        $importance = strtolower($headers['Importance'] ?? 'normal');
        if (in_array($importance, ['high', 'low', 'normal'])) {
            return $importance;
        }

        return 'normal';
    }

    /**
     * Format a Gmail label name for display.
     */
    private function formatLabelDisplayName(string $name): string
    {
        // System labels often have CATEGORY_ prefix
        if (str_starts_with($name, 'CATEGORY_')) {
            return ucfirst(strtolower(str_replace('CATEGORY_', '', $name)));
        }

        // Handle nested labels (Label/SubLabel format)
        $parts = explode('/', $name);
        $lastPart = end($parts);

        return ucfirst(strtolower($lastPart));
    }
}
