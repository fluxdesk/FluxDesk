<?php

use App\Enums\MessageType;
use App\Enums\TicketChannel;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Organization;
use App\Models\Priority;
use App\Models\Sla;
use App\Models\Status;
use App\Models\Tag;
use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Models\User;
use App\Services\OrganizationContext;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

describe('Organization Defaults', function () {
    it('creates default statuses when organization is created', function () {
        $organization = Organization::factory()->create();

        $statuses = Status::withoutGlobalScopes()
            ->where('organization_id', $organization->id)
            ->get();

        expect($statuses)->toHaveCount(4);
        expect($statuses->pluck('slug')->toArray())->toContain('open', 'in-behandeling', 'wachtend', 'gesloten');
        expect($statuses->where('is_default', true)->first()->slug)->toBe('open');
        expect($statuses->where('is_closed', true)->first()->slug)->toBe('gesloten');
    });

    it('creates default priorities when organization is created', function () {
        $organization = Organization::factory()->create();

        $priorities = Priority::withoutGlobalScopes()
            ->where('organization_id', $organization->id)
            ->get();

        expect($priorities)->toHaveCount(3);
        expect($priorities->pluck('slug')->toArray())->toContain('laag', 'normaal', 'urgent');
        expect($priorities->where('is_default', true)->first()->slug)->toBe('normaal');
    });

    it('creates default SLA when organization is created', function () {
        $organization = Organization::factory()->create();

        $sla = Sla::withoutGlobalScopes()
            ->where('organization_id', $organization->id)
            ->where('is_default', true)
            ->first();

        expect($sla)->not->toBeNull();
        expect($sla->is_system)->toBeTrue();
        expect($sla->first_response_hours)->toBe(48);
        expect($sla->resolution_hours)->toBe(168);
    });
});

describe('Ticket Creation', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        app(OrganizationContext::class)->set($this->organization);
    });

    it('generates a ticket number automatically', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $status = Status::where('is_default', true)->first();
        $priority = Priority::where('is_default', true)->first();

        $ticket = Ticket::create([
            'organization_id' => $this->organization->id,
            'subject' => 'Test Ticket',
            'contact_id' => $contact->id,
            'status_id' => $status->id,
            'priority_id' => $priority->id,
            'channel' => TicketChannel::Web,
        ]);

        expect($ticket->ticket_number)->toBe('TKT-00001');
    });

    it('increments ticket number for subsequent tickets', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $status = Status::where('is_default', true)->first();
        $priority = Priority::where('is_default', true)->first();

        $ticket1 = Ticket::create([
            'organization_id' => $this->organization->id,
            'subject' => 'First Ticket',
            'contact_id' => $contact->id,
            'status_id' => $status->id,
            'priority_id' => $priority->id,
            'channel' => TicketChannel::Web,
        ]);

        $ticket2 = Ticket::create([
            'organization_id' => $this->organization->id,
            'subject' => 'Second Ticket',
            'contact_id' => $contact->id,
            'status_id' => $status->id,
            'priority_id' => $priority->id,
            'channel' => TicketChannel::Web,
        ]);

        expect($ticket1->ticket_number)->toBe('TKT-00001');
        expect($ticket2->ticket_number)->toBe('TKT-00002');
    });

    it('sets default status when not provided', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $priority = Priority::where('is_default', true)->first();

        $ticket = Ticket::create([
            'organization_id' => $this->organization->id,
            'subject' => 'Test Ticket',
            'contact_id' => $contact->id,
            'priority_id' => $priority->id,
            'channel' => TicketChannel::Web,
        ]);

        expect($ticket->status->is_default)->toBeTrue();
        expect($ticket->status->slug)->toBe('open');
    });

    it('sets default priority when not provided', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $status = Status::where('is_default', true)->first();

        $ticket = Ticket::create([
            'organization_id' => $this->organization->id,
            'subject' => 'Test Ticket',
            'contact_id' => $contact->id,
            'status_id' => $status->id,
            'channel' => TicketChannel::Web,
        ]);

        expect($ticket->priority->is_default)->toBeTrue();
        expect($ticket->priority->slug)->toBe('normaal');
    });

    it('sets default SLA when not provided', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $status = Status::where('is_default', true)->first();
        $priority = Priority::where('is_default', true)->first();

        $ticket = Ticket::create([
            'organization_id' => $this->organization->id,
            'subject' => 'Test Ticket',
            'contact_id' => $contact->id,
            'status_id' => $status->id,
            'priority_id' => $priority->id,
            'channel' => TicketChannel::Web,
        ]);

        expect($ticket->sla)->not->toBeNull();
        expect($ticket->sla->is_default)->toBeTrue();
    });

    it('calculates SLA due dates on creation', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $status = Status::where('is_default', true)->first();
        $priority = Priority::where('is_default', true)->first();

        $ticket = Ticket::create([
            'organization_id' => $this->organization->id,
            'subject' => 'Test Ticket',
            'contact_id' => $contact->id,
            'status_id' => $status->id,
            'priority_id' => $priority->id,
            'channel' => TicketChannel::Web,
        ]);

        expect($ticket->sla_first_response_due_at)->not->toBeNull();
        expect($ticket->sla_resolution_due_at)->not->toBeNull();
    });

    it('logs ticket creation activity', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);

        $ticket = Ticket::create([
            'organization_id' => $this->organization->id,
            'subject' => 'Test Ticket',
            'contact_id' => $contact->id,
            'channel' => TicketChannel::Web,
        ]);

        $activity = TicketActivity::where('ticket_id', $ticket->id)
            ->where('type', 'created')
            ->first();

        expect($activity)->not->toBeNull();
    });
});

