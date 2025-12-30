<?php

use App\Models\Organization;
use App\Models\OrganizationIntegration;
use App\Services\AI\AIManager;
use App\Services\AI\AIResponse;
use App\Services\AI\Providers\ClaudeProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->organization = Organization::factory()->create();

    $this->integration = OrganizationIntegration::create([
        'organization_id' => $this->organization->id,
        'integration' => 'claude',
        'credentials' => ['api_key' => 'sk-ant-test-key-123'],
        'is_verified' => true,
        'verified_at' => now(),
        'is_active' => true,
    ]);
});

describe('ClaudeProvider - Constructor', function () {
    it('creates provider with valid integration', function () {
        $provider = new ClaudeProvider($this->integration);

        expect($provider->identifier())->toBe('claude');
    });

    it('throws exception without API key', function () {
        // Update the existing integration to have no API key
        $this->integration->update(['credentials' => []]);
        $this->integration->refresh();

        expect(fn () => new ClaudeProvider($this->integration))
            ->toThrow(RuntimeException::class, 'Claude API key is not configured');
    });
});

describe('ClaudeProvider - Models', function () {
    it('returns available models', function () {
        $provider = new ClaudeProvider($this->integration);
        $models = $provider->models();

        expect($models)->toBeArray();
        expect($models)->not->toBeEmpty();

        $modelIds = array_column($models, 'id');
        expect($modelIds)->toContain('claude-sonnet-4-20250514');
        expect($modelIds)->toContain('claude-opus-4-20250514');
        expect($modelIds)->toContain('claude-3-5-haiku-20241022');
    });

    it('returns models with required fields', function () {
        $provider = new ClaudeProvider($this->integration);
        $models = $provider->models();

        foreach ($models as $model) {
            expect($model)->toHaveKey('id');
            expect($model)->toHaveKey('name');
            expect($model)->toHaveKey('context_window');
        }
    });
});

describe('ClaudeProvider - Cost Estimation', function () {
    it('calculates cost for Claude Sonnet', function () {
        $provider = new ClaudeProvider($this->integration);

        // Sonnet: $3/1M input, $15/1M output
        $cost = $provider->estimateCost(1000, 500, 'claude-sonnet-4-20250514');

        // Input: 1000/1M * $3 = $0.003
        // Output: 500/1M * $15 = $0.0075
        // Total: $0.0105
        expect($cost)->toEqualWithDelta(0.0105, 0.0001);
    });

    it('calculates cost for Claude Opus', function () {
        $provider = new ClaudeProvider($this->integration);

        // Opus: $15/1M input, $75/1M output
        $cost = $provider->estimateCost(1000, 500, 'claude-opus-4-20250514');

        // Input: 1000/1M * $15 = $0.015
        // Output: 500/1M * $75 = $0.0375
        // Total: $0.0525
        expect($cost)->toEqualWithDelta(0.0525, 0.0001);
    });

    it('calculates cost for Claude Haiku', function () {
        $provider = new ClaudeProvider($this->integration);

        // Haiku: $0.80/1M input, $4/1M output
        $cost = $provider->estimateCost(1000, 500, 'claude-3-5-haiku-20241022');

        // Input: 1000/1M * $0.80 = $0.0008
        // Output: 500/1M * $4 = $0.002
        // Total: $0.0028
        expect($cost)->toEqualWithDelta(0.0028, 0.0001);
    });

    it('uses default pricing for unknown model', function () {
        $provider = new ClaudeProvider($this->integration);

        // Default is Sonnet pricing
        $cost = $provider->estimateCost(1000, 500, 'unknown-model');

        expect($cost)->toEqualWithDelta(0.0105, 0.0001);
    });
});

