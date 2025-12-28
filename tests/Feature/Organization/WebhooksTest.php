<?php

use App\Enums\UserRole;
use App\Enums\WebhookEvent;
use App\Models\Organization;
use App\Models\User;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use App\Services\WebhookService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->organization = Organization::factory()->create();
    $this->admin = User::factory()->create();
    $this->organization->users()->attach($this->admin->id, [
        'role' => UserRole::Admin->value,
        'is_default' => true,
    ]);
});

describe('Webhook Controller', function () {
    it('lists webhooks for admin', function () {
        Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Test Webhook',
            'url' => 'https://example.com/webhook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [WebhookEvent::TicketCreated->value],
        ]);

        $response = $this->actingAs($this->admin)
            ->get('/organization/webhooks');

        $response->assertSuccessful();
        $response->assertInertia(fn ($page) => $page
            ->component('organization/webhooks')
            ->has('webhooks', 1)
            ->has('availableEvents')
        );
    });

    it('requires admin role to view webhooks', function () {
        $agent = User::factory()->create();
        $this->organization->users()->attach($agent->id, [
            'role' => UserRole::Agent->value,
        ]);

        $response = $this->actingAs($agent)
            ->get('/organization/webhooks');

        $response->assertForbidden();
    });

    it('creates a webhook', function () {
        $response = $this->actingAs($this->admin)
            ->post('/organization/webhooks', [
                'name' => 'My Webhook',
                'url' => 'https://example.com/hook',
                'events' => [
                    WebhookEvent::TicketCreated->value,
                    WebhookEvent::MessageCreated->value,
                ],
                'description' => 'Test webhook',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $webhook = Webhook::where('organization_id', $this->organization->id)->first();

        expect($webhook)->not->toBeNull();
        expect($webhook->name)->toBe('My Webhook');
        expect($webhook->url)->toBe('https://example.com/hook');
        expect($webhook->events)->toBe([
            WebhookEvent::TicketCreated->value,
            WebhookEvent::MessageCreated->value,
        ]);
        expect($webhook->secret)->not->toBeEmpty();
        expect($webhook->is_active)->toBeTrue();
    });

    it('validates required fields when creating', function () {
        $response = $this->actingAs($this->admin)
            ->post('/organization/webhooks', [
                'name' => '',
                'url' => '',
                'events' => [],
            ]);

        $response->assertSessionHasErrors(['name', 'url', 'events']);
    });

    it('validates URL format', function () {
        $response = $this->actingAs($this->admin)
            ->post('/organization/webhooks', [
                'name' => 'Test',
                'url' => 'not-a-url',
                'events' => [WebhookEvent::TicketCreated->value],
            ]);

        $response->assertSessionHasErrors(['url']);
    });

    it('validates event types', function () {
        $response = $this->actingAs($this->admin)
            ->post('/organization/webhooks', [
                'name' => 'Test',
                'url' => 'https://example.com/hook',
                'events' => ['invalid.event'],
            ]);

        $response->assertSessionHasErrors(['events.0']);
    });

    it('updates a webhook', function () {
        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Original Name',
            'url' => 'https://old.com/hook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [WebhookEvent::TicketCreated->value],
        ]);

        $response = $this->actingAs($this->admin)
            ->patch("/organization/webhooks/{$webhook->id}", [
                'name' => 'Updated Name',
                'url' => 'https://new.com/hook',
                'events' => [WebhookEvent::MessageCreated->value],
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $webhook->refresh();

        expect($webhook->name)->toBe('Updated Name');
        expect($webhook->url)->toBe('https://new.com/hook');
        expect($webhook->events)->toBe([WebhookEvent::MessageCreated->value]);
    });

    it('deletes a webhook', function () {
        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'To Delete',
            'url' => 'https://example.com/hook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [WebhookEvent::TicketCreated->value],
        ]);

        $response = $this->actingAs($this->admin)
            ->delete("/organization/webhooks/{$webhook->id}");

        $response->assertRedirect();
        $response->assertSessionHas('success');

        expect(Webhook::find($webhook->id))->toBeNull();
    });

    it('toggles webhook active status', function () {
        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Toggle Test',
            'url' => 'https://example.com/hook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [WebhookEvent::TicketCreated->value],
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)
            ->post("/organization/webhooks/{$webhook->id}/toggle");

        $response->assertRedirect();

        $webhook->refresh();
        expect($webhook->is_active)->toBeFalse();

        $response = $this->actingAs($this->admin)
            ->post("/organization/webhooks/{$webhook->id}/toggle");

        $webhook->refresh();
        expect($webhook->is_active)->toBeTrue();
    });

    it('regenerates webhook secret', function () {
        $originalSecret = bin2hex(random_bytes(32));
        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Secret Test',
            'url' => 'https://example.com/hook',
            'secret' => $originalSecret,
            'events' => [WebhookEvent::TicketCreated->value],
        ]);

        $response = $this->actingAs($this->admin)
            ->post("/organization/webhooks/{$webhook->id}/regenerate-secret");

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $webhook->refresh();
        expect($webhook->secret)->not->toBe($originalSecret);
        expect(strlen($webhook->secret))->toBe(64);
    });

    it('returns webhook secret via API', function () {
        $secret = bin2hex(random_bytes(32));
        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Secret API Test',
            'url' => 'https://example.com/hook',
            'secret' => $secret,
            'events' => [WebhookEvent::TicketCreated->value],
        ]);

        $response = $this->actingAs($this->admin)
            ->get("/organization/webhooks/{$webhook->id}/secret");

        $response->assertSuccessful();
        $response->assertJson(['secret' => $secret]);
    });

    it('returns delivery history', function () {
        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Delivery Test',
            'url' => 'https://example.com/hook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [WebhookEvent::TicketCreated->value],
        ]);

        WebhookDelivery::create([
            'webhook_id' => $webhook->id,
            'event_type' => WebhookEvent::TicketCreated->value,
            'payload' => ['test' => true],
            'response_status' => 200,
            'success' => true,
            'attempt' => 1,
            'duration_ms' => 150,
            'created_at' => now(),
        ]);

        $response = $this->actingAs($this->admin)
            ->get("/organization/webhooks/{$webhook->id}/deliveries");

        $response->assertSuccessful();
        $response->assertJsonCount(1, 'deliveries');
    });
});

