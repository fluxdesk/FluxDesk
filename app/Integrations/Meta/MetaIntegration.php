<?php

namespace App\Integrations\Meta;

use App\Integrations\Contracts\Integration;
use App\Models\OrganizationIntegration;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Meta Business OAuth integration.
 *
 * Enables organizations to connect their own Meta (Facebook) app
 * for Instagram DM and Facebook Messenger integration.
 */
class MetaIntegration extends Integration
{
    public function identifier(): string
    {
        return 'meta';
    }

    public function name(): string
    {
        return 'Meta Business';
    }

    public function description(): string
    {
        return 'Connect with Meta platforms (Instagram, Facebook) for messaging';
    }

    public function icon(): string
    {
        return 'meta';
    }

    public function authType(): string
    {
        return 'oauth';
    }

    public function category(): string
    {
        return 'messaging';
    }

    /**
     * @return array<array{name: string, label: string, type: string, required: bool, hint?: string, default?: string}>
     */
    public function credentialFields(): array
    {
        return [
            [
                'name' => 'app_id',
                'label' => 'App ID',
                'type' => 'password',
                'required' => true,
                'hint' => 'Your Meta App ID from the Developer Console',
            ],
            [
                'name' => 'app_secret',
                'label' => 'App Secret',
                'type' => 'password',
                'required' => true,
                'hint' => 'Your Meta App Secret',
            ],
            [
                'name' => 'webhook_verify_token',
                'label' => 'Webhook Verify Token',
                'type' => 'password',
                'required' => true,
                'hint' => 'A custom token for webhook verification (generate a random string)',
                'default' => Str::random(32),
            ],
        ];
    }

    public function redirectUri(): string
    {
        return url('/organization/messaging-channels/oauth/callback/meta');
    }

    /**
     * Get OAuth scopes required for Instagram and Facebook Messenger.
     *
     * @return array<string>
     */
    public function scopes(): array
    {
        return [
            // Instagram scopes
            'instagram_basic',
            'instagram_manage_messages',
            // Facebook Page scopes (needed for Instagram Business accounts)
            'pages_show_list',
            'pages_messaging',
            'pages_read_engagement',
            'pages_manage_metadata',
            // Business account access
            'business_management',
        ];
    }

    /**
     * Build the OAuth authorization URL.
     *
     * @param  array<string, mixed>  $credentials
     */
    public function authorizationUrl(array $credentials, string $state): string
    {
        $params = [
            'client_id' => $credentials['app_id'],
            'response_type' => 'code',
            'redirect_uri' => $this->redirectUri(),
            'scope' => implode(',', $this->scopes()),
            'state' => $state,
        ];

        return 'https://www.facebook.com/v21.0/dialog/oauth?'.http_build_query($params);
    }

    /**
     * Get the OAuth token endpoint URL.
     *
     * @param  array<string, mixed>  $credentials
     */
    public function tokenUrl(array $credentials): string
    {
        return 'https://graph.facebook.com/v21.0/oauth/access_token';
    }

    /**
     * Get the webhook callback URL for this integration.
     */
    public function webhookUrl(): string
    {
        return url('/webhooks/meta');
    }

    /**
     * Test connection by validating credentials format.
     *
     * @return array{success: bool, message: string}
     */
    public function testConnection(OrganizationIntegration $integration): array
    {
        try {
            $credentials = $integration->credentials ?? [];

            if (empty($credentials['app_id']) || empty($credentials['app_secret'])) {
                return [
                    'success' => false,
                    'message' => 'App ID and App Secret are required',
                ];
            }

            if (empty($credentials['webhook_verify_token'])) {
                return [
                    'success' => false,
                    'message' => 'Webhook Verify Token is required for receiving messages',
                ];
            }

            // Validate app_id is numeric
            if (! ctype_digit($credentials['app_id'])) {
                return [
                    'success' => false,
                    'message' => 'App ID should be numeric',
                ];
            }

            // Validate app secret length
            if (strlen($credentials['app_secret']) < 20) {
                return [
                    'success' => false,
                    'message' => 'App Secret appears to be invalid (too short)',
                ];
            }

            // Attempt to get an app access token to validate credentials
            $response = Http::get('https://graph.facebook.com/v21.0/oauth/access_token', [
                'client_id' => $credentials['app_id'],
                'client_secret' => $credentials['app_secret'],
                'grant_type' => 'client_credentials',
            ]);

            if ($response->failed()) {
                $error = $response->json('error.message', 'Unknown error');

                return [
                    'success' => false,
                    'message' => "Meta API error: {$error}",
                ];
            }

            $data = $response->json();
            if (empty($data['access_token'])) {
                return [
                    'success' => false,
                    'message' => 'Failed to obtain app access token',
                ];
            }

            return [
                'success' => true,
                'message' => 'Meta credentials verified successfully. You can now connect Instagram accounts.',
            ];
        } catch (\Exception $e) {
            Log::error('Meta integration test failed', [
                'integration_id' => $integration->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Connection test failed: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Get the app access token for API calls that don't require user context.
     */
    public function getAppAccessToken(OrganizationIntegration $integration): ?string
    {
        $credentials = $integration->credentials ?? [];

        if (empty($credentials['app_id']) || empty($credentials['app_secret'])) {
            return null;
        }

        return $credentials['app_id'].'|'.$credentials['app_secret'];
    }

    /**
     * Verify a webhook request signature.
     */
    public function verifyWebhookSignature(string $payload, string $signature, OrganizationIntegration $integration): bool
    {
        $credentials = $integration->credentials ?? [];
        $appSecret = $credentials['app_secret'] ?? '';

        if (empty($appSecret)) {
            return false;
        }

        $expectedSignature = 'sha256='.hash_hmac('sha256', $payload, $appSecret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Verify webhook verification token.
     */
    public function verifyWebhookToken(string $token, OrganizationIntegration $integration): bool
    {
        $credentials = $integration->credentials ?? [];
        $verifyToken = $credentials['webhook_verify_token'] ?? '';

        return hash_equals($verifyToken, $token);
    }
}
