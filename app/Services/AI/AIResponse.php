<?php

namespace App\Services\AI;

/**
 * Data transfer object for AI responses.
 */
readonly class AIResponse
{
    public function __construct(
        public string $content,
        public int $inputTokens,
        public int $outputTokens,
        public string $model,
        public ?string $finishReason = null,
    ) {}

    /**
     * Get total tokens used.
     */
    public function totalTokens(): int
    {
        return $this->inputTokens + $this->outputTokens;
    }

    /**
     * Create from OpenAI API response.
     *
     * @param  array<string, mixed>  $response
     */
    public static function fromOpenAI(array $response): self
    {
        return new self(
            content: $response['choices'][0]['message']['content'] ?? '',
            inputTokens: $response['usage']['prompt_tokens'] ?? 0,
            outputTokens: $response['usage']['completion_tokens'] ?? 0,
            model: $response['model'] ?? 'unknown',
            finishReason: $response['choices'][0]['finish_reason'] ?? null,
        );
    }

    /**
     * Create from Claude (Anthropic) API response.
     *
     * @param  array<string, mixed>  $response
     */
    public static function fromClaude(array $response): self
    {
        // Claude returns content as an array of content blocks
        $content = '';
        foreach ($response['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') {
                $content .= $block['text'] ?? '';
            }
        }

        return new self(
            content: $content,
            inputTokens: $response['usage']['input_tokens'] ?? 0,
            outputTokens: $response['usage']['output_tokens'] ?? 0,
            model: $response['model'] ?? 'unknown',
            finishReason: $response['stop_reason'] ?? null,
        );
    }
}
