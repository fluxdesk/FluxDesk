<?php

namespace App\Contracts;

use App\Models\EmailChannel;
use App\Models\Message;
use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Interface for email provider services (Microsoft 365, Google Workspace).
 *
 * Each provider service implements this interface to provide a consistent
 * way to interact with different email APIs.
 */
interface EmailProviderInterface
{
    /**
     * Get the OAuth authorization URL to start the authentication flow.
     *
     * @param  string  $state  State parameter for CSRF protection
     */
    public function getAuthorizationUrl(string $state): string;

    /**
     * Handle the OAuth callback and store tokens.
     *
     * @param  string  $code  Authorization code from OAuth provider
     * @param  EmailChannel  $channel  The email channel to update with tokens
     *
     * @throws \Exception When token exchange fails
     */
    public function handleCallback(string $code, EmailChannel $channel): void;

    /**
     * Refresh the OAuth access token using the refresh token.
     *
     * @param  EmailChannel  $channel  The email channel to refresh tokens for
     *
     * @throws \Exception When token refresh fails
     */
    public function refreshToken(EmailChannel $channel): void;

    /**
     * Fetch new messages from the email provider.
     *
     * @param  EmailChannel  $channel  The email channel to fetch from
     * @param  Carbon|null  $since  Only fetch messages after this date
     * @return Collection<int, array{
     *     id: string,
     *     internet_message_id: string,
     *     conversation_id: string|null,
     *     thread_id: string|null,
     *     from_email: string,
     *     from_name: string|null,
     *     subject: string,
     *     body_text: string|null,
     *     body_html: string|null,
     *     received_at: Carbon,
     *     in_reply_to: string|null,
     *     references: array<string>,
     *     importance: string|null,
     *     headers: array<string, string>,
     *     attachments: array<int, array{name: string, content_type: string, size: int, content: string}>
     * }>
     */
    public function fetchMessages(EmailChannel $channel, ?Carbon $since = null): Collection;

    /**
     * Send an email message via the provider.
     *
     * @param  EmailChannel  $channel  The email channel to send from
     * @param  Message  $message  The message model to send
     * @param  Ticket  $ticket  The ticket the message belongs to
     * @param  array{
     *     message_id: string,
     *     in_reply_to: string|null,
     *     references: string,
     *     subject: string,
     *     to_email: string,
     *     to_name: string|null
     * }  $headers  Email headers for threading
     * @return string The provider's message ID (internetMessageId or similar)
     *
     * @throws \Exception When sending fails
     */
    public function sendMessage(
        EmailChannel $channel,
        Message $message,
        Ticket $ticket,
        array $headers
    ): string;

    /**
     * Get a specific message by its provider ID.
     *
     * @param  EmailChannel  $channel  The email channel to fetch from
     * @param  string  $messageId  The provider's message ID
     * @return array<string, mixed>|null The message data or null if not found
     */
    public function getMessageById(EmailChannel $channel, string $messageId): ?array;

    /**
     * Verify the OAuth connection is working.
     *
     * @param  EmailChannel  $channel  The email channel to test
     * @return array{success: bool, email: string|null, error: string|null}
     */
    public function testConnection(EmailChannel $channel): array;

    /**
     * Get the user's email address from the provider.
     *
     * @param  EmailChannel  $channel  The email channel
     */
    public function getUserEmail(EmailChannel $channel): string;

    /**
     * Get available mail folders from the provider.
     *
     * @param  EmailChannel  $channel  The email channel
     * @return array<int, array{id: string, name: string, display_name: string}>
     */
    public function getMailFolders(EmailChannel $channel): array;

    /**
     * Delete a message from the provider.
     *
     * @param  EmailChannel  $channel  The email channel
     * @param  string  $messageId  The provider's message ID
     */
    public function deleteMessage(EmailChannel $channel, string $messageId): void;

    /**
     * Archive a message (move to archive folder).
     *
     * @param  EmailChannel  $channel  The email channel
     * @param  string  $messageId  The provider's message ID
     * @return string|null The new message ID after archiving, or null if deleted
     */
    public function archiveMessage(EmailChannel $channel, string $messageId): ?string;

    /**
     * Move a message to a specific folder.
     *
     * IMPORTANT: When a message is moved, the provider may assign it a NEW ID.
     * Callers must update their references with the returned ID.
     *
     * @param  EmailChannel  $channel  The email channel
     * @param  string  $messageId  The provider's message ID
     * @param  string  $folderId  The destination folder ID
     * @return string The new message ID after moving
     */
    public function moveMessage(EmailChannel $channel, string $messageId, string $folderId): string;

    /**
     * Send a notification email (rendered HTML) via the provider.
     *
     * Unlike sendMessage which requires a Message model, this method sends
     * pre-rendered HTML content directly. Used for system notifications.
     *
     * @param  EmailChannel  $channel  The email channel to send from
     * @param  array{
     *     to_email: string,
     *     to_name: string|null,
     *     subject: string,
     *     html: string,
     *     cc?: array<array{email: string, name: string|null}>,
     *     reply_to?: string,
     *     reply_to_message_id?: string,
     *     headers?: array{
     *         ticket_number?: string
     *     }
     * }  $data  The notification data
     * @return string|null The provider's message ID for threading, or null
     */
    public function sendNotification(EmailChannel $channel, array $data): ?string;
}
