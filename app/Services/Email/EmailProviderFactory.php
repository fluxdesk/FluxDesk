<?php

namespace App\Services\Email;

use App\Contracts\EmailProviderInterface;
use App\Enums\EmailProvider;
use App\Models\EmailChannel;
use InvalidArgumentException;

/**
 * Factory for creating email provider service instances.
 *
 * Returns the appropriate email provider service based on the email channel's
 * configured provider type.
 */
class EmailProviderFactory
{
    public function __construct(
        private Microsoft365Service $microsoft365Service,
        private GoogleService $googleService,
    ) {}

    /**
     * Get the email provider service for a channel.
     *
     * @throws InvalidArgumentException When the provider type is not supported
     */
    public function make(EmailChannel $channel): EmailProviderInterface
    {
        return match ($channel->provider) {
            EmailProvider::Microsoft365 => $this->microsoft365Service,
            EmailProvider::Google => $this->googleService,
            EmailProvider::Smtp => throw new InvalidArgumentException('SMTP provider not yet implemented'),
            default => throw new InvalidArgumentException("Unsupported email provider: {$channel->provider->value}"),
        };
    }

    /**
     * Get the provider service by provider type.
     *
     * @throws InvalidArgumentException When the provider type is not supported
     */
    public function forProvider(EmailProvider $provider): EmailProviderInterface
    {
        return match ($provider) {
            EmailProvider::Microsoft365 => $this->microsoft365Service,
            EmailProvider::Google => $this->googleService,
            EmailProvider::Smtp => throw new InvalidArgumentException('SMTP provider not yet implemented'),
        };
    }

    /**
     * Check if a provider is supported.
     */
    public function isSupported(EmailProvider $provider): bool
    {
        return in_array($provider, [
            EmailProvider::Microsoft365,
            EmailProvider::Google,
        ]);
    }

    /**
     * Get all supported OAuth providers.
     *
     * @return array<EmailProvider>
     */
    public function getSupportedOAuthProviders(): array
    {
        return [
            EmailProvider::Microsoft365,
            EmailProvider::Google,
        ];
    }
}
