<?php

namespace App\Services\AI\Providers;

use App\Models\OrganizationIntegration;
use App\Services\AI\AIResponse;
use App\Services\AI\Contracts\AIProviderInterface;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Claude (Anthropic) API provider implementation.
 */
class ClaudeProvider implements AIProviderInterface
{
    protected string $apiKey;

    protected string $baseUrl = 'https://api.anthropic.com/v1';

    protected string $apiVersion = '2023-06-01';

    public function __construct(OrganizationIntegration $integration)
    {
        $credentials = $integration->credentials ?? [];

        if (empty($credentials['api_key'])) {
            throw new RuntimeException('Claude API key is not configured');
        }

        $this->apiKey = $credentials['api_key'];
    }

    public function identifier(): string
    {
        return 'claude';
    }

    public function chat(array $messages, array $options = []): AIResponse
    {
        $model = $options['model'] ?? 'claude-sonnet-4-20250514';
        $temperature = $options['temperature'] ?? 0.7;
        $maxTokens = $options['max_tokens'] ?? 2048;

        // Claude uses a separate system parameter, not a system message in the messages array
        $systemMessage = null;
        $filteredMessages = [];

        foreach ($messages as $message) {
            if ($message['role'] === 'system') {
                $systemMessage = $message['content'];
            } else {
                $filteredMessages[] = $message;
            }
        }

        try {
            $payload = [
                'model' => $model,
                'messages' => $filteredMessages,
                'temperature' => $temperature,
                'max_tokens' => $maxTokens,
            ];

            if ($systemMessage) {
                $payload['system'] = $systemMessage;
            }

            $response = Http::withHeaders($this->headers())
                ->timeout(60)
                ->post($this->baseUrl.'/messages', $payload);

            if (! $response->successful()) {
                $error = $response->json('error.message', 'Unknown error');
                throw new RuntimeException("Claude API error: {$error}");
            }

            return AIResponse::fromClaude($response->json());
        } catch (RequestException $e) {
            Log::error('Claude request failed', [
                'error' => $e->getMessage(),
            ]);

            throw new RuntimeException('Failed to communicate with Claude: '.$e->getMessage());
        }
    }

    public function models(): array
    {
        // Claude doesn't have a public models endpoint, so we return a static list
        return $this->defaultModels();
    }

    /**
     * Default models available.
     *
     * @return array<array{id: string, name: string, context_window: int}>
     */
    protected function defaultModels(): array
    {
        return [
            ['id' => 'claude-opus-4-20250514', 'name' => 'Claude Opus 4', 'context_window' => 200000],
            ['id' => 'claude-sonnet-4-20250514', 'name' => 'Claude Sonnet 4', 'context_window' => 200000],
            ['id' => 'claude-3-5-haiku-20241022', 'name' => 'Claude 3.5 Haiku', 'context_window' => 200000],
        ];
    }

    public function estimateCost(int $inputTokens, int $outputTokens, string $model): float
    {
        // Prices per 1M tokens (as of 2025)
        $pricing = [
            'claude-opus-4-20250514' => ['input' => 15.00, 'output' => 75.00],
            'claude-sonnet-4-20250514' => ['input' => 3.00, 'output' => 15.00],
            'claude-3-5-haiku-20241022' => ['input' => 0.80, 'output' => 4.00],
            // Older models for backwards compatibility
            'claude-3-opus-20240229' => ['input' => 15.00, 'output' => 75.00],
            'claude-3-sonnet-20240229' => ['input' => 3.00, 'output' => 15.00],
            'claude-3-haiku-20240307' => ['input' => 0.25, 'output' => 1.25],
        ];

        $prices = $pricing[$model] ?? $pricing['claude-sonnet-4-20250514'];

        $inputCost = ($inputTokens / 1_000_000) * $prices['input'];
        $outputCost = ($outputTokens / 1_000_000) * $prices['output'];

        return $inputCost + $outputCost;
    }

    /**
     * @return array<string, string>
     */
    protected function headers(): array
    {
        return [
            'x-api-key' => $this->apiKey,
            'anthropic-version' => $this->apiVersion,
            'Content-Type' => 'application/json',
        ];
    }
}
