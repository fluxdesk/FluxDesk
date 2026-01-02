<?php

use App\Models\Contact;
use App\Models\Organization;
use App\Models\Ticket;
use App\Models\TicketCcContact;
use App\Models\User;
use App\Services\OrganizationContext;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

describe('CC Contact API', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        $this->user = User::factory()->create();
        $this->organization->users()->attach($this->user, ['role' => 'admin', 'is_default' => true]);
        app(OrganizationContext::class)->set($this->organization);
        $this->actingAs($this->user);

        $this->contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $this->ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $this->contact->id,
        ]);
    });

    it('can add a CC contact to a ticket', function () {
        $response = $this->postJson("/inbox/{$this->ticket->id}/cc", [
            'email' => 'cc@example.com',
            'name' => 'CC Contact',
        ]);

        $response->assertSuccessful();

        $ccContact = TicketCcContact::where('ticket_id', $this->ticket->id)
            ->where('email', 'cc@example.com')
            ->first();

        expect($ccContact)->not->toBeNull();
        expect($ccContact->name)->toBe('CC Contact');
    });

    it('can add a CC contact without a name', function () {
        $response = $this->postJson("/inbox/{$this->ticket->id}/cc", [
            'email' => 'cc@example.com',
        ]);

        $response->assertSuccessful();

        $ccContact = TicketCcContact::where('ticket_id', $this->ticket->id)
            ->where('email', 'cc@example.com')
            ->first();

        expect($ccContact)->not->toBeNull();
        expect($ccContact->name)->toBeNull();
    });

    it('requires a valid email to add CC contact', function () {
        $response = $this->postJson("/inbox/{$this->ticket->id}/cc", [
            'email' => 'not-an-email',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['email']);
    });

    it('requires email field to add CC contact', function () {
        $response = $this->postJson("/inbox/{$this->ticket->id}/cc", []);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['email']);
    });

    it('rejects adding primary contact as CC', function () {
        $response = $this->postJson("/inbox/{$this->ticket->id}/cc", [
            'email' => $this->contact->email,
        ]);

        $response->assertUnprocessable();
    });

    it('rejects adding agent as CC', function () {
        $agentEmail = $this->user->email;

        $response = $this->postJson("/inbox/{$this->ticket->id}/cc", [
            'email' => $agentEmail,
        ]);

        $response->assertUnprocessable();
    });

    it('can remove a CC contact from a ticket', function () {
        $ccContact = TicketCcContact::create([
            'ticket_id' => $this->ticket->id,
            'email' => 'cc@example.com',
            'name' => 'CC Contact',
        ]);

        $response = $this->deleteJson("/inbox/{$this->ticket->id}/cc/{$ccContact->id}");

        $response->assertSuccessful();

        expect(TicketCcContact::find($ccContact->id))->toBeNull();
    });

    it('cannot remove CC contact from different ticket', function () {
        $otherTicket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $this->contact->id,
        ]);

        $ccContact = TicketCcContact::create([
            'ticket_id' => $otherTicket->id,
            'email' => 'cc@example.com',
        ]);

        $response = $this->deleteJson("/inbox/{$this->ticket->id}/cc/{$ccContact->id}");

        $response->assertNotFound();

        // CC contact should still exist
        expect(TicketCcContact::find($ccContact->id))->not->toBeNull();
    });

    it('normalizes email to lowercase', function () {
        $response = $this->postJson("/inbox/{$this->ticket->id}/cc", [
            'email' => 'CC@EXAMPLE.COM',
        ]);

        $response->assertSuccessful();

        $ccContact = TicketCcContact::where('ticket_id', $this->ticket->id)->first();
        expect($ccContact->email)->toBe('cc@example.com');
    });
});

describe('CC Contact Model', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        app(OrganizationContext::class)->set($this->organization);

        $this->contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $this->ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $this->contact->id,
        ]);
    });

    it('can add CC contact via ticket method', function () {
        $ccContact = $this->ticket->addCcContact('cc@example.com', 'CC Person');

        expect($ccContact)->not->toBeNull();
        expect($ccContact->email)->toBe('cc@example.com');
        expect($ccContact->name)->toBe('CC Person');
        expect($ccContact->ticket_id)->toBe($this->ticket->id);
    });

    it('updates existing CC contact if email already exists', function () {
        $this->ticket->addCcContact('cc@example.com', 'Original Name');
        $updatedCc = $this->ticket->addCcContact('cc@example.com', 'Updated Name');

        expect($this->ticket->ccContacts()->count())->toBe(1);
        expect($updatedCc->name)->toBe('Updated Name');
    });

    it('rejects primary contact as CC', function () {
        $result = $this->ticket->addCcContact($this->contact->email);

        expect($result)->toBeNull();
        expect($this->ticket->ccContacts()->count())->toBe(0);
    });

    it('rejects agent email as CC', function () {
        $agent = User::factory()->create();
        $this->organization->users()->attach($agent, ['role' => 'agent', 'is_default' => false]);

        $result = $this->ticket->addCcContact($agent->email);

        expect($result)->toBeNull();
        expect($this->ticket->ccContacts()->count())->toBe(0);
    });

    it('links CC contact to existing contact record', function () {
        $existingContact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'email' => 'existing@example.com',
        ]);

        $ccContact = $this->ticket->addCcContact('existing@example.com', 'Some Name');

        expect($ccContact->contact_id)->toBe($existingContact->id);
    });

    it('has ticket relationship', function () {
        $ccContact = $this->ticket->addCcContact('cc@example.com');

        expect($ccContact->ticket->id)->toBe($this->ticket->id);
    });

    it('ticket has ccContacts relationship', function () {
        $this->ticket->addCcContact('cc1@example.com', 'CC One');
        $this->ticket->addCcContact('cc2@example.com', 'CC Two');

        $this->ticket->refresh();

        expect($this->ticket->ccContacts)->toHaveCount(2);
    });

    it('deletes CC contacts when ticket is deleted', function () {
        $this->ticket->addCcContact('cc@example.com');
        $ccId = $this->ticket->ccContacts()->first()->id;

        $this->ticket->delete();

        expect(TicketCcContact::find($ccId))->toBeNull();
    });
});