describe('Webhook Model', function () {
    it('encrypts secret', function () {
        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Encryption Test',
            'url' => 'https://example.com/hook',
            'secret' => 'my-secret-key',
            'events' => [WebhookEvent::TicketCreated->value],
        ]);

        $rawSecret = \DB::table('webhooks')
            ->where('id', $webhook->id)
            ->value('secret');

        expect($rawSecret)->not->toContain('my-secret-key');

        $webhook->refresh();
        expect($webhook->secret)->toBe('my-secret-key');
    });

    it('subscribes to events', function () {
        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Event Test',
            'url' => 'https://example.com/hook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [
                WebhookEvent::TicketCreated->value,
                WebhookEvent::MessageCreated->value,
            ],
        ]);

        expect($webhook->subscribesToEvent(WebhookEvent::TicketCreated))->toBeTrue();
        expect($webhook->subscribesToEvent(WebhookEvent::MessageCreated))->toBeTrue();
        expect($webhook->subscribesToEvent(WebhookEvent::TicketAssigned))->toBeFalse();
    });

    it('tracks failure count and auto-disables', function () {
        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Failure Test',
            'url' => 'https://example.com/hook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [WebhookEvent::TicketCreated->value],
            'failure_count' => 9,
        ]);

        expect($webhook->shouldAutoDisable())->toBeFalse();

        $webhook->incrementFailureCount();
        $webhook->refresh();

        expect($webhook->failure_count)->toBe(10);
        expect($webhook->shouldAutoDisable())->toBeTrue();
        expect($webhook->is_active)->toBeFalse();
        expect($webhook->wasAutoDisabled())->toBeTrue();
    });

    it('resets failure count', function () {
        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Reset Test',
            'url' => 'https://example.com/hook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [WebhookEvent::TicketCreated->value],
            'failure_count' => 5,
        ]);

        $webhook->resetFailureCount();
        $webhook->refresh();

        expect($webhook->failure_count)->toBe(0);
    });
});

