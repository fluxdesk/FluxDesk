<?php

use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;
use App\Notifications\OrganizationInvitationNotification;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->admin = User::factory()->create();
    $this->organization->users()->attach($this->admin->id, ['role' => 'admin', 'is_default' => true]);
});

describe('Invitation Creation', function () {
    it('allows admin to send invitation', function () {
        Notification::fake();

        $this->actingAs($this->admin)
            ->withSession(['current_organization_id' => $this->organization->id])
            ->post(route('organization.invitations.store'), [
                'email' => 'newuser@example.com',
                'role' => 'agent',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('organization_invitations', [
            'organization_id' => $this->organization->id,
            'email' => 'newuser@example.com',
            'role' => 'agent',
            'invited_by' => $this->admin->id,
        ]);

        Notification::assertSentOnDemand(OrganizationInvitationNotification::class);
    });

    it('prevents duplicate pending invitations', function () {
        OrganizationInvitation::factory()->create([
            'organization_id' => $this->organization->id,
            'email' => 'existing@example.com',
            'expires_at' => now()->addDays(7),
        ]);

        $this->actingAs($this->admin)
            ->withSession(['current_organization_id' => $this->organization->id])
            ->post(route('organization.invitations.store'), [
                'email' => 'existing@example.com',
                'role' => 'agent',
            ])
            ->assertSessionHasErrors('email');
    });

    it('prevents inviting existing members', function () {
        $member = User::factory()->create(['email' => 'member@example.com']);
        $this->organization->users()->attach($member->id, ['role' => 'agent']);

        $this->actingAs($this->admin)
            ->withSession(['current_organization_id' => $this->organization->id])
            ->post(route('organization.invitations.store'), [
                'email' => 'member@example.com',
                'role' => 'agent',
            ])
            ->assertSessionHasErrors('email');
    });
});

describe('Invitation Acceptance - New User', function () {
    it('shows registration form for new users', function () {
        $invitation = OrganizationInvitation::factory()->create([
            'organization_id' => $this->organization->id,
            'invited_by' => $this->admin->id,
            'email' => 'newuser@example.com',
        ]);

        $this->get(route('invitations.show', $invitation->token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('invitations/register')
                ->has('invitation')
            );
    });

    it('allows new user to register via invitation', function () {
        $invitation = OrganizationInvitation::factory()->create([
            'organization_id' => $this->organization->id,
            'invited_by' => $this->admin->id,
            'email' => 'newuser@example.com',
            'role' => 'agent',
        ]);

        $this->post(route('invitations.register', $invitation->token), [
            'name' => 'New User',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('users', [
            'email' => 'newuser@example.com',
            'name' => 'New User',
        ]);

        $user = User::where('email', 'newuser@example.com')->first();
        $this->assertTrue($user->belongsToOrganization($this->organization));
        $this->assertAuthenticatedAs($user);

        $invitation->refresh();
        $this->assertNotNull($invitation->accepted_at);
    });
});

describe('Invitation Acceptance - Existing User', function () {
    it('shows login required page for existing users not logged in', function () {
        $existingUser = User::factory()->create(['email' => 'existing@example.com']);

        $invitation = OrganizationInvitation::factory()->create([
            'organization_id' => $this->organization->id,
            'invited_by' => $this->admin->id,
            'email' => 'existing@example.com',
        ]);

        $this->get(route('invitations.show', $invitation->token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('invitations/login-required'));
    });

    it('shows accept page for logged in user with matching email', function () {
        $user = User::factory()->create(['email' => 'user@example.com']);

        $invitation = OrganizationInvitation::factory()->create([
            'organization_id' => $this->organization->id,
            'invited_by' => $this->admin->id,
            'email' => 'user@example.com',
        ]);

        $this->actingAs($user)
            ->get(route('invitations.show', $invitation->token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('invitations/accept'));
    });

    it('allows logged in user to accept invitation', function () {
        $user = User::factory()->create(['email' => 'user@example.com']);

        $invitation = OrganizationInvitation::factory()->create([
            'organization_id' => $this->organization->id,
            'invited_by' => $this->admin->id,
            'email' => 'user@example.com',
            'role' => 'admin',
        ]);

        $this->actingAs($user)
            ->post(route('invitations.accept', $invitation->token))
            ->assertRedirect(route('dashboard'));

        $this->assertTrue($user->belongsToOrganization($this->organization));
        $this->assertEquals('admin', $user->roleInOrganization($this->organization)->value);

        $invitation->refresh();
        $this->assertNotNull($invitation->accepted_at);
    });

    it('shows wrong account page for logged in user with different email', function () {
        $wrongUser = User::factory()->create(['email' => 'wrong@example.com']);

        $invitation = OrganizationInvitation::factory()->create([
            'organization_id' => $this->organization->id,
            'invited_by' => $this->admin->id,
            'email' => 'correct@example.com',
        ]);

        $this->actingAs($wrongUser)
            ->get(route('invitations.show', $invitation->token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('invitations/wrong-account'));
    });
});

describe('Invitation Expiration', function () {
    it('shows expired page for expired invitations', function () {
        $invitation = OrganizationInvitation::factory()->create([
            'organization_id' => $this->organization->id,
            'invited_by' => $this->admin->id,
            'expires_at' => now()->subDay(),
        ]);

        $this->get(route('invitations.show', $invitation->token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('invitations/expired'));
    });

    it('shows expired page for already accepted invitations', function () {
        $invitation = OrganizationInvitation::factory()->create([
            'organization_id' => $this->organization->id,
            'invited_by' => $this->admin->id,
            'accepted_at' => now()->subHour(),
        ]);

        $this->get(route('invitations.show', $invitation->token))
            ->assertRedirect(route('dashboard'));
    });
});

describe('Invitation Management', function () {
    it('allows admin to revoke invitation', function () {
        $invitation = OrganizationInvitation::factory()->create([
            'organization_id' => $this->organization->id,
            'invited_by' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->withSession(['current_organization_id' => $this->organization->id])
            ->delete(route('organization.invitations.destroy', $invitation))
            ->assertRedirect();

        $this->assertDatabaseMissing('organization_invitations', ['id' => $invitation->id]);
    });

    it('allows admin to resend invitation', function () {
        Notification::fake();

        $invitation = OrganizationInvitation::factory()->create([
            'organization_id' => $this->organization->id,
            'invited_by' => $this->admin->id,
            'expires_at' => now()->addDay(), // About to expire
        ]);

        $this->actingAs($this->admin)
            ->withSession(['current_organization_id' => $this->organization->id])
            ->post(route('organization.invitations.resend', $invitation))
            ->assertRedirect();

        Notification::assertSentOnDemand(OrganizationInvitationNotification::class);

        $invitation->refresh();
        $this->assertTrue($invitation->expires_at->isAfter(now()->addDays(6)));
    });
});
