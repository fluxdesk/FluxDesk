<?php

use App\Models\Contact;
use App\Models\MessageDraft;
use App\Models\Organization;
use App\Models\Ticket;
use App\Models\User;
use App\Services\OrganizationContext;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->user = User::factory()->create();
    $this->organization->users()->attach($this->user, ['role' => 'admin']);

    app(OrganizationContext::class)->set($this->organization);

    $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
    $this->ticket = Ticket::factory()->create([
        'organization_id' => $this->organization->id,
        'contact_id' => $contact->id,
    ]);
});

describe('Draft API', function () {
    it('can save a draft for a ticket', function () {
        $this->actingAs($this->user)
            ->postJson("/inbox/{$this->ticket->id}/draft", [
                'body' => 'This is a draft message',
                'type' => 'reply',
            ])
            ->assertSuccessful()
            ->assertJsonPath('draft.body', 'This is a draft message')
            ->assertJsonPath('draft.type', 'reply');

        expect(MessageDraft::where('ticket_id', $this->ticket->id)->where('user_id', $this->user->id)->exists())->toBeTrue();
    });

    it('can update an existing draft', function () {
        MessageDraft::create([
            'ticket_id' => $this->ticket->id,
            'user_id' => $this->user->id,
            'body' => 'Original draft',
            'type' => 'reply',
        ]);

        $this->actingAs($this->user)
            ->postJson("/inbox/{$this->ticket->id}/draft", [
                'body' => 'Updated draft',
                'type' => 'note',
            ])
            ->assertSuccessful()
            ->assertJsonPath('draft.body', 'Updated draft')
            ->assertJsonPath('draft.type', 'note');

        // Should still only have one draft per user per ticket
        expect(MessageDraft::where('ticket_id', $this->ticket->id)->where('user_id', $this->user->id)->count())->toBe(1);
    });

    it('can retrieve a draft for a ticket', function () {
        MessageDraft::create([
            'ticket_id' => $this->ticket->id,
            'user_id' => $this->user->id,
            'body' => 'Saved draft',
            'type' => 'reply',
        ]);

        $this->actingAs($this->user)
            ->getJson("/inbox/{$this->ticket->id}/draft")
            ->assertSuccessful()
            ->assertJsonPath('draft.body', 'Saved draft')
            ->assertJsonPath('draft.type', 'reply');
    });

    it('returns null draft when no draft exists', function () {
        $this->actingAs($this->user)
            ->getJson("/inbox/{$this->ticket->id}/draft")
            ->assertSuccessful()
            ->assertJsonPath('draft', null);
    });

    it('can delete a draft', function () {
        MessageDraft::create([
            'ticket_id' => $this->ticket->id,
            'user_id' => $this->user->id,
            'body' => 'Draft to delete',
            'type' => 'reply',
        ]);

        $this->actingAs($this->user)
            ->deleteJson("/inbox/{$this->ticket->id}/draft")
            ->assertSuccessful()
            ->assertJsonPath('success', true);

        expect(MessageDraft::where('ticket_id', $this->ticket->id)->where('user_id', $this->user->id)->exists())->toBeFalse();
    });

    it('validates draft body is required', function () {
        $this->actingAs($this->user)
            ->postJson("/inbox/{$this->ticket->id}/draft", [
                'body' => '',
                'type' => 'reply',
            ])
            ->assertStatus(422);
    });

    it('validates draft type must be valid', function () {
        $this->actingAs($this->user)
            ->postJson("/inbox/{$this->ticket->id}/draft", [
                'body' => 'Draft content',
                'type' => 'invalid_type',
            ])
            ->assertStatus(422);
    });
});

describe('Draft Isolation', function () {
    it('keeps drafts separate per user', function () {
        $otherUser = User::factory()->create();
        $this->organization->users()->attach($otherUser, ['role' => 'member']);

        // User 1 creates a draft
        $this->actingAs($this->user)
            ->postJson("/inbox/{$this->ticket->id}/draft", [
                'body' => 'User 1 draft',
                'type' => 'reply',
            ]);

        // User 2 creates a draft for the same ticket
        $this->actingAs($otherUser)
            ->postJson("/inbox/{$this->ticket->id}/draft", [
                'body' => 'User 2 draft',
                'type' => 'note',
            ]);

        // Each user should see only their own draft
        $this->actingAs($this->user)
            ->getJson("/inbox/{$this->ticket->id}/draft")
            ->assertJsonPath('draft.body', 'User 1 draft');

        $this->actingAs($otherUser)
            ->getJson("/inbox/{$this->ticket->id}/draft")
            ->assertJsonPath('draft.body', 'User 2 draft');

        expect(MessageDraft::where('ticket_id', $this->ticket->id)->count())->toBe(2);
    });

    it('keeps drafts separate per ticket', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $otherTicket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
        ]);

        // Create drafts for different tickets
        $this->actingAs($this->user)
            ->postJson("/inbox/{$this->ticket->id}/draft", [
                'body' => 'Draft for ticket 1',
                'type' => 'reply',
            ]);

        $this->actingAs($this->user)
            ->postJson("/inbox/{$otherTicket->id}/draft", [
                'body' => 'Draft for ticket 2',
                'type' => 'note',
            ]);

        // Each ticket should have its own draft
        $this->actingAs($this->user)
            ->getJson("/inbox/{$this->ticket->id}/draft")
            ->assertJsonPath('draft.body', 'Draft for ticket 1');

        $this->actingAs($this->user)
            ->getJson("/inbox/{$otherTicket->id}/draft")
            ->assertJsonPath('draft.body', 'Draft for ticket 2');
    });
});

describe('Draft Cleanup', function () {
    it('deletes drafts when ticket is deleted', function () {
        MessageDraft::create([
            'ticket_id' => $this->ticket->id,
            'user_id' => $this->user->id,
            'body' => 'Draft content',
            'type' => 'reply',
        ]);

        $this->ticket->delete();

        expect(MessageDraft::where('ticket_id', $this->ticket->id)->exists())->toBeFalse();
    });

    it('deletes drafts when user is deleted', function () {
        MessageDraft::create([
            'ticket_id' => $this->ticket->id,
            'user_id' => $this->user->id,
            'body' => 'Draft content',
            'type' => 'reply',
        ]);

        $this->user->delete();

        expect(MessageDraft::where('user_id', $this->user->id)->exists())->toBeFalse();
    });
});

describe('Draft Authorization', function () {
    it('requires authentication to access drafts', function () {
        $this->getJson("/inbox/{$this->ticket->id}/draft")
            ->assertUnauthorized();

        $this->postJson("/inbox/{$this->ticket->id}/draft", [
            'body' => 'Draft',
            'type' => 'reply',
        ])->assertUnauthorized();

        $this->deleteJson("/inbox/{$this->ticket->id}/draft")
            ->assertUnauthorized();
    });

    it('requires organization membership to access drafts', function () {
        $nonMemberUser = User::factory()->create();

        // Non-members are redirected (302) when accessing organization resources
        $this->actingAs($nonMemberUser)
            ->getJson("/inbox/{$this->ticket->id}/draft")
            ->assertRedirect();
    });
});
