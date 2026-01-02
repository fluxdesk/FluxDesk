<?php

namespace App\Contracts;

use App\Models\Message;
use App\Models\MessagingChannel;
use App\Models\OrganizationIntegration;
use App\Models\Ticket;

/**
 * Interface for messaging platform providers (Instagram, WhatsApp, etc.)
 */
interface MessagingProviderInterface
{
    /**
     * Set the organization integration for this provider.
     */
    public function setIntegration(OrganizationIntegration $integration): self;

    /**
     * Get the OAuth authorization URL for this provider.
     */
    public function getAuthorizationUrl(string $state): string;

    /**
     * Handle the OAuth callback and exchange code for tokens.
     */
    public function handleCallback(string $code, MessagingChannel $channel): void;

    /**
     * Refresh the access token for a channel.
     */
    public function refreshToken(MessagingChannel $channel): void;

    /**
     * Send a message through this provider.
     *
     * @return string The provider's message ID
     */
    public function sendMessage(MessagingChannel $channel, Message $message, Ticket $ticket): string;

    /**
     * Test the connection for this channel.
     *
     * @return array{success: bool, message: string}
     */
    public function testConnection(MessagingChannel $channel): array;

    /**
     * Process incoming webhook data and return parsed message data.
     *
     * @param  array<string, mixed>  $payload
     * @return array<array{
     *     message_id: string,
     *     conversation_id: string,
     *     sender_id: string,
     *     sender_name: ?string,
     *     sender_username: ?string,
     *     text: ?string,
     *     attachments: ?array,
     *     timestamp: int
     * }>
     */
    public function processWebhook(array $payload, MessagingChannel $channel): array;

    /**
     * Get available accounts/pages for the connected user.
     *
     * @return array<array{id: string, name: string, username: ?string, picture_url: ?string}>
     */
    public function getAvailableAccounts(MessagingChannel $channel): array;

    /**
     * Subscribe to webhooks for a specific account.
     */
    public function subscribeToWebhooks(MessagingChannel $channel): void;
}
