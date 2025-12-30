<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Integrations\IntegrationManager;
use App\Models\OrganizationAISettings;
use App\Services\AI\AIManager;
use App\Services\AI\UsageTracker;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AISettingsController extends Controller
{
    public function __construct(
        private OrganizationContext $organizationContext,
        private IntegrationManager $integrationManager,
        private AIManager $aiManager,
        private UsageTracker $usageTracker,
    ) {}

    /**
     * AI Settings page
     */
    public function index(): Response
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->aiSettings ?? new OrganizationAISettings([
            'default_language' => 'nl',
            'detect_ticket_language' => true,
            'match_ticket_language' => true,
            'suggested_replies_enabled' => true,
            'reply_refactor_enabled' => true,
            'auto_replies_enabled' => false,
            'auto_reply_delay_minutes' => 5,
            'auto_reply_business_hours_only' => true,
            // Privacy defaults
            'include_customer_name' => true,
            'include_agent_name' => true,
            'include_ticket_subject' => true,
            'include_message_history' => true,
            'include_department_name' => true,
            'message_history_limit' => 10,
            // Disclosure defaults
            'disclosure_enabled' => false,
            'disclosure_in_email' => true,
            'disclosure_in_portal' => true,
            'disclosure_text' => null,
        ]);

        // Get available AI integrations
        $aiIntegrations = $this->integrationManager->byCategory('ai');
        $providers = [];

        foreach ($aiIntegrations as $identifier => $integration) {
            $orgIntegration = $organization->integration($identifier);
            $isActive = $orgIntegration !== null && $orgIntegration->is_active;

            // Fetch models dynamically if provider is active, otherwise use defaults
            $models = [];
            if ($isActive && $this->aiManager->supports($identifier)) {
                try {
                    $provider = $this->aiManager->make($identifier, $orgIntegration);
                    $models = $provider->models();
                } catch (\Exception $e) {
                    $models = $integration->models();
                }
            } else {
                $models = $integration->models();
            }

            $providers[] = [
                'identifier' => $identifier,
                'name' => $integration->name(),
                'is_active' => $isActive,
                'models' => $models,
            ];
        }

        // Get usage statistics
        $usage = $this->usageTracker->getSummary($organization, 'month');
        $usageByAction = $this->usageTracker->getByAction($organization, 'month');

        return Inertia::render('organization/ai-settings', [
            'settings' => $settings->toArray(),
            'providers' => $providers,
            'usage' => $usage,
            'usageByAction' => $usageByAction,
            'languages' => $this->getLanguages(),
        ]);
    }

    /**
     * Update AI settings
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'default_provider' => ['nullable', 'string', 'max:50'],
            'default_model' => ['nullable', 'string', 'max:100'],
            'default_language' => ['required', 'string', 'max:10'],
            'detect_ticket_language' => ['boolean'],
            'match_ticket_language' => ['boolean'],
            'system_instructions' => ['nullable', 'string', 'max:5000'],
            'company_context' => ['nullable', 'string', 'max:2000'],
            'auto_replies_enabled' => ['boolean'],
            'suggested_replies_enabled' => ['boolean'],
            'reply_refactor_enabled' => ['boolean'],
            'auto_reply_delay_minutes' => ['integer', 'min:1', 'max:60'],
            'auto_reply_business_hours_only' => ['boolean'],
            // Privacy settings
            'include_customer_name' => ['boolean'],
            'include_agent_name' => ['boolean'],
            'include_ticket_subject' => ['boolean'],
            'include_message_history' => ['boolean'],
            'include_department_name' => ['boolean'],
            'message_history_limit' => ['integer', 'min:1', 'max:20'],
            // Disclosure settings
            'disclosure_enabled' => ['boolean'],
            'disclosure_in_email' => ['boolean'],
            'disclosure_in_portal' => ['boolean'],
            'disclosure_text' => ['nullable', 'string', 'max:500'],
        ]);

        $organization = $this->organizationContext->organization();

        // Create or update settings
        $organization->aiSettings()->updateOrCreate(
            ['organization_id' => $organization->id],
            $validated
        );

        return back()->with('success', 'AI instellingen opgeslagen.');
    }

    /**
     * Get available models for a provider.
     *
     * @return array<array{id: string, name: string}>
     */
    public function models(string $provider): array
    {
        $integration = $this->integrationManager->get($provider);

        if (! $integration || ! method_exists($integration, 'models')) {
            return [];
        }

        return $integration->models();
    }

    /**
     * Get supported languages.
     *
     * @return array<array{code: string, name: string}>
     */
    protected function getLanguages(): array
    {
        return [
            ['code' => 'nl', 'name' => 'Nederlands'],
            ['code' => 'en', 'name' => 'Engels'],
            ['code' => 'de', 'name' => 'Duits'],
            ['code' => 'fr', 'name' => 'Frans'],
            ['code' => 'es', 'name' => 'Spaans'],
            ['code' => 'it', 'name' => 'Italiaans'],
            ['code' => 'pt', 'name' => 'Portugees'],
            ['code' => 'pl', 'name' => 'Pools'],
        ];
    }
}