describe('Ticket Updates', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        app(OrganizationContext::class)->set($this->organization);
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    });

    it('logs status changes', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
        ]);

        $newStatus = Status::where('slug', 'in-behandeling')->first();
        $ticket->update(['status_id' => $newStatus->id]);

        $activity = TicketActivity::where('ticket_id', $ticket->id)
            ->where('type', 'status_changed')
            ->first();

        expect($activity)->not->toBeNull();
        expect($activity->properties['new'])->toBe('In behandeling');
    });

    it('logs priority changes', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
        ]);

        $urgentPriority = Priority::where('slug', 'urgent')->first();
        $ticket->update(['priority_id' => $urgentPriority->id]);

        $activity = TicketActivity::where('ticket_id', $ticket->id)
            ->where('type', 'priority_changed')
            ->first();

        expect($activity)->not->toBeNull();
        expect($activity->properties['new'])->toBe('Urgent');
    });

    it('logs assignment changes', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
        ]);

        $agent = User::factory()->create();
        $ticket->update(['assigned_to' => $agent->id]);

        $activity = TicketActivity::where('ticket_id', $ticket->id)
            ->where('type', 'assigned')
            ->first();

        expect($activity)->not->toBeNull();
        expect($activity->properties['new'])->toBe($agent->name);
    });

    it('sets resolved_at when status changes to closed', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
        ]);

        $closedStatus = Status::where('is_closed', true)->first();
        $ticket->update(['status_id' => $closedStatus->id]);
        $ticket->refresh();

        expect($ticket->resolved_at)->not->toBeNull();
    });
});

describe('Messages', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        app(OrganizationContext::class)->set($this->organization);
    });

    it('tracks first response time when agent replies', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $user = User::factory()->create();
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
        ]);

        expect($ticket->first_response_at)->toBeNull();

        Message::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'type' => MessageType::Reply,
            'body' => 'Thank you for contacting us.',
            'is_from_contact' => false,
        ]);

        $ticket->refresh();
        expect($ticket->first_response_at)->not->toBeNull();
    });

    it('does not update first_response_at for customer replies', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
        ]);

        Message::create([
            'ticket_id' => $ticket->id,
            'contact_id' => $contact->id,
            'type' => MessageType::Reply,
            'body' => 'Customer follow-up message.',
            'is_from_contact' => true,
        ]);

        $ticket->refresh();
        expect($ticket->first_response_at)->toBeNull();
    });

    it('does not update first_response_at for internal notes', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $user = User::factory()->create();
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
        ]);

        Message::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'type' => MessageType::Note,
            'body' => 'Internal note.',
            'is_from_contact' => false,
        ]);

        $ticket->refresh();
        expect($ticket->first_response_at)->toBeNull();
    });

    it('logs message activity', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $user = User::factory()->create();
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
        ]);

        Message::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'type' => MessageType::Reply,
            'body' => 'Agent reply.',
            'is_from_contact' => false,
        ]);

        $activity = TicketActivity::where('ticket_id', $ticket->id)
            ->where('type', 'message_added')
            ->first();

        expect($activity)->not->toBeNull();
        expect($activity->properties['type'])->toBe('agent_reply');
    });
});

