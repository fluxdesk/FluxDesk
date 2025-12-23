<?php

namespace App\Integrations\Google;

use App\Integrations\Contracts\Integration;
use App\Models\OrganizationIntegration;
use Illuminate\Support\Facades\Log;

/**
 * Google Workspace OAuth integration.
 *
 * Enables organizations to connect their own Google Cloud project
 * for email channel functionality via Gmail API.
 */
class GoogleIntegration extends Integration
{
    public function identifier(): string
    {
        return 'google';
    }

    public function name(): string
    {
        return 'Google Workspace';
    }

    public function description(): string
    {
        return 'Verbind met Google Workspace voor Gmail integratie';
    }

    public function icon(): string
    {
        return 'google';
    }

    public function authType(): string
    {
        return 'oauth';
    }

    /**
     * @return array<array{name: string, label: string, type: string, required: bool, hint?: string}>
     */
    public function credentialFields(): array
    {
        return [
            [
                'name' => 'client_id',
                'label' => 'Client ID',
                'type' => 'password',
                'required' => true,
                'hint' => 'De Client ID uit Google Cloud Console',
            ],
            [
                'name' => 'client_secret',
                'label' => 'Client Secret',
                'type' => 'password',
                'required' => true,
                'hint' => 'De Client Secret uit Google Cloud Console',
            ],
        ];
    }

    public function redirectUri(): string
    {
        return url('/organization/email-channels/oauth/callback/google');
    }

    /**
     * @return array<string>
     */
    public function scopes(): array
    {
        return [
            'openid',
            'profile',
            'email',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.labels',
        ];
    }

    /**
     * @param  array<string, mixed>  $credentials
     */
    public function authorizationUrl(array $credentials, string $state): string
    {
        $params = [
            'client_id' => $credentials['client_id'],
            'response_type' => 'code',
            'redirect_uri' => $this->redirectUri(),
            'scope' => implode(' ', $this->scopes()),
            'state' => $state,
            'access_type' => 'offline',
            'prompt' => 'consent',
        ];

        return 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query($params);
    }

    /**
     * @param  array<string, mixed>  $credentials
     */
    public function tokenUrl(array $credentials): string
    {
        return 'https://oauth2.googleapis.com/token';
    }

    /**
     * Test connection by validating credentials format.
     *
     * Note: Google doesn't support client_credentials flow like Microsoft,
     * so we validate the credential format and return success if properly configured.
     * Full validation happens during the actual OAuth flow.
     *
     * @return array{success: bool, message: string}
     */
    public function testConnection(OrganizationIntegration $integration): array
    {
        try {
            $credentials = $integration->credentials ?? [];

            if (empty($credentials['client_id']) || empty($credentials['client_secret'])) {
                return [
                    'success' => false,
                    'message' => 'Client ID en Client Secret zijn verplicht',
                ];
            }

            // Validate client_id format (should end with .apps.googleusercontent.com)
            $clientId = $credentials['client_id'];
            if (! str_ends_with($clientId, '.apps.googleusercontent.com')) {
                return [
                    'success' => false,
                    'message' => 'Client ID heeft een ongeldig formaat. Moet eindigen op .apps.googleusercontent.com',
                ];
            }

            // Client secret should be a reasonable length
            $clientSecret = $credentials['client_secret'];
            if (strlen($clientSecret) < 10) {
                return [
                    'success' => false,
                    'message' => 'Client Secret lijkt ongeldig (te kort)',
                ];
            }

            return [
                'success' => true,
                'message' => 'Google credentials format geverifieerd. Volledige validatie gebeurt bij OAuth verbinding.',
            ];
        } catch (\Exception $e) {
            Log::error('Google integration test failed', [
                'integration_id' => $integration->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Verbinding test mislukt: '.$e->getMessage(),
            ];
        }
    }
}
