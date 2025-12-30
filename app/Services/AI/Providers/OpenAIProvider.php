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
 * OpenAI API provider implementation.
 */
class OpenAIProvider implements AIProviderInterface
{
    protected string $apiKey;

    protected ?string $organizationId;

    protected string $baseUrl = 'https://api.openai.com/v1';

    public function __construct(OrganizationIntegration $integration)
    {
        $credentials = $integration->credentials ?? [];

        if (empty($credentials['api_key'])) {
            throw new RuntimeException('OpenAI API key is not configured');
        }

        $this->apiKey = $credentials['api_key'];
        $this->organizationId = $credentials['organization_id'] ?? null;
    }

    public function identifier(): string
    {
        return 'openai';
    }

    public function chat(array $messages, array $options = []): AIResponse
    {
        $model = $options['model'] ?? 'gpt-4o-mini';
        $temperature = $options['temperature'] ?? 0.7;
        $maxTokens = $options['max_tokens'] ?? 2048;

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(60)
                ->post($this->baseUrl.'/chat/completions', [
                    'model' => $model,
                    'messages' => $messages,
                    'temperature' => $temperature,
                    'max_tokens' => $maxTokens,
                ]);

            if (! $response->successful()) {
                $error = $response->json('error.message', 'Unknown error');
                throw new RuntimeException("OpenAI API error: {$error}");
            }

            return AIResponse::fromOpenAI($response->json());
        } catch (RequestException $e) {
            Log::error('OpenAI request failed', [
                'error' => $e->getMessage(),
            ]);

            throw new RuntimeException('Failed to communicate with OpenAI: '.$e->getMessage());
        }
    }

    public function models(): array
    {
        return $this->fetchModelsFromApi() ?? $this->defaultModels();
    }

    /**
     * Fetch available models from the OpenAI API.
     *
     * @return array<array{id: string, name: string}>|null
     */
    protected function fetchModelsFromApi(): ?array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(10)
                ->get($this->baseUrl.'/models');

            if (! $response->successful()) {
                return null;
            }

            $models = collect($response->json('data', []))
                ->filter(fn ($model) => $this->isChatModel($model['id'] ?? ''))
                ->map(fn ($model) => [
                    'id' => $model['id'],
                    'name' => $this->formatModelName($model['id']),
                ])
                ->sortBy('name')
                ->values()
                ->all();

            return ! empty($models) ? $models : null;
        } catch (\Exception $e) {
            Log::warning('Failed to fetch OpenAI models', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Check if a model ID is a chat model we want to show.
     */
    protected function isChatModel(string $modelId): bool
    {
        // Include GPT-4 and GPT-3.5 chat models, exclude embeddings, whisper, dall-e, etc.
        $chatPrefixes = ['gpt-4', 'gpt-3.5', 'o1', 'o3'];

        foreach ($chatPrefixes as $prefix) {
            if (str_starts_with($modelId, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Format a model ID into a human-readable name.
     */
    protected function formatModelName(string $modelId): string
    {
        $names = [
            'gpt-4o' => 'GPT-4o',
            'gpt-4o-mini' => 'GPT-4o Mini',
            'gpt-4-turbo' => 'GPT-4 Turbo',
            'gpt-4-turbo-preview' => 'GPT-4 Turbo Preview',
            'gpt-4' => 'GPT-4',
            'gpt-3.5-turbo' => 'GPT-3.5 Turbo',
            'o1' => 'O1',
            'o1-mini' => 'O1 Mini',
            'o1-preview' => 'O1 Preview',
            'o3-mini' => 'O3 Mini',
        ];

        return $names[$modelId] ?? strtoupper(str_replace('-', ' ', $modelId));
    }

    /**
     * Default models as fallback.
     *
     * @return array<array{id: string, name: string}>
     */
    protected function defaultModels(): array
    {
        return [
            ['id' => 'gpt-4o', 'name' => 'GPT-4o'],
            ['id' => 'gpt-4o-mini', 'name' => 'GPT-4o Mini'],
            ['id' => 'gpt-4-turbo', 'name' => 'GPT-4 Turbo'],
            ['id' => 'gpt-3.5-turbo', 'name' => 'GPT-3.5 Turbo'],
        ];
    }

    public function estimateCost(int $inputTokens, int $outputTokens, string $model): float
    {
        // Prices per 1M tokens as of late 2024/early 2025
        $pricing = [
            'gpt-4o' => ['input' => 2.50, 'output' => 10.00],
            'gpt-4o-mini' => ['input' => 0.15, 'output' => 0.60],
            'gpt-4-turbo' => ['input' => 10.00, 'output' => 30.00],
            'gpt-3.5-turbo' => ['input' => 0.50, 'output' => 1.50],
        ];

        $prices = $pricing[$model] ?? $pricing['gpt-4o-mini'];

        $inputCost = ($inputTokens / 1_000_000) * $prices['input'];
        $outputCost = ($outputTokens / 1_000_000) * $prices['output'];

        return $inputCost + $outputCost;
    }

    /**
     * @return array<string, string>
     */
    protected function headers(): array
    {
        $headers = [
            'Authorization' => 'Bearer '.$this->apiKey,
            'Content-Type' => 'application/json',
        ];

        if ($this->organizationId) {
            $headers['OpenAI-Organization'] = $this->organizationId;
        }

        return $headers;
    }
}
