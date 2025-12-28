<?php

namespace App\Services\Webhook;

/**
 * Result of a webhook delivery attempt.
 */
readonly class WebhookDeliveryResult
{
    public function __construct(
        public bool $success,
        public ?int $status = null,
        public ?string $body = null,
        public ?int $durationMs = null,
        public ?string $error = null,
    ) {}

    /**
     * Create a successful result.
     */
    public static function success(int $status, string $body, int $durationMs): self
    {
        return new self(
            success: true,
            status: $status,
            body: $body,
            durationMs: $durationMs,
        );
    }

    /**
     * Create a failed result.
     */
    public static function failure(string $error, int $durationMs, ?int $status = null, ?string $body = null): self
    {
        return new self(
            success: false,
            status: $status,
            body: $body,
            durationMs: $durationMs,
            error: $error,
        );
    }
}
