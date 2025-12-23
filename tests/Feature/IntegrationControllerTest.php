<?php

use App\Enums\UserRole;
use App\Integrations\IntegrationManager;
use App\Models\Organization;
use App\Models\OrganizationIntegration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->admin = User::factory()->create();
    $this->organization->users()->attach($this->admin->id, [
        'role' => UserRole::Admin->value,
        'is_default' => true,
    ]);
});

describe('Integration Controller', function () {
    it('lists integrations for admin', function () {
        $response = $this->actingAs($this->admin)
            ->get('/organization/integrations');

        $response->assertSuccessful();
        $response->assertInertia(fn ($page) => $page
            ->component('organization/integrations')
            ->has('integrations')
        );
    });

    it('requires admin role to view integrations', function () {
        $agent = User::factory()->create();
        $this->organization->users()->attach($agent->id, [
            'role' => UserRole::Agent->value,
        ]);

        $response = $this->actingAs($agent)
            ->get('/organization/integrations');

        $response->assertForbidden();
    });

    it('stores integration credentials', function () {
        $response = $this->actingAs($this->admin)
            ->post('/organization/integrations', [
                'integration' => 'microsoft365',
                'client_id' => 'test-client-id',
                'client_secret' => 'test-client-secret',
                'tenant_id' => 'test-tenant-id',
            ]);

        $response->assertRedirect();

        $integration = OrganizationIntegration::where('organization_id', $this->organization->id)
            ->where('integration', 'microsoft365')
            ->first();

        expect($integration)->not->toBeNull();
        expect($integration->credentials['client_id'])->toBe('test-client-id');
        expect($integration->credentials['client_secret'])->toBe('test-client-secret');
        expect($integration->is_verified)->toBeFalse();
        expect($integration->is_active)->toBeFalse();
    });

    it('updates existing integration credentials', function () {
        $integration = OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => [
                'client_id' => 'old-client-id',
                'client_secret' => 'old-client-secret',
            ],
            'is_verified' => true,
            'verified_at' => now(),
        ]);

        $response = $this->actingAs($this->admin)
            ->post('/organization/integrations', [
                'integration' => 'microsoft365',
                'client_id' => 'new-client-id',
                'client_secret' => 'new-client-secret',
                'tenant_id' => 'new-tenant-id',
            ]);

        $response->assertRedirect();

        $integration->refresh();

        expect($integration->credentials['client_id'])->toBe('new-client-id');
        expect($integration->credentials['client_secret'])->toBe('new-client-secret');
        expect($integration->is_verified)->toBeFalse();
    });

    it('preserves existing credentials when field is omitted', function () {
        $integration = OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => [
                'client_id' => 'existing-client-id',
                'client_secret' => 'existing-client-secret',
                'tenant_id' => 'existing-tenant',
            ],
        ]);

        // Update with new values - omitting fields preserves existing
        $response = $this->actingAs($this->admin)
            ->post('/organization/integrations', [
                'integration' => 'microsoft365',
                'client_id' => 'new-client-id',
                'client_secret' => 'new-client-secret',
                // tenant_id is omitted - should preserve existing
            ]);

        $response->assertRedirect();

        $integration->refresh();

        expect($integration->credentials['client_id'])->toBe('new-client-id');
        expect($integration->credentials['client_secret'])->toBe('new-client-secret');
        expect($integration->credentials['tenant_id'])->toBe('existing-tenant');
    });

    it('rejects unknown integration', function () {
        $response = $this->actingAs($this->admin)
            ->post('/organization/integrations', [
                'integration' => 'unknown-integration',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
    });

    it('can toggle integration active status when verified', function () {
        $integration = OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => [
                'client_id' => 'test-id',
                'client_secret' => 'test-secret',
            ],
            'is_verified' => true,
            'verified_at' => now(),
            'is_active' => false,
        ]);

        $response = $this->actingAs($this->admin)
            ->post("/organization/integrations/{$integration->id}/toggle");

        $response->assertRedirect();

        $integration->refresh();

        expect($integration->is_active)->toBeTrue();

        // Toggle off
        $response = $this->actingAs($this->admin)
            ->post("/organization/integrations/{$integration->id}/toggle");

        $integration->refresh();

        expect($integration->is_active)->toBeFalse();
    });

    it('cannot activate unverified integration', function () {
        $integration = OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => [
                'client_id' => 'test-id',
                'client_secret' => 'test-secret',
            ],
            'is_verified' => false,
            'is_active' => false,
        ]);

        $response = $this->actingAs($this->admin)
            ->post("/organization/integrations/{$integration->id}/toggle");

        $response->assertRedirect();
        $response->assertSessionHas('error');

        $integration->refresh();

        expect($integration->is_active)->toBeFalse();
    });

    it('can delete integration without active email channels', function () {
        $integration = OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => [
                'client_id' => 'test-id',
                'client_secret' => 'test-secret',
            ],
        ]);

        $response = $this->actingAs($this->admin)
            ->delete("/organization/integrations/{$integration->id}");

        $response->assertRedirect();
        $response->assertSessionHas('success');

        expect(OrganizationIntegration::find($integration->id))->toBeNull();
    });
});

