<?php

namespace App\Integrations\Claude;

use App\Integrations\Contracts\Integration;
use App\Models\OrganizationIntegration;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Claude (Anthropic) API integration for AI-powered features.
 *
 * Enables organizations to use Anthropic's Claude models for
 * suggested replies, reply refactoring, and auto-replies.
 */
class ClaudeIntegration extends Integration
{
    public function identifier(): string
    {
        return 'claude';
    }

    public function name(): string
    {
        return 'Claude (Anthropic)';
    }

    public function description(): string
    {
        return 'Verbind met Claude voor AI-gestuurde functies zoals suggesties en automatische antwoorden';
    }

    public function icon(): string
    {
        return 'claude';
    }

    public function authType(): string
    {
        return 'api_key';
    }

    public function category(): string
    {
        return 'ai';
    }

    /**
     * @return array<array{name: string, label: string, type: string, required: bool, hint?: string}>
     */
    public function credentialFields(): array
    {
        return [
            [
                'name' => 'api_key',
                'label' => 'API Key',
                'type' => 'password',
                'required' => true,
                'hint' => 'Je Anthropic API key (begint met sk-ant-)',
            ],
        ];
    }

    /**
     * Get available Claude models.
     *
     * @return array<array{id: string, name: string, context_window: int}>
     */
    public function models(): array
    {
        return [
            ['id' => 'claude-opus-4-20250514', 'name' => 'Claude Opus 4', 'context_window' => 200000],
            ['id' => 'claude-sonnet-4-20250514', 'name' => 'Claude Sonnet 4', 'context_window' => 200000],
            ['id' => 'claude-3-5-haiku-20241022', 'name' => 'Claude 3.5 Haiku', 'context_window' => 200000],
        ];
    }

    /**
     * Test the connection by making a minimal API call.
     *
     * @return array{success: bool, message: string}
     */
    public function testConnection(OrganizationIntegration $integration): array
    {
        try {
            $credentials = $integration->credentials ?? [];

            if (empty($credentials['api_key'])) {
                return [
                    'success' => false,
                    'message' => 'API Key is verplicht',
                ];
            }

            $apiKey = $credentials['api_key'];

            // Validate API key format
            if (! str_starts_with($apiKey, 'sk-ant-')) {
                return [
                    'success' => false,
                    'message' => 'API Key heeft een ongeldig formaat (moet beginnen met sk-ant-)',
                ];
            }

            // Test the connection with a minimal request
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])
                ->timeout(10)
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => 'claude-3-5-haiku-20241022',
                    'max_tokens' => 10,
                    'messages' => [
                        ['role' => 'user', 'content' => 'Hi'],
                    ],
                ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Verbinding met Claude succesvol',
                ];
            }

            $error = $response->json('error.message', 'Onbekende fout');

            return [
                'success' => false,
                'message' => 'Claude API fout: '.$error,
            ];
        } catch (\Exception $e) {
            Log::error('Claude integration test failed', [
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
