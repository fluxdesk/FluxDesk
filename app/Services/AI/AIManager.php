<?php

namespace App\Services\AI;

use App\Models\Organization;
use App\Models\OrganizationAISettings;
use App\Models\OrganizationIntegration;
use App\Services\AI\Contracts\AIProviderInterface;
use App\Services\AI\Providers\ClaudeProvider;
use App\Services\AI\Providers\OpenAIProvider;
use RuntimeException;

/**
 * Factory for resolving AI providers based on organization settings.
 */
class AIManager
{
    /**
     * Provider class mapping.
     *
     * @var array<string, class-string<AIProviderInterface>>
     */
    protected array $providers = [
        'openai' => OpenAIProvider::class,
        'claude' => ClaudeProvider::class,
    ];

    /**
     * Resolve the AI provider for an organization.
     */
    public function forOrganization(Organization $organization): AIProviderInterface
    {
        $aiSettings = $organization->aiSettings;

        if (! $aiSettings) {
            throw new RuntimeException('AI settings not configured for this organization');
        }

        return $this->forSettings($aiSettings);
    }

    /**
     * Resolve the AI provider from AI settings.
     */
    public function forSettings(OrganizationAISettings $settings): AIProviderInterface
    {
        $provider = $settings->default_provider;

        if (empty($provider)) {
            throw new RuntimeException('No AI provider configured');
        }

        $integration = $settings->getActiveIntegration();

        if (! $integration || ! $integration->is_active) {
            throw new RuntimeException("AI provider '{$provider}' is not active");
        }

        return $this->make($provider, $integration);
    }

    /**
     * Create a provider instance from an integration.
     */
    public function make(string $provider, OrganizationIntegration $integration): AIProviderInterface
    {
        if (! isset($this->providers[$provider])) {
            throw new RuntimeException("Unknown AI provider: {$provider}");
        }

        $class = $this->providers[$provider];

        return new $class($integration);
    }

    /**
     * Check if a provider is supported.
     */
    public function supports(string $provider): bool
    {
        return isset($this->providers[$provider]);
    }

    /**
     * Get all supported providers.
     *
     * @return array<string>
     */
    public function supportedProviders(): array
    {
        return array_keys($this->providers);
    }
}
