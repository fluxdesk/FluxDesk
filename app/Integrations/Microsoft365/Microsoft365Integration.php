<?php

namespace App\Integrations\Microsoft365;

use App\Integrations\Contracts\Integration;
use App\Models\OrganizationIntegration;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Microsoft 365 / Azure AD OAuth integration.
 *
 * Enables organizations to connect their own Microsoft 365 tenant
 * for email channel functionality via Microsoft Graph API.
 */
class Microsoft365Integration extends Integration
{
    public function identifier(): string
    {
        return 'microsoft365';
    }

    public function name(): string
    {
        return 'Microsoft 365';
    }

    public function description(): string
    {
        return 'Verbind met Microsoft 365 voor e-mail integratie via Microsoft Graph API';
    }

    public function icon(): string
    {
        return 'microsoft';
    }

    public function authType(): string
    {
        return 'oauth';
    }

    /**
     * @return array<array{name: string, label: string, type: string, required: bool, default?: string, hint?: string}>
     */
    public function credentialFields(): array
    {
        return [
            [
                'name' => 'client_id',
                'label' => 'Client ID (Application ID)',
                'type' => 'password',
                'required' => true,
                'hint' => 'De Application (client) ID uit Azure AD',
            ],
            [
                'name' => 'client_secret',
                'label' => 'Client Secret',
                'type' => 'password',
                'required' => true,
                'hint' => 'Een client secret aangemaakt in Azure AD',
            ],
            [
                'name' => 'tenant_id',
                'label' => 'Tenant ID',
                'type' => 'text',
                'required' => false,
                'default' => 'common',
                'hint' => 'Laat leeg of gebruik "common" voor multi-tenant apps',
            ],
        ];
    }

    public function redirectUri(): string
    {
        return url('/organization/email-channels/oauth/callback/microsoft365');
    }

    /**
     * @return array<string>
     */
    public function scopes(): array
    {
        return [
            'https://graph.microsoft.com/Mail.ReadWrite',
            'https://graph.microsoft.com/Mail.ReadWrite.Shared',
            'https://graph.microsoft.com/Mail.Send',
            'https://graph.microsoft.com/Mail.Send.Shared',
            'https://graph.microsoft.com/MailboxSettings.Read',
            'https://graph.microsoft.com/User.Read',
            'openid',
            'profile',
            'offline_access',
        ];
    }

    /**
     * @param  array<string, mixed>  $credentials
     */
    public function authorizationUrl(array $credentials, string $state): string
    {
        $tenant = $credentials['tenant_id'] ?? 'common';

        $params = [
            'client_id' => $credentials['client_id'],
            'response_type' => 'code',
            'redirect_uri' => $this->redirectUri(),
            'response_mode' => 'query',
            'scope' => implode(' ', $this->scopes()),
            'state' => $state,
            'prompt' => 'select_account',
        ];

        return "https://login.microsoftonline.com/{$tenant}/oauth2/v2.0/authorize?".http_build_query($params);
    }

    /**
     * @param  array<string, mixed>  $credentials
     */
    public function tokenUrl(array $credentials): string
    {
        $tenant = $credentials['tenant_id'] ?? 'common';

        return "https://login.microsoftonline.com/{$tenant}/oauth2/v2.0/token";
    }

    /**
     * Test connection by requesting an app-only token using client credentials flow.
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

            $response = Http::asForm()->post($this->tokenUrl($credentials), [
                'client_id' => $credentials['client_id'],
                'client_secret' => $credentials['client_secret'],
                'scope' => 'https://graph.microsoft.com/.default',
                'grant_type' => 'client_credentials',
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Microsoft 365 verbinding succesvol geverifieerd',
                ];
            }

            $error = $response->json('error_description')
                ?? $response->json('error')
                ?? 'Onbekende fout';

            return [
                'success' => false,
                'message' => "Microsoft 365 verificatie mislukt: {$error}",
            ];
        } catch (\Exception $e) {
            Log::error('Microsoft 365 integration test failed', [
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
