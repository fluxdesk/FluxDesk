<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Integrations\Contracts\Integration;
use App\Integrations\IntegrationManager;
use App\Models\OrganizationIntegration;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Manages organization-level integration configurations.
 *
 * Handles CRUD operations for integration credentials, connection testing,
 * and activation status management.
 */
class IntegrationController extends Controller
{
    public function __construct(
        private OrganizationContext $context,
        private IntegrationManager $manager,
    ) {}

    /**
     * Display the integrations management page.
     */
    public function index(): Response
    {
        $organization = $this->context->organization();
        $configured = $organization->integrations()->get()->keyBy('integration');

        $integrations = collect($this->manager->all())
            ->map(fn (Integration $int) => [
                'identifier' => $int->identifier(),
                'name' => $int->name(),
                'description' => $int->description(),
                'icon' => $int->icon(),
                'category' => $int->category(),
                'auth_type' => $int->authType(),
                'is_oauth' => $int->isOAuth(),
                'credential_fields' => $int->credentialFields(),
                'configured' => $configured->has($int->identifier()) ? [
                    'id' => $configured[$int->identifier()]->id,
                    'is_active' => $configured[$int->identifier()]->is_active,
                    'is_verified' => $configured[$int->identifier()]->is_verified,
                    'verified_at' => $configured[$int->identifier()]->verified_at?->toIso8601String(),
                    'is_configured' => $configured[$int->identifier()]->isConfigured(),
                ] : null,
            ])
            ->values()
            ->all();

        return Inertia::render('organization/integrations', [
            'integrations' => $integrations,
        ]);
    }

    /**
     * Store or update integration credentials.
     */
    public function store(Request $request): RedirectResponse
    {
        $integration = $this->manager->get($request->input('integration'));

        if (! $integration) {
            return back()->with('error', 'Onbekende integratie.');
        }

        $request->validate($integration->validationRules());

        $credentials = $request->only($integration->credentialFieldNames());

        // Get existing integration to preserve unmodified credentials
        $existing = OrganizationIntegration::where('organization_id', $this->context->id())
            ->where('integration', $request->input('integration'))
            ->first();

        // If updating, merge with existing credentials (for fields left blank)
        if ($existing) {
            $existingCredentials = $existing->credentials ?? [];
            foreach ($integration->credentialFieldNames() as $fieldName) {
                // Only use existing value if new value is empty
                if (empty($credentials[$fieldName]) && ! empty($existingCredentials[$fieldName])) {
                    $credentials[$fieldName] = $existingCredentials[$fieldName];
                }
            }
        }

        // Check if credentials actually changed - only reset verification if they did
        $credentialsChanged = ! $existing || ($existing->credentials ?? []) !== $credentials;

        $updateData = ['credentials' => $credentials];

        // Only reset verification if credentials changed
        if ($credentialsChanged) {
            $updateData['is_verified'] = false;
            $updateData['verified_at'] = null;
        }

        OrganizationIntegration::updateOrCreate(
            [
                'organization_id' => $this->context->id(),
                'integration' => $request->input('integration'),
            ],
            $updateData
        );

        return back()->with('success', 'Credentials opgeslagen. Test de verbinding om te activeren.');
    }

    /**
     * Test the integration connection.
     */
    public function test(OrganizationIntegration $integration): RedirectResponse
    {
        if (! $integration->isConfigured()) {
            return back()->with('error', 'Configureer eerst de credentials voordat je de verbinding test.');
        }

        $integrationInstance = $integration->getIntegrationInstance();

        if (! $integrationInstance) {
            return back()->with('error', 'Integratie niet gevonden.');
        }

        $result = $integrationInstance->testConnection($integration);

        if ($result['success']) {
            $integration->markAsVerified();

            return back()->with('success', $result['message']);
        }

        $integration->markAsUnverified();

        return back()->with('error', $result['message']);
    }

    /**
     * Toggle the integration active status.
     */
    public function toggle(OrganizationIntegration $integration): RedirectResponse
    {
        if (! $integration->is_verified && ! $integration->is_active) {
            return back()->with('error', 'Test eerst de verbinding voordat je de integratie activeert.');
        }

        $integration->update(['is_active' => ! $integration->is_active]);

        $message = $integration->is_active
            ? 'Integratie geactiveerd.'
            : 'Integratie gedeactiveerd.';

        return back()->with('success', $message);
    }

    /**
     * Delete the integration configuration.
     */
    public function destroy(OrganizationIntegration $integration): RedirectResponse
    {
        // Check if any email channels are using this integration
        $emailChannelsCount = $integration->organization->emailChannels()
            ->where('provider', $integration->integration)
            ->where('is_active', true)
            ->count();

        if ($emailChannelsCount > 0) {
            return back()->with('error', "Kan niet verwijderen: {$emailChannelsCount} actieve e-mailkanalen gebruiken deze integratie.");
        }

        $integration->delete();

        return back()->with('success', 'Integratie credentials verwijderd.');
    }
}
