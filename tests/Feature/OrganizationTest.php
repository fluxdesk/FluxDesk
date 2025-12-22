<?php

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\OrganizationSettings;
use App\Models\User;
use App\Services\OrganizationContext;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('Organization Creation', function () {
    it('generates a UUID when creating an organization', function () {
        $organization = Organization::factory()->create(['uuid' => null]);

        expect($organization->uuid)->not->toBeNull();
        expect($organization->uuid)->toMatch('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i');
    });

    it('generates a slug from the name when not provided', function () {
        $organization = Organization::create([
            'name' => 'Test Company Inc.',
        ]);

        expect($organization->slug)->toBe('test-company-inc');
    });

    it('creates organization settings when organization is created', function () {
        $organization = Organization::factory()->create();

        expect($organization->settings)->not->toBeNull();
        expect($organization->settings)->toBeInstanceOf(OrganizationSettings::class);
        expect($organization->settings->ticket_prefix)->toBe('TKT');
        expect($organization->settings->next_ticket_number)->toBe(1);
    });
});

describe('Organization Settings', function () {
    it('generates ticket numbers correctly', function () {
        $organization = Organization::factory()->create();
        $settings = $organization->settings;

        $ticketNumber1 = $settings->generateTicketNumber();
        $ticketNumber2 = $settings->generateTicketNumber();
        $ticketNumber3 = $settings->generateTicketNumber();

        expect($ticketNumber1)->toBe('TKT-00001');
        expect($ticketNumber2)->toBe('TKT-00002');
        expect($ticketNumber3)->toBe('TKT-00003');
        expect($settings->fresh()->next_ticket_number)->toBe(4);
    });

    it('uses custom ticket format', function () {
        $organization = Organization::factory()->create();
        $settings = $organization->settings;

        $settings->update([
            'ticket_prefix' => 'SUP',
            'ticket_number_format' => '{prefix}#{number}',
        ]);

        $ticketNumber = $settings->generateTicketNumber();

        expect($ticketNumber)->toBe('SUP#00001');
    });
});

describe('User Organization Membership', function () {
    it('can add users to organizations with roles', function () {
        $organization = Organization::factory()->create();
        $adminUser = User::factory()->create();
        $agentUser = User::factory()->create();

        $organization->users()->attach($adminUser->id, ['role' => UserRole::Admin->value, 'is_default' => true]);
        $organization->users()->attach($agentUser->id, ['role' => UserRole::Agent->value]);

        expect($organization->users)->toHaveCount(2);
        expect($organization->admins)->toHaveCount(1);
        expect($organization->agents)->toHaveCount(1);
    });

    it('can check if user belongs to organization', function () {
        $organization = Organization::factory()->create();
        $memberUser = User::factory()->create();
        $nonMemberUser = User::factory()->create();

        $organization->users()->attach($memberUser->id, ['role' => UserRole::Agent->value]);

        expect($memberUser->belongsToOrganization($organization))->toBeTrue();
        expect($nonMemberUser->belongsToOrganization($organization))->toBeFalse();
    });

    it('can get user role in organization', function () {
        $organization = Organization::factory()->create();
        $adminUser = User::factory()->create();
        $agentUser = User::factory()->create();
        $nonMemberUser = User::factory()->create();

        $organization->users()->attach($adminUser->id, ['role' => UserRole::Admin->value]);
        $organization->users()->attach($agentUser->id, ['role' => UserRole::Agent->value]);

        expect($adminUser->roleInOrganization($organization))->toBe(UserRole::Admin);
        expect($agentUser->roleInOrganization($organization))->toBe(UserRole::Agent);
        expect($nonMemberUser->roleInOrganization($organization))->toBeNull();
    });

    it('can check if user is admin of organization', function () {
        $organization = Organization::factory()->create();
        $adminUser = User::factory()->create();
        $agentUser = User::factory()->create();

        $organization->users()->attach($adminUser->id, ['role' => UserRole::Admin->value]);
        $organization->users()->attach($agentUser->id, ['role' => UserRole::Agent->value]);

        expect($adminUser->isAdminOf($organization))->toBeTrue();
        expect($agentUser->isAdminOf($organization))->toBeFalse();
    });

    it('can get default organization for user', function () {
        $organization1 = Organization::factory()->create();
        $organization2 = Organization::factory()->create();
        $user = User::factory()->create();

        $organization1->users()->attach($user->id, ['role' => UserRole::Agent->value, 'is_default' => false]);
        $organization2->users()->attach($user->id, ['role' => UserRole::Admin->value, 'is_default' => true]);

        expect($user->defaultOrganization()->id)->toBe($organization2->id);
    });
});

describe('Organization Context', function () {
    it('can set and get organization context', function () {
        $organization = Organization::factory()->create();
        $context = app(OrganizationContext::class);

        expect($context->has())->toBeFalse();
        expect($context->id())->toBeNull();

        $context->set($organization);

        expect($context->has())->toBeTrue();
        expect($context->id())->toBe($organization->id);
        expect($context->get()->id)->toBe($organization->id);
    });

    it('can clear organization context', function () {
        $organization = Organization::factory()->create();
        $context = app(OrganizationContext::class);

        $context->set($organization);
        expect($context->has())->toBeTrue();

        $context->clear();
        expect($context->has())->toBeFalse();
    });

    it('throws exception when requiring context but none is set', function () {
        $context = app(OrganizationContext::class);
        $context->clear();

        $context->require();
    })->throws(RuntimeException::class, 'No organization context has been set.');
});

describe('Super Admin', function () {
    it('identifies super admin users', function () {
        $superAdmin = User::factory()->create(['is_super_admin' => true]);
        $regularUser = User::factory()->create(['is_super_admin' => false]);

        expect($superAdmin->isSuperAdmin())->toBeTrue();
        expect($regularUser->isSuperAdmin())->toBeFalse();
    });
});

describe('Soft Deletes', function () {
    it('soft deletes organizations', function () {
        $organization = Organization::factory()->create();
        $organizationId = $organization->id;

        $organization->delete();

        expect(Organization::find($organizationId))->toBeNull();
        expect(Organization::withTrashed()->find($organizationId))->not->toBeNull();
    });
});