describe('Ticket Scopes', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        app(OrganizationContext::class)->set($this->organization);
    });

    it('filters open tickets', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $openStatus = Status::where('is_closed', false)->first();
        $closedStatus = Status::where('is_closed', true)->first();

        $openTicket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'status_id' => $openStatus->id,
        ]);

        $closedTicket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'status_id' => $closedStatus->id,
        ]);

        $openTickets = Ticket::open()->get();

        expect($openTickets->pluck('id'))->toContain($openTicket->id);
        expect($openTickets->pluck('id'))->not->toContain($closedTicket->id);
    });

    it('filters unassigned tickets', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $user = User::factory()->create();

        $unassignedTicket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'assigned_to' => null,
        ]);

        $assignedTicket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'assigned_to' => $user->id,
        ]);

        $unassignedTickets = Ticket::unassigned()->get();

        expect($unassignedTickets->pluck('id'))->toContain($unassignedTicket->id);
        expect($unassignedTickets->pluck('id'))->not->toContain($assignedTicket->id);
    });

    it('filters tickets assigned to specific user', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $ticket1 = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'assigned_to' => $user1->id,
        ]);

        $ticket2 = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'assigned_to' => $user2->id,
        ]);

        $user1Tickets = Ticket::assignedTo($user1)->get();

        expect($user1Tickets->pluck('id'))->toContain($ticket1->id);
        expect($user1Tickets->pluck('id'))->not->toContain($ticket2->id);
    });
});

describe('Tags', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        app(OrganizationContext::class)->set($this->organization);
    });

    it('can attach tags to tickets', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
        ]);

        $tag1 = Tag::factory()->create(['organization_id' => $this->organization->id]);
        $tag2 = Tag::factory()->create(['organization_id' => $this->organization->id]);

        $ticket->tags()->attach([$tag1->id, $tag2->id]);

        expect($ticket->tags)->toHaveCount(2);
        expect($ticket->tags->pluck('id'))->toContain($tag1->id, $tag2->id);
    });
});

describe('Organization Scoping', function () {
    it('only returns tickets from current organization', function () {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $contact1 = Contact::factory()->create(['organization_id' => $org1->id]);
        $contact2 = Contact::factory()->create(['organization_id' => $org2->id]);

        app(OrganizationContext::class)->set($org1);
        $ticket1 = Ticket::factory()->create([
            'organization_id' => $org1->id,
            'contact_id' => $contact1->id,
        ]);

        app(OrganizationContext::class)->set($org2);
        $ticket2 = Ticket::factory()->create([
            'organization_id' => $org2->id,
            'contact_id' => $contact2->id,
        ]);

        app(OrganizationContext::class)->set($org1);
        $tickets = Ticket::all();

        expect($tickets)->toHaveCount(1);
        expect($tickets->first()->id)->toBe($ticket1->id);
    });
});

