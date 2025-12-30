<?php

namespace App\Models;

use App\Integrations\IntegrationManager;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationAISettings extends Model
{
    protected $table = 'organization_ai_settings';

    protected $fillable = [
        'organization_id',
        'default_provider',
        'default_model',
        'default_language',
        'detect_ticket_language',
        'match_ticket_language',
        'system_instructions',
        'company_context',
        'auto_replies_enabled',
        'suggested_replies_enabled',
        'reply_refactor_enabled',
        'auto_reply_delay_minutes',
        'auto_reply_business_hours_only',
        // Privacy settings
        'include_customer_name',
        'include_agent_name',
        'include_ticket_subject',
        'include_message_history',
        'include_department_name',
        'message_history_limit',
        // Disclosure settings
        'disclosure_enabled',
        'disclosure_in_email',
        'disclosure_in_portal',
        'disclosure_text',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'detect_ticket_language' => 'boolean',
            'match_ticket_language' => 'boolean',
            'auto_replies_enabled' => 'boolean',
            'suggested_replies_enabled' => 'boolean',
            'reply_refactor_enabled' => 'boolean',
            'auto_reply_delay_minutes' => 'integer',
            'auto_reply_business_hours_only' => 'boolean',
            // Privacy settings
            'include_customer_name' => 'boolean',
            'include_agent_name' => 'boolean',
            'include_ticket_subject' => 'boolean',
            'include_message_history' => 'boolean',
            'include_department_name' => 'boolean',
            'message_history_limit' => 'integer',
            // Disclosure settings
            'disclosure_enabled' => 'boolean',
            'disclosure_in_email' => 'boolean',
            'disclosure_in_portal' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Check if any AI provider is configured and active.
     */
    public function isConfigured(): bool
    {
        if (empty($this->default_provider)) {
            return false;
        }

        $integration = $this->organization->integration($this->default_provider);

        return $integration !== null && $integration->is_active;
    }

    /**
     * Get the active AI integration instance.
     */
    public function getActiveIntegration(): ?OrganizationIntegration
    {
        if (empty($this->default_provider)) {
            return null;
        }

        return $this->organization->integration($this->default_provider);
    }

    /**
     * Get available AI providers for this organization.
     *
     * @return array<string, array{identifier: string, name: string, is_active: bool}>
     */
    public function getAvailableProviders(): array
    {
        $manager = app(IntegrationManager::class);
        $aiIntegrations = $manager->byCategory('ai');
        $providers = [];

        foreach ($aiIntegrations as $identifier => $integration) {
            $orgIntegration = $this->organization->integration($identifier);
            $providers[$identifier] = [
                'identifier' => $identifier,
                'name' => $integration->name(),
                'is_active' => $orgIntegration !== null && $orgIntegration->is_active,
            ];
        }

        return $providers;
    }

    /**
     * Get available models for the configured provider.
     *
     * @return array<array{id: string, name: string}>
     */
    public function getAvailableModels(): array
    {
        if (empty($this->default_provider)) {
            return [];
        }

        $manager = app(IntegrationManager::class);
        $integration = $manager->get($this->default_provider);

        if ($integration === null || ! method_exists($integration, 'models')) {
            return [];
        }

        return $integration->models();
    }
}
