<?php

namespace App\Services\Messaging;

use App\Contracts\MessagingProviderInterface;
use App\Integrations\Meta\MetaIntegration;
use App\Models\Message;
use App\Models\MessagingChannel;
use App\Models\OrganizationIntegration;
use App\Models\Ticket;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Instagram Direct Message service using the Instagram Graph API.
 */
class InstagramService implements MessagingProviderInterface
{
    private const API_VERSION = 'v21.0';

    private const API_BASE = 'https://graph.facebook.com/'.self::API_VERSION;

    private ?OrganizationIntegration $integration = null;

    public function __construct(
        private readonly MetaIntegration $metaIntegration
    ) {}

    public function setIntegration(OrganizationIntegration $integration): self
    {
        $this->integration = $integration;

        return $this;
    }

    public function getAuthorizationUrl(string $state): string
    {
        if (! $this->integration) {
            throw new RuntimeException('Integration not set');
        }

        return $this->metaIntegration->authorizationUrl(
            $this->integration->credentials ?? [],
            $state
        );
    }

    public function handleCallback(string $code, MessagingChannel $channel): void
    {
        if (! $this->integration) {
            throw new RuntimeException('Integration not set');
        }

        $credentials = $this->integration->credentials ?? [];

        // Exchange code for short-lived token
        $response = Http::get(self::API_BASE.'/oauth/access_token', [
            'client_id' => $credentials['app_id'],
            'client_secret' => $credentials['app_secret'],
            'redirect_uri' => $this->metaIntegration->redirectUri(),
            'code' => $code,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Failed to exchange code for token: '.$response->body());
        }

        $shortLivedToken = $response->json('access_token');

        // Exchange for long-lived token (60 days)
        $longLivedResponse = Http::get(self::API_BASE.'/oauth/access_token', [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $credentials['app_id'],
            'client_secret' => $credentials['app_secret'],
            'fb_exchange_token' => $shortLivedToken,
        ]);

        if ($longLivedResponse->failed()) {
            throw new RuntimeException('Failed to get long-lived token: '.$longLivedResponse->body());
        }

        $data = $longLivedResponse->json();
        $expiresIn = $data['expires_in'] ?? 5184000; // Default 60 days

        $channel->update([
            'access_token' => $data['access_token'],
            'token_expires_at' => now()->addSeconds($expiresIn),
        ]);
    }

    public function refreshToken(MessagingChannel $channel): void
    {
        if (! $this->integration) {
            throw new RuntimeException('Integration not set');
        }

        $credentials = $this->integration->credentials ?? [];

        // Refresh long-lived token
        $response = Http::get(self::API_BASE.'/oauth/access_token', [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $credentials['app_id'],
            'client_secret' => $credentials['app_secret'],
            'fb_exchange_token' => $channel->access_token,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Failed to refresh token: '.$response->body());
        }

        $data = $response->json();
        $expiresIn = $data['expires_in'] ?? 5184000;

        $channel->update([
            'access_token' => $data['access_token'],
            'token_expires_at' => now()->addSeconds($expiresIn),
        ]);
    }

    public function sendMessage(MessagingChannel $channel, Message $message, Ticket $ticket): string
    {
        $this->ensureValidToken($channel);

        $recipientId = $ticket->messaging_participant_id;
        if (! $recipientId) {
            throw new RuntimeException('No recipient ID found for ticket');
        }

        // Prepare message content
        $messageData = [
            'recipient' => ['id' => $recipientId],
            'message' => [
                'text' => $message->body,
            ],
        ];

        // Send via Instagram Messaging API
        $response = Http::withToken($channel->access_token)
            ->post(self::API_BASE."/{$channel->external_id}/messages", $messageData);

        if ($response->failed()) {
            $error = $response->json('error.message', 'Unknown error');
            Log::error('Instagram send message failed', [
                'channel_id' => $channel->id,
                'ticket_id' => $ticket->id,
                'error' => $error,
                'response' => $response->body(),
            ]);
            throw new RuntimeException("Failed to send message: {$error}");
        }

        $data = $response->json();

        return $data['message_id'] ?? '';
    }

    /**
     * @return array{success: bool, message: string}
     */
    public function testConnection(MessagingChannel $channel): array
    {
        try {
            $this->ensureValidToken($channel);

            // Verify we can access the Instagram account
            $response = Http::withToken($channel->access_token)
                ->get(self::API_BASE."/{$channel->external_id}", [
                    'fields' => 'id,username,name',
                ]);

            if ($response->failed()) {
                $error = $response->json('error.message', 'Unknown error');

                return [
                    'success' => false,
                    'message' => "Failed to access Instagram account: {$error}",
                ];
            }

            $data = $response->json();

            return [
                'success' => true,
                'message' => "Connected to Instagram account: @{$data['username']}",
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Connection test failed: '.$e->getMessage(),
            ];
        }
    }

    /**
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
    public function processWebhook(array $payload, MessagingChannel $channel): array
    {
        $messages = [];

        // Instagram webhook structure
        if (($payload['object'] ?? '') !== 'instagram') {
            return $messages;
        }

        foreach ($payload['entry'] ?? [] as $entry) {
            // Check if this entry is for our Instagram account
            $pageId = $entry['id'] ?? '';
            if ($pageId !== $channel->external_id) {
                continue;
            }

            foreach ($entry['messaging'] ?? [] as $messagingEvent) {
                // Skip if this is an echo (message we sent)
                if (! empty($messagingEvent['message']['is_echo'])) {
                    continue;
                }

                // Skip if no message content
                if (empty($messagingEvent['message'])) {
                    continue;
                }

                $senderId = $messagingEvent['sender']['id'] ?? '';
                $recipientId = $messagingEvent['recipient']['id'] ?? '';

                // Only process messages from customers (sender is not our page)
                if ($senderId === $channel->external_id) {
                    continue;
                }

                $message = $messagingEvent['message'];
                $attachments = [];

                // Process attachments
                if (! empty($message['attachments'])) {
                    foreach ($message['attachments'] as $attachment) {
                        $attachments[] = [
                            'type' => $attachment['type'] ?? 'unknown',
                            'url' => $attachment['payload']['url'] ?? null,
                        ];
                    }
                }

                $messages[] = [
                    'message_id' => $message['mid'] ?? uniqid('ig_'),
                    'conversation_id' => $this->getConversationId($senderId, $recipientId),
                    'sender_id' => $senderId,
                    'sender_name' => null, // Will be fetched separately if needed
                    'sender_username' => null, // Will be fetched separately if needed
                    'text' => $message['text'] ?? null,
                    'attachments' => $attachments,
                    'timestamp' => (int) ($messagingEvent['timestamp'] ?? time() * 1000),
                ];
            }
        }

        return $messages;
    }

    /**
     * @return array<array{id: string, name: string, username: ?string, picture_url: ?string}>
     */
    public function getAvailableAccounts(MessagingChannel $channel): array
    {
        $this->ensureValidToken($channel);

        $accounts = [];

        // Get Facebook Pages connected to this token
        $response = Http::withToken($channel->access_token)
            ->get(self::API_BASE.'/me/accounts', [
                'fields' => 'id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}',
            ]);

        if ($response->failed()) {
            Log::error('Failed to get Facebook pages', [
                'channel_id' => $channel->id,
                'response' => $response->body(),
            ]);

            return $accounts;
        }

        foreach ($response->json('data', []) as $page) {
            if (! empty($page['instagram_business_account'])) {
                $igAccount = $page['instagram_business_account'];
                $accounts[] = [
                    'id' => $igAccount['id'],
                    'name' => $igAccount['name'] ?? $page['name'],
                    'username' => $igAccount['username'] ?? null,
                    'picture_url' => $igAccount['profile_picture_url'] ?? null,
                    'page_id' => $page['id'],
                    'page_access_token' => $page['access_token'],
                ];
            }
        }

        return $accounts;
    }

    public function subscribeToWebhooks(MessagingChannel $channel): void
    {
        if (! $this->integration) {
            throw new RuntimeException('Integration not set');
        }

        $credentials = $this->integration->credentials ?? [];

        // Subscribe the page to webhook events
        $response = Http::withToken($channel->access_token)
            ->post(self::API_BASE."/{$channel->external_id}/subscribed_apps", [
                'subscribed_fields' => ['messages', 'messaging_postbacks'],
            ]);

        if ($response->failed()) {
            Log::warning('Failed to subscribe to webhooks', [
                'channel_id' => $channel->id,
                'response' => $response->body(),
            ]);
        }
    }

    /**
     * Get user profile information.
     *
     * @return array{id: string, name: ?string, username: ?string}|null
     */
    public function getUserProfile(MessagingChannel $channel, string $userId): ?array
    {
        $this->ensureValidToken($channel);

        try {
            $response = Http::withToken($channel->access_token)
                ->get(self::API_BASE."/{$userId}", [
                    'fields' => 'id,name,username',
                ]);

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Exception $e) {
            Log::warning('Failed to get user profile', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Ensure the channel has a valid (non-expired) token.
     */
    private function ensureValidToken(MessagingChannel $channel): void
    {
        if ($channel->isTokenExpired()) {
            $this->refreshToken($channel);
        }
    }

    /**
     * Generate a conversation ID from sender and recipient.
     */
    private function getConversationId(string $senderId, string $recipientId): string
    {
        // Sort IDs to ensure consistent conversation ID regardless of direction
        $ids = [$senderId, $recipientId];
        sort($ids);

        return implode('_', $ids);
    }
}
