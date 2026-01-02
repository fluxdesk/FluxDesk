<?php

namespace App\Services\Messaging;

use App\Contracts\MessagingProviderInterface;
use App\Enums\MessagingProvider;
use App\Integrations\IntegrationManager;
use App\Models\MessagingChannel;
use InvalidArgumentException;
use RuntimeException;

/**
 * Factory for creating messaging provider service instances.
 *
 * Returns the appropriate messaging provider service based on the channel's
 * configured provider type, with organization-specific integration credentials.
 */
class MessagingProviderFactory
{
    public function __construct(
        private InstagramService $instagramService,
        private IntegrationManager $integrationManager,
    ) {}

    /**
     * Get the messaging provider service for a channel.
     *
     * Automatically configures the service with organization integration credentials.
     *
     * @throws InvalidArgumentException When the provider type is not supported
     * @throws RuntimeException When organization integration is not configured
     */
    public function make(MessagingChannel $channel): MessagingProviderInterface
    {
        $organization = $channel->organization;
        $integrationIdentifier = $channel->provider->integrationIdentifier();

        if (! $integrationIdentifier) {
            throw new InvalidArgumentException(
                "Provider '{$channel->provider->value}' does not require an integration"
            );
        }

        // Get the organization's integration for this provider
        $orgIntegration = $organization->integration($integrationIdentifier);

        if (! $orgIntegration || ! $orgIntegration->is_active) {
            throw new RuntimeException(
                "Integration '{$integrationIdentifier}' is not configured or not active for this organization. ".
                'Please configure the integration in organization settings.'
            );
        }

        return match ($channel->provider) {
            MessagingProvider::Instagram => $this->instagramService->setIntegration($orgIntegration),
            MessagingProvider::FacebookMessenger => $this->instagramService->setIntegration($orgIntegration), // Uses same Meta API
            MessagingProvider::WhatsApp => throw new InvalidArgumentException('WhatsApp provider not yet implemented'),
            MessagingProvider::WeChat => throw new InvalidArgumentException('WeChat provider not yet implemented'),
            MessagingProvider::Livechat => throw new InvalidArgumentException('Livechat provider not yet implemented'),
        };
    }

    /**
     * Get the provider service by provider type.
     *
     * Note: This method does NOT set integration credentials.
     * Use make() with a MessagingChannel for full credential support.
     *
     * @throws InvalidArgumentException When the provider type is not supported
     */
    public function forProvider(MessagingProvider $provider): MessagingProviderInterface
    {
        return match ($provider) {
            MessagingProvider::Instagram => $this->instagramService,
            MessagingProvider::FacebookMessenger => $this->instagramService,
            MessagingProvider::WhatsApp => throw new InvalidArgumentException('WhatsApp provider not yet implemented'),
            MessagingProvider::WeChat => throw new InvalidArgumentException('WeChat provider not yet implemented'),
            MessagingProvider::Livechat => throw new InvalidArgumentException('Livechat provider not yet implemented'),
        };
    }

    /**
     * Check if a provider is supported.
     */
    public function isSupported(MessagingProvider $provider): bool
    {
        return in_array($provider, [
            MessagingProvider::Instagram,
            MessagingProvider::FacebookMessenger,
        ]);
    }

    /**
     * Get all supported providers.
     *
     * @return array<MessagingProvider>
     */
    public function getSupportedProviders(): array
    {
        return [
            MessagingProvider::Instagram,
            MessagingProvider::FacebookMessenger,
        ];
    }

    /**
     * Get all supported OAuth providers.
     *
     * @return array<MessagingProvider>
     */
    public function getSupportedOAuthProviders(): array
    {
        return array_filter(
            $this->getSupportedProviders(),
            fn (MessagingProvider $provider) => $provider->requiresOAuth()
        );
    }
}