describe('Ticket Creation with Email', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        $this->user = User::factory()->create();
        $this->organization->users()->attach($this->user, ['role' => 'admin', 'is_default' => true]);
        app(OrganizationContext::class)->set($this->organization);
        $this->actingAs($this->user);
    });

    it('creates new contact when email is provided', function () {
        $response = $this->post('/inbox', [
            'subject' => 'Test Ticket',
            'contact_email' => 'newcontact@example.com',
            'message' => 'This is a test message.',
        ]);

        $response->assertRedirect();

        $contact = Contact::where('email', 'newcontact@example.com')->first();
        expect($contact)->not->toBeNull();
        expect($contact->organization_id)->toBe($this->organization->id);

        $ticket = Ticket::where('subject', 'Test Ticket')->first();
        expect($ticket)->not->toBeNull();
        expect($ticket->contact_id)->toBe($contact->id);
    });

    it('uses existing contact when email matches', function () {
        $existingContact = Contact::factory()->create([
            'organization_id' => $this->organization->id,
            'email' => 'existing@example.com',
            'name' => 'Existing Contact',
        ]);

        $response = $this->post('/inbox', [
            'subject' => 'Test Ticket',
            'contact_email' => 'existing@example.com',
            'message' => 'This is a test message.',
        ]);

        $response->assertRedirect();

        // Should not create duplicate
        $contacts = Contact::where('email', 'existing@example.com')->get();
        expect($contacts)->toHaveCount(1);

        $ticket = Ticket::where('subject', 'Test Ticket')->first();
        expect($ticket->contact_id)->toBe($existingContact->id);
    });

    it('requires either contact_id or contact_email', function () {
        $response = $this->post('/inbox', [
            'subject' => 'Test Ticket',
            'message' => 'This is a test message.',
        ]);

        $response->assertSessionHasErrors('contact_id');
    });

    it('extracts name from email when not provided', function () {
        $response = $this->post('/inbox', [
            'subject' => 'Test Ticket',
            'contact_email' => 'john.doe@example.com',
            'message' => 'This is a test message.',
        ]);

        $response->assertRedirect();

        $contact = Contact::where('email', 'john.doe@example.com')->first();
        expect($contact->name)->toBe('John Doe');
    });
});

describe('Ticket Auto-Reopen on Reply', function () {
    beforeEach(function () {
        $this->organization = Organization::factory()->create();
        app(OrganizationContext::class)->set($this->organization);
    });

    it('reopens closed ticket when contact replies', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $closedStatus = Status::where('is_closed', true)->first();
        $openStatus = Status::where('is_default', true)->first();

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'status_id' => $closedStatus->id,
            'resolved_at' => now(),
        ]);

        expect($ticket->status->is_closed)->toBeTrue();
        expect($ticket->resolved_at)->not->toBeNull();

        // Contact replies
        Message::create([
            'ticket_id' => $ticket->id,
            'contact_id' => $contact->id,
            'type' => MessageType::Reply,
            'body' => 'I have a follow-up question.',
            'is_from_contact' => true,
        ]);

        $ticket->refresh();

        expect($ticket->status_id)->toBe($openStatus->id);
        expect($ticket->resolved_at)->toBeNull();
    });

    it('reopens closed ticket when agent replies', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $user = User::factory()->create();
        $closedStatus = Status::where('is_closed', true)->first();
        $openStatus = Status::where('is_default', true)->first();

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'status_id' => $closedStatus->id,
            'resolved_at' => now(),
        ]);

        expect($ticket->status->is_closed)->toBeTrue();

        // Agent replies
        Message::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'type' => MessageType::Reply,
            'body' => 'Following up on this issue.',
            'is_from_contact' => false,
        ]);

        $ticket->refresh();

        expect($ticket->status_id)->toBe($openStatus->id);
        expect($ticket->resolved_at)->toBeNull();
    });

    it('moves ticket back to inbox when reply is added to ticket in folder', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $solvedFolder = \App\Models\TicketFolder::factory()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Solved',
            'system_type' => 'solved',
        ]);

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'folder_id' => $solvedFolder->id,
        ]);

        expect($ticket->folder_id)->toBe($solvedFolder->id);

        // Contact replies
        Message::create([
            'ticket_id' => $ticket->id,
            'contact_id' => $contact->id,
            'type' => MessageType::Reply,
            'body' => 'I need more help.',
            'is_from_contact' => true,
        ]);

        $ticket->refresh();

        expect($ticket->folder_id)->toBeNull(); // Back to inbox
    });

    it('does not reopen ticket for internal notes', function () {
        $contact = Contact::factory()->create(['organization_id' => $this->organization->id]);
        $user = User::factory()->create();
        $closedStatus = Status::where('is_closed', true)->first();

        $ticket = Ticket::factory()->create([
            'organization_id' => $this->organization->id,
            'contact_id' => $contact->id,
            'status_id' => $closedStatus->id,
        ]);

        // Add internal note
        Message::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'type' => MessageType::Note,
            'body' => 'Internal note.',
            'is_from_contact' => false,
        ]);

        $ticket->refresh();

        expect($ticket->status_id)->toBe($closedStatus->id); // Still closed
    });
});