describe('ClaudeProvider - Chat', function () {
    it('sends chat request and returns response', function () {
        Http::fake([
            'api.anthropic.com/v1/messages' => Http::response([
                'id' => 'msg_01234',
                'type' => 'message',
                'role' => 'assistant',
                'content' => [
                    ['type' => 'text', 'text' => 'Hello! How can I help you today?'],
                ],
                'model' => 'claude-sonnet-4-20250514',
                'stop_reason' => 'end_turn',
                'usage' => [
                    'input_tokens' => 10,
                    'output_tokens' => 15,
                ],
            ], 200),
        ]);

        $provider = new ClaudeProvider($this->integration);
        $response = $provider->chat([
            ['role' => 'user', 'content' => 'Hello'],
        ]);

        expect($response)->toBeInstanceOf(AIResponse::class);
        expect($response->content)->toBe('Hello! How can I help you today?');
        expect($response->inputTokens)->toBe(10);
        expect($response->outputTokens)->toBe(15);
        expect($response->model)->toBe('claude-sonnet-4-20250514');
        expect($response->finishReason)->toBe('end_turn');
    });

    it('extracts system message from messages array', function () {
        Http::fake([
            'api.anthropic.com/v1/messages' => Http::response([
                'content' => [['type' => 'text', 'text' => 'Response']],
                'model' => 'claude-sonnet-4-20250514',
                'usage' => ['input_tokens' => 10, 'output_tokens' => 5],
            ], 200),
        ]);

        $provider = new ClaudeProvider($this->integration);
        $provider->chat([
            ['role' => 'system', 'content' => 'You are a helpful assistant.'],
            ['role' => 'user', 'content' => 'Hello'],
        ]);

        Http::assertSent(function ($request) {
            $data = $request->data();

            // System message should be extracted to system parameter
            return $data['system'] === 'You are a helpful assistant.'
                && count($data['messages']) === 1
                && $data['messages'][0]['role'] === 'user';
        });
    });

    it('throws exception on API error', function () {
        Http::fake([
            'api.anthropic.com/v1/messages' => Http::response([
                'error' => ['message' => 'Invalid API key'],
            ], 401),
        ]);

        $provider = new ClaudeProvider($this->integration);

        expect(fn () => $provider->chat([['role' => 'user', 'content' => 'Hello']]))
            ->toThrow(RuntimeException::class, 'Claude API error: Invalid API key');
    });

    it('uses correct headers', function () {
        Http::fake([
            'api.anthropic.com/v1/messages' => Http::response([
                'content' => [['type' => 'text', 'text' => 'Hi']],
                'model' => 'claude-sonnet-4-20250514',
                'usage' => ['input_tokens' => 5, 'output_tokens' => 2],
            ], 200),
        ]);

        $provider = new ClaudeProvider($this->integration);
        $provider->chat([['role' => 'user', 'content' => 'Hi']]);

        Http::assertSent(function ($request) {
            return $request->hasHeader('x-api-key', 'sk-ant-test-key-123')
                && $request->hasHeader('anthropic-version', '2023-06-01')
                && $request->hasHeader('Content-Type', 'application/json');
        });
    });
});

describe('AIManager - Claude Support', function () {
    it('supports claude provider', function () {
        $manager = new AIManager;

        expect($manager->supports('claude'))->toBeTrue();
        expect($manager->supportedProviders())->toContain('claude');
    });

    it('creates claude provider from integration', function () {
        $manager = new AIManager;
        $provider = $manager->make('claude', $this->integration);

        expect($provider)->toBeInstanceOf(ClaudeProvider::class);
        expect($provider->identifier())->toBe('claude');
    });
});

describe('AIResponse - fromClaude', function () {
    it('parses Claude API response correctly', function () {
        $apiResponse = [
            'id' => 'msg_01234',
            'type' => 'message',
            'role' => 'assistant',
            'content' => [
                ['type' => 'text', 'text' => 'First part. '],
                ['type' => 'text', 'text' => 'Second part.'],
            ],
            'model' => 'claude-sonnet-4-20250514',
            'stop_reason' => 'end_turn',
            'usage' => [
                'input_tokens' => 100,
                'output_tokens' => 50,
            ],
        ];

        $response = AIResponse::fromClaude($apiResponse);

        expect($response->content)->toBe('First part. Second part.');
        expect($response->inputTokens)->toBe(100);
        expect($response->outputTokens)->toBe(50);
        expect($response->totalTokens())->toBe(150);
        expect($response->model)->toBe('claude-sonnet-4-20250514');
        expect($response->finishReason)->toBe('end_turn');
    });

    it('handles empty content blocks', function () {
        $apiResponse = [
            'content' => [],
            'model' => 'claude-sonnet-4-20250514',
            'usage' => ['input_tokens' => 10, 'output_tokens' => 0],
        ];

        $response = AIResponse::fromClaude($apiResponse);

        expect($response->content)->toBe('');
    });

    it('ignores non-text content blocks', function () {
        $apiResponse = [
            'content' => [
                ['type' => 'text', 'text' => 'Hello'],
                ['type' => 'tool_use', 'id' => 'tool_123'],
                ['type' => 'text', 'text' => ' World'],
            ],
            'model' => 'claude-sonnet-4-20250514',
            'usage' => ['input_tokens' => 10, 'output_tokens' => 5],
        ];

        $response = AIResponse::fromClaude($apiResponse);

        expect($response->content)->toBe('Hello World');
    });
});
