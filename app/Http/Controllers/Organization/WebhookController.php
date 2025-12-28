<?php

namespace App\Http\Controllers\Organization;

use App\Enums\WebhookEvent;
use App\Enums\WebhookFormat;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\StoreWebhookRequest;
use App\Http\Requests\Organization\UpdateWebhookRequest;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use App\Services\OrganizationContext;
use App\Services\WebhookService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Manages organization webhooks.
 *
 * Handles CRUD operations for webhooks, testing, and viewing delivery history.
 */
class WebhookController extends Controller
{
    public function __construct(
        private OrganizationContext $context,
        private WebhookService $webhookService,
    ) {}

    /**
     * Display the webhooks management page.
     */
    public function index(): Response
    {
        $webhooks = Webhook::with(['deliveries' => fn ($q) => $q->latest('created_at')->limit(5)])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Webhook $webhook) => [
                'id' => $webhook->id,
                'name' => $webhook->name,
                'url' => $webhook->url,
                'events' => $webhook->events,
                'format' => $webhook->format->value,
                'is_active' => $webhook->is_active,
                'description' => $webhook->description,
                'last_triggered_at' => $webhook->last_triggered_at?->toIso8601String(),
                'failure_count' => $webhook->failure_count,
                'was_auto_disabled' => $webhook->wasAutoDisabled(),
                'created_at' => $webhook->created_at->toIso8601String(),
                'recent_deliveries' => $webhook->deliveries->map(fn (WebhookDelivery $d) => [
                    'id' => $d->id,
                    'event_type' => $d->event_type,
                    'response_status' => $d->response_status,
                    'success' => $d->success,
                    'duration_ms' => $d->duration_ms,
                    'created_at' => $d->created_at->toIso8601String(),
                ]),
            ]);

        return Inertia::render('organization/webhooks', [
            'webhooks' => $webhooks,
            'availableEvents' => WebhookEvent::toOptions(),
            'availableFormats' => WebhookFormat::toOptions(),
        ]);
    }

    /**
     * Store a new webhook.
     */
    public function store(StoreWebhookRequest $request): RedirectResponse
    {
        Webhook::create([
            'organization_id' => $this->context->id(),
            'name' => $request->validated('name'),
            'url' => $request->validated('url'),
            'secret' => $this->webhookService->generateSecret(),
            'events' => $request->validated('events'),
            'format' => $request->validated('format', 'standard'),
            'description' => $request->validated('description'),
        ]);

        return back()->with('success', 'Webhook aangemaakt.');
    }

    /**
     * Update an existing webhook.
     */
    public function update(UpdateWebhookRequest $request, Webhook $webhook): RedirectResponse
    {
        $webhook->update($request->validated());

        return back()->with('success', 'Webhook bijgewerkt.');
    }

    /**
     * Delete a webhook.
     */
    public function destroy(Webhook $webhook): RedirectResponse
    {
        $webhook->delete();

        return back()->with('success', 'Webhook verwijderd.');
    }

    /**
     * Toggle the webhook active status.
     */
    public function toggle(Webhook $webhook): RedirectResponse
    {
        $webhook->update(['is_active' => ! $webhook->is_active]);

        if ($webhook->is_active && $webhook->failure_count >= 10) {
            $webhook->update(['failure_count' => 0]);
        }

        $message = $webhook->is_active
            ? 'Webhook geactiveerd.'
            : 'Webhook gedeactiveerd.';

        return back()->with('success', $message);
    }

    /**
     * Regenerate the webhook signing secret.
     */
    public function regenerateSecret(Webhook $webhook): RedirectResponse
    {
        $webhook->regenerateSecret();

        return back()->with('success', 'Nieuwe signing secret gegenereerd.');
    }

    /**
     * Get the webhook secret (for display).
     */
    public function getSecret(Webhook $webhook): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'secret' => $webhook->secret,
        ]);
    }

    /**
     * Send a test webhook.
     */
    public function test(Webhook $webhook): RedirectResponse
    {
        $result = $this->webhookService->sendTest($webhook);

        WebhookDelivery::create([
            'webhook_id' => $webhook->id,
            'event_type' => 'test',
            'payload' => ['test' => true],
            'response_status' => $result->status,
            'response_body' => $result->body,
            'duration_ms' => $result->durationMs,
            'attempt' => 1,
            'success' => $result->success,
            'error' => $result->error,
            'created_at' => now(),
        ]);

        if ($result->success) {
            return back()->with('success', "Test succesvol! Response: {$result->status}");
        }

        return back()->with('error', "Test mislukt: {$result->error}");
    }

    /**
     * Get the delivery history for a webhook.
     */
    public function deliveries(Webhook $webhook): \Illuminate\Http\JsonResponse
    {
        $deliveries = $webhook->deliveries()
            ->latest('created_at')
            ->limit(50)
            ->get()
            ->map(fn (WebhookDelivery $d) => [
                'id' => $d->id,
                'event_type' => $d->event_type,
                'response_status' => $d->response_status,
                'response_body' => $d->response_body,
                'success' => $d->success,
                'duration_ms' => $d->duration_ms,
                'error' => $d->error,
                'created_at' => $d->created_at->toIso8601String(),
            ]);

        return response()->json([
            'deliveries' => $deliveries,
        ]);
    }
}