describe('Webhook Service', function () {
    it('generates secure secrets', function () {
        $service = app(WebhookService::class);

        $secret = $service->generateSecret();

        expect(strlen($secret))->toBe(64);
        expect(ctype_xdigit($secret))->toBeTrue();
    });

    it('signs payloads correctly', function () {
        $service = app(WebhookService::class);

        $payload = ['event' => 'ticket.created', 'data' => ['id' => 1]];
        $secret = 'test-secret';

        $signature = $service->sign($payload, $secret);

        expect($signature)->toStartWith('sha256=');

        $expectedHash = hash_hmac(
            'sha256',
            json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            $secret
        );

        expect($signature)->toBe('sha256='.$expectedHash);
    });

    it('builds payload with metadata', function () {
        $service = app(WebhookService::class);

        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Payload Test',
            'url' => 'https://example.com/hook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [WebhookEvent::TicketCreated->value],
        ]);

        $data = ['ticket' => ['id' => 123]];
        $payload = $service->buildPayload(WebhookEvent::TicketCreated, $data, $webhook);

        expect($payload)->toHaveKey('event', 'ticket.created');
        expect($payload)->toHaveKey('timestamp');
        expect($payload)->toHaveKey('webhook_id', $webhook->id);
        expect($payload)->toHaveKey('data');
        expect($payload['data'])->toBe($data);
    });

    it('delivers webhooks successfully', function () {
        Http::fake([
            'https://example.com/hook' => Http::response(['status' => 'ok'], 200),
        ]);

        $service = app(WebhookService::class);

        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Delivery Test',
            'url' => 'https://example.com/hook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [WebhookEvent::TicketCreated->value],
        ]);

        $result = $service->deliver($webhook, WebhookEvent::TicketCreated, ['test' => true]);

        expect($result->success)->toBeTrue();
        expect($result->status)->toBe(200);

        Http::assertSent(function ($request) {
            return $request->hasHeader('X-Webhook-Signature')
                && $request->hasHeader('X-Webhook-Event')
                && $request->hasHeader('X-Webhook-Timestamp')
                && $request->hasHeader('User-Agent', 'FluxDesk-Webhook/1.0');
        });
    });

    it('handles delivery failures', function () {
        Http::fake([
            'https://example.com/hook' => Http::response('Server Error', 500),
        ]);

        $service = app(WebhookService::class);

        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Failure Test',
            'url' => 'https://example.com/hook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [WebhookEvent::TicketCreated->value],
        ]);

        $result = $service->deliver($webhook, WebhookEvent::TicketCreated, ['test' => true]);

        expect($result->success)->toBeFalse();
        expect($result->status)->toBe(500);
        expect($result->error)->toContain('500');
    });

    it('sends test webhooks', function () {
        Http::fake([
            'https://example.com/hook' => Http::response(['status' => 'ok'], 200),
        ]);

        $service = app(WebhookService::class);

        $webhook = Webhook::create([
            'organization_id' => $this->organization->id,
            'name' => 'Test Test',
            'url' => 'https://example.com/hook',
            'secret' => bin2hex(random_bytes(32)),
            'events' => [WebhookEvent::TicketCreated->value],
        ]);

        $result = $service->sendTest($webhook);

        expect($result->success)->toBeTrue();

        Http::assertSent(function ($request) {
            $body = $request->data();

            return $body['data']['test'] === true
                && $body['data']['ticket']['ticket_number'] === 'TEST-0001';
        });
    });
});

describe('Webhook Event Enum', function () {
    it('has correct values', function () {
        expect(WebhookEvent::TicketCreated->value)->toBe('ticket.created');
        expect(WebhookEvent::TicketStatusChanged->value)->toBe('ticket.status_changed');
        expect(WebhookEvent::MessageCreated->value)->toBe('message.created');
        expect(WebhookEvent::ReplyReceived->value)->toBe('message.reply_received');
    });

    it('has labels', function () {
        expect(WebhookEvent::TicketCreated->label())->toBe('Nieuw ticket');
        expect(WebhookEvent::MessageCreated->label())->toBe('Nieuw bericht');
    });

    it('provides options for frontend', function () {
        $options = WebhookEvent::toOptions();

        expect($options)->toBeArray();
        expect(count($options))->toBe(7);

        $first = $options[0];
        expect($first)->toHaveKey('value');
        expect($first)->toHaveKey('label');
        expect($first)->toHaveKey('description');
    });
});
