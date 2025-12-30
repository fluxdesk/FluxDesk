<?php

namespace App\Services\AI\Contracts;

use App\Services\AI\AIResponse;

/**
 * Interface for AI/LLM providers.
 *
 * All AI providers (OpenAI, Claude, Groq, etc.) must implement this interface
 * to provide a consistent API for AI operations.
 */
interface AIProviderInterface
{
    /**
     * Send a chat completion request.
     *
     * @param  array<array{role: string, content: string}>  $messages
     * @param  array<string, mixed>  $options  Additional options like temperature, max_tokens, etc.
     */
    public function chat(array $messages, array $options = []): AIResponse;

    /**
     * Get available models for this provider.
     *
     * @return array<array{id: string, name: string, context_window?: int}>
     */
    public function models(): array;

    /**
     * Estimate the cost for a request based on token usage.
     *
     * @return float Cost in USD
     */
    public function estimateCost(int $inputTokens, int $outputTokens, string $model): float;

    /**
     * Get the provider identifier.
     */
    public function identifier(): string;
}