describe('OrganizationIntegration Model', function () {
    it('encrypts credentials', function () {
        $integration = OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => [
                'client_id' => 'secret-client-id',
                'client_secret' => 'super-secret',
            ],
        ]);

        // Get raw value from database
        $rawCredentials = \DB::table('organization_integrations')
            ->where('id', $integration->id)
            ->value('credentials');

        // Raw value should not contain the plain text
        expect($rawCredentials)->not->toContain('secret-client-id');
        expect($rawCredentials)->not->toContain('super-secret');

        // But the model should decrypt it
        $integration->refresh();
        expect($integration->credentials['client_id'])->toBe('secret-client-id');
        expect($integration->credentials['client_secret'])->toBe('super-secret');
    });

    it('can get integration instance', function () {
        $integration = OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => [],
        ]);

        $instance = $integration->getIntegrationInstance();

        expect($instance)->not->toBeNull();
        expect($instance->identifier())->toBe('microsoft365');
    });

    it('checks if configured correctly', function () {
        // Not configured - missing required fields
        $integration = OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => [
                'client_id' => 'test-id',
                // Missing client_secret
            ],
        ]);

        expect($integration->isConfigured())->toBeFalse();

        // Properly configured
        $integration->update([
            'credentials' => [
                'client_id' => 'test-id',
                'client_secret' => 'test-secret',
            ],
        ]);

        expect($integration->isConfigured())->toBeTrue();
    });

    it('marks as verified', function () {
        $integration = OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => [],
            'is_verified' => false,
            'verified_at' => null,
        ]);

        $integration->markAsVerified();

        expect($integration->is_verified)->toBeTrue();
        expect($integration->verified_at)->not->toBeNull();
    });

    it('marks as unverified', function () {
        $integration = OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => [],
            'is_verified' => true,
            'verified_at' => now(),
        ]);

        $integration->markAsUnverified();

        expect($integration->is_verified)->toBeFalse();
        expect($integration->verified_at)->toBeNull();
    });
});

describe('Organization Integration Relationships', function () {
    it('organization has many integrations', function () {
        OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => [],
        ]);

        OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'google',
            'credentials' => [],
        ]);

        expect($this->organization->integrations)->toHaveCount(2);
    });

    it('organization can get specific integration', function () {
        OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => ['client_id' => 'ms-id'],
        ]);

        $integration = $this->organization->integration('microsoft365');

        expect($integration)->not->toBeNull();
        expect($integration->credentials['client_id'])->toBe('ms-id');

        // Non-existent integration
        $missing = $this->organization->integration('nonexistent');

        expect($missing)->toBeNull();
    });

    it('organization can check for active integration', function () {
        OrganizationIntegration::create([
            'organization_id' => $this->organization->id,
            'integration' => 'microsoft365',
            'credentials' => ['client_id' => 'id', 'client_secret' => 'secret'],
            'is_verified' => true,
            'is_active' => true,
        ]);

        expect($this->organization->hasActiveIntegration('microsoft365'))->toBeTrue();
        expect($this->organization->hasActiveIntegration('google'))->toBeFalse();
    });
});

describe('Integration Manager', function () {
    it('discovers available integrations', function () {
        $manager = app(IntegrationManager::class);

        expect($manager->has('microsoft365'))->toBeTrue();
        expect($manager->has('google'))->toBeTrue();
        expect($manager->has('nonexistent'))->toBeFalse();
    });

    it('returns all integrations', function () {
        $manager = app(IntegrationManager::class);

        $all = $manager->all();

        expect($all)->toHaveKey('microsoft365');
        expect($all)->toHaveKey('google');
    });

    it('gets specific integration', function () {
        $manager = app(IntegrationManager::class);

        $microsoft = $manager->get('microsoft365');

        expect($microsoft)->not->toBeNull();
        expect($microsoft->name())->toBe('Microsoft 365');

        $nonexistent = $manager->get('nonexistent');

        expect($nonexistent)->toBeNull();
    });
});
