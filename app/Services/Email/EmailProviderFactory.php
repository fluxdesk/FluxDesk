<?php

namespace App\Services\Email;

use App\Contracts\EmailProviderInterface;
use App\Enums\EmailProvider;
use App\Integrations\IntegrationManager;
use App\Models\EmailChannel;
use InvalidArgumentException;
use RuntimeException;

/**
 * Factory for creating email provider service instances.
 *
 * Returns the appropriate email provider service based on the email channel's
 * configured provider type, with organization-specific integration credentials.
 */
class EmailProviderFactory
{
    public function __construct(
        private Microsoft365Service $microsoft365Service,
        private GoogleService $googleService,
        private IntegrationManager $integrationManager,
    ) {}

    /**
     * Get the email provider service for a channel.
     *
     * Automatically configures the service with organization integration credentials.
     *
     * @throws InvalidArgumentException When the provider type is not supported
     * @throws RuntimeException When organization integration is not configured
     */
    public function make(EmailChannel $channel): EmailProviderInterface
    {
        $organization = $channel->organization;
        $providerIdentifier = $channel->provider->value;

        // Get the organization's integration for this provider
        $orgIntegration = $organization->integration($providerIdentifier);

        if (! $orgIntegration || ! $orgIntegration->is_active) {
            throw new RuntimeException(
                "Integration '{$providerIdentifier}' is not configured or not active for this organization. ".
                'Please configure the integration in organization settings.'
            );
        }

        return match ($channel->provider) {
            EmailProvider::Microsoft365 => $this->microsoft365Service->setIntegration($orgIntegration),
            EmailProvider::Google => $this->googleService->setIntegration($orgIntegration),
            EmailProvider::Smtp => throw new InvalidArgumentException('SMTP provider not yet implemented'),
            default => throw new InvalidArgumentException("Unsupported email provider: {$channel->provider->value}"),
        };
    }

    /**
     * Get the provider service by provider type.
     *
     * Note: This method does NOT set integration credentials.
     * Use make() with an EmailChannel for full credential support.
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
