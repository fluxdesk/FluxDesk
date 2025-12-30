<?php

namespace App\Integrations\OpenAI;

use App\Integrations\Contracts\Integration;
use App\Models\OrganizationIntegration;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * OpenAI API integration for AI-powered features.
 *
 * Enables organizations to use OpenAI's language models for
 * suggested replies, reply refactoring, and auto-replies.
 */
class OpenAIIntegration extends Integration
{
    public function identifier(): string
    {
        return 'openai';
    }

    public function name(): string
    {
        return 'OpenAI';
    }

    public function description(): string
    {
        return 'Verbind met OpenAI voor AI-gestuurde functies zoals suggesties en automatische antwoorden';
    }

    public function icon(): string
    {
        return 'openai';
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
                'hint' => 'Je OpenAI API key (begint met sk-)',
            ],
            [
                'name' => 'organization_id',
                'label' => 'Organization ID',
                'type' => 'password',
                'required' => false,
                'hint' => 'Optioneel: Je OpenAI Organization ID (begint met org-)',
            ],
        ];
    }

    /**
     * Get available OpenAI models.
     *
     * @return array<array{id: string, name: string, context_window: int}>
     */
    public function models(): array
    {
        return [
            ['id' => 'gpt-4o', 'name' => 'GPT-4o', 'context_window' => 128000],
            ['id' => 'gpt-4o-mini', 'name' => 'GPT-4o Mini', 'context_window' => 128000],
            ['id' => 'gpt-4-turbo', 'name' => 'GPT-4 Turbo', 'context_window' => 128000],
            ['id' => 'gpt-3.5-turbo', 'name' => 'GPT-3.5 Turbo', 'context_window' => 16385],
        ];
    }

    /**
     * Test the connection by listing models.
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
            if (! str_starts_with($apiKey, 'sk-')) {
                return [
                    'success' => false,
                    'message' => 'API Key heeft een ongeldig formaat (moet beginnen met sk-)',
                ];
            }

            // Test the connection by listing models
            $headers = [
                'Authorization' => 'Bearer '.$apiKey,
                'Content-Type' => 'application/json',
            ];

            if (! empty($credentials['organization_id'])) {
                $headers['OpenAI-Organization'] = $credentials['organization_id'];
            }

            $response = Http::withHeaders($headers)
                ->timeout(10)
                ->get('https://api.openai.com/v1/models');

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Verbinding met OpenAI succesvol',
                ];
            }

            $error = $response->json('error.message', 'Onbekende fout');

            return [
                'success' => false,
                'message' => 'OpenAI API fout: '.$error,
            ];
        } catch (\Exception $e) {
            Log::error('OpenAI integration test failed', [
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
