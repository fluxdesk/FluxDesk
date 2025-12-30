<?php

use App\Enums\UserRole;
use App\Models\Message;
use App\Models\Organization;
use App\Models\Ticket;
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

    $this->ticket = Ticket::factory()->for($this->organization)->create();
});

describe('Message Controller - Store', function () {
    it('creates a message for a ticket', function () {
        $response = $this->actingAs($this->admin)
            ->post(route('inbox.messages.store', $this->ticket), [
                'body' => 'This is a test reply message.',
            ]);

        $response->assertRedirect();

        expect(Message::where('ticket_id', $this->ticket->id)->exists())->toBeTrue();

        $message = Message::where('ticket_id', $this->ticket->id)->first();
        expect($message->body)->toBe('This is a test reply message.');
        expect($message->user_id)->toBe($this->admin->id);
        expect($message->is_from_contact)->toBeFalse();
    });

    it('validates body is required', function () {
        $response = $this->actingAs($this->admin)
            ->post(route('inbox.messages.store', $this->ticket), [
                'body' => '',
            ]);

        $response->assertSessionHasErrors(['body']);
    });

    it('converts markdown to html', function () {
        $this->actingAs($this->admin)
            ->post(route('inbox.messages.store', $this->ticket), [
                'body' => '**Bold text** and *italic*',
            ]);

        $message = Message::where('ticket_id', $this->ticket->id)->first();
        expect($message->body_html)->toContain('<strong>Bold text</strong>');
        expect($message->body_html)->toContain('<em>italic</em>');
    });
});

describe('Message Controller - AI Assisted Flag', function () {
    it('defaults ai_assisted to false', function () {
        $this->actingAs($this->admin)
            ->post(route('inbox.messages.store', $this->ticket), [
                'body' => 'A normal reply without AI assistance.',
            ]);

        $message = Message::where('ticket_id', $this->ticket->id)->first();
        expect($message->ai_assisted)->toBeFalse();
    });

    it('stores ai_assisted flag when true', function () {
        $this->actingAs($this->admin)
            ->post(route('inbox.messages.store', $this->ticket), [
                'body' => 'A reply that was helped by AI suggestions.',
                'ai_assisted' => true,
            ]);

        $message = Message::where('ticket_id', $this->ticket->id)->first();
        expect($message->ai_assisted)->toBeTrue();
    });

    it('stores ai_assisted as false when explicitly false', function () {
        $this->actingAs($this->admin)
            ->post(route('inbox.messages.store', $this->ticket), [
                'body' => 'A reply without AI assistance.',
                'ai_assisted' => false,
            ]);

        $message = Message::where('ticket_id', $this->ticket->id)->first();
        expect($message->ai_assisted)->toBeFalse();
    });

    it('converts string "1" to true for ai_assisted', function () {
        $this->actingAs($this->admin)
            ->post(route('inbox.messages.store', $this->ticket), [
                'body' => 'A reply with AI assistance.',
                'ai_assisted' => '1',
            ]);

        $message = Message::where('ticket_id', $this->ticket->id)->first();
        expect($message->ai_assisted)->toBeTrue();
    });

    it('converts string "0" to false for ai_assisted', function () {
        $this->actingAs($this->admin)
            ->post(route('inbox.messages.store', $this->ticket), [
                'body' => 'A normal reply.',
                'ai_assisted' => '0',
            ]);

        $message = Message::where('ticket_id', $this->ticket->id)->first();
        expect($message->ai_assisted)->toBeFalse();
    });
});

describe('Message Controller - Authentication', function () {
    it('requires authentication to send messages', function () {
        $response = $this->post(route('inbox.messages.store', $this->ticket), [
            'body' => 'Test message',
        ]);

        $response->assertRedirect(route('login'));
    });
});
