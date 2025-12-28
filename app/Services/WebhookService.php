<?php

namespace App\Services;

use App\Enums\WebhookEvent;
use App\Enums\WebhookFormat;
use App\Models\Webhook;
use App\Services\Webhook\WebhookDeliveryResult;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WebhookService
{
    /**
     * Generate a cryptographically secure webhook secret.
     */
    public function generateSecret(): string
    {
        return bin2hex(random_bytes(32));
    }

    /**
     * Generate HMAC-SHA256 signature for the payload.
     */
    public function sign(array $payload, string $secret): string
    {
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return 'sha256='.hash_hmac('sha256', $json, $secret);
    }

    /**
     * Build the full webhook payload with metadata.
     *
     * @return array<string, mixed>
     */
    public function buildPayload(WebhookEvent $eventType, array $data, Webhook $webhook): array
    {
        $basePayload = [
            'event' => $eventType->value,
            'timestamp' => now()->toIso8601String(),
            'webhook_id' => $webhook->id,
            'data' => $data,
        ];

        return match ($webhook->format) {
            WebhookFormat::Discord => $this->transformForDiscord($eventType, $data, $basePayload),
            WebhookFormat::Slack => $this->transformForSlack($eventType, $data, $basePayload),
            default => $basePayload,
        };
    }

    /**
     * Transform payload for Discord webhook format.
     *
     * @return array<string, mixed>
     */
    protected function transformForDiscord(WebhookEvent $eventType, array $data, array $basePayload): array
    {
        $ticket = $data['ticket'] ?? [];
        $contact = $data['contact'] ?? [];
        $changes = $data['changes'] ?? [];

        $title = $this->getEventTitle($eventType);
        $description = $this->buildDescription($eventType, $ticket, $contact, $changes);
        $color = $this->getEventColor($eventType);

        return [
            'embeds' => [
                [
                    'title' => $title,
                    'description' => $description,
                    'color' => $color,
                    'url' => $ticket['url'] ?? null,
                    'fields' => array_filter([
                        $ticket['ticket_number'] ?? null ? [
                            'name' => 'Ticket',
                            'value' => $ticket['ticket_number'],
                            'inline' => true,
                        ] : null,
                        $ticket['status']['name'] ?? null ? [
                            'name' => 'Status',
                            'value' => $ticket['status']['name'],
                            'inline' => true,
                        ] : null,
                        $ticket['priority']['name'] ?? null ? [
                            'name' => 'Prioriteit',
                            'value' => $ticket['priority']['name'],
                            'inline' => true,
                        ] : null,
                        $contact['name'] ?? null ? [
                            'name' => 'Contact',
                            'value' => $contact['name'].($contact['email'] ?? '' ? ' ('.$contact['email'].')' : ''),
                            'inline' => false,
                        ] : null,
                    ]),
                    'timestamp' => now()->toIso8601String(),
                    'footer' => [
                        'text' => 'FluxDesk',
                    ],
                ],
            ],
        ];
    }

    /**
     * Transform payload for Slack webhook format.
     *
     * @return array<string, mixed>
     */
    protected function transformForSlack(WebhookEvent $eventType, array $data, array $basePayload): array
    {
        $ticket = $data['ticket'] ?? [];
        $contact = $data['contact'] ?? [];
        $changes = $data['changes'] ?? [];

        $title = $this->getEventTitle($eventType);
        $description = $this->buildDescription($eventType, $ticket, $contact, $changes);

        $fields = array_filter([
            $ticket['ticket_number'] ?? null ? [
                'type' => 'mrkdwn',
                'text' => "*Ticket:* {$ticket['ticket_number']}",
            ] : null,
            $ticket['status']['name'] ?? null ? [
                'type' => 'mrkdwn',
                'text' => "*Status:* {$ticket['status']['name']}",
            ] : null,
            $ticket['priority']['name'] ?? null ? [
                'type' => 'mrkdwn',
                'text' => "*Prioriteit:* {$ticket['priority']['name']}",
            ] : null,
        ]);

        return [
            'blocks' => [
                [
                    'type' => 'header',
                    'text' => [
                        'type' => 'plain_text',
                        'text' => $title,
                        'emoji' => true,
                    ],
                ],
                [
                    'type' => 'section',
                    'text' => [
                        'type' => 'mrkdwn',
                        'text' => $description,
                    ],
                ],
                ...($fields ? [[
                    'type' => 'section',
                    'fields' => $fields,
                ]] : []),
                ...(isset($ticket['url']) ? [[
                    'type' => 'actions',
                    'elements' => [
                        [
                            'type' => 'button',
                            'text' => [
                                'type' => 'plain_text',
                                'text' => 'Bekijk ticket',
                                'emoji' => true,
                            ],
                            'url' => $ticket['url'],
                        ],
                    ],
                ]] : []),
                [
                    'type' => 'context',
                    'elements' => [
                        [
                            'type' => 'mrkdwn',
                            'text' => 'Via FluxDesk | '.now()->format('d-m-Y H:i'),
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * Get a human-readable title for the event.
     */
    protected function getEventTitle(WebhookEvent $eventType): string
    {
        return match ($eventType) {
            WebhookEvent::TicketCreated => '🎫 Nieuw ticket',
            WebhookEvent::TicketStatusChanged => '🔄 Status gewijzigd',
            WebhookEvent::TicketPriorityChanged => '⚡ Prioriteit gewijzigd',
            WebhookEvent::TicketAssigned => '👤 Ticket toegewezen',
            WebhookEvent::TicketSlaChanged => '⏱️ SLA gewijzigd',
            WebhookEvent::MessageCreated => '💬 Nieuw bericht',
            WebhookEvent::ReplyReceived => '📩 Klantreactie ontvangen',
        };
    }

    /**
     * Get Discord embed color for the event.
     */
    protected function getEventColor(WebhookEvent $eventType): int
    {
        return match ($eventType) {
            WebhookEvent::TicketCreated => 0x22C55E, // green
            WebhookEvent::TicketStatusChanged => 0x3B82F6, // blue
            WebhookEvent::TicketPriorityChanged => 0xF59E0B, // amber
            WebhookEvent::TicketAssigned => 0x8B5CF6, // violet
            WebhookEvent::TicketSlaChanged => 0x06B6D4, // cyan
            WebhookEvent::MessageCreated => 0x6366F1, // indigo
            WebhookEvent::ReplyReceived => 0xEC4899, // pink
        };
    }

    /**
     * Build description text for the event.
     */
    protected function buildDescription(WebhookEvent $eventType, array $ticket, array $contact, array $changes): string
    {
        $subject = $ticket['subject'] ?? 'Onbekend';

        return match ($eventType) {
            WebhookEvent::TicketCreated => "**{$subject}**\n\nNieuw ticket aangemaakt".($contact['name'] ?? '' ? " door {$contact['name']}" : ''),
            WebhookEvent::TicketStatusChanged => "**{$subject}**\n\nStatus: ".($changes['status']['from']['name'] ?? '?').' → '.($changes['status']['to']['name'] ?? '?'),
            WebhookEvent::TicketPriorityChanged => "**{$subject}**\n\nPrioriteit: ".($changes['priority']['from']['name'] ?? '?').' → '.($changes['priority']['to']['name'] ?? '?'),
            WebhookEvent::TicketAssigned => "**{$subject}**\n\nToegewezen aan: ".($changes['assigned_to']['to']['name'] ?? 'Niemand'),
            WebhookEvent::TicketSlaChanged => "**{$subject}**\n\nSLA: ".($changes['sla']['from']['name'] ?? '?').' → '.($changes['sla']['to']['name'] ?? '?'),
            WebhookEvent::MessageCreated => "**{$subject}**\n\nNieuw bericht toegevoegd",
            WebhookEvent::ReplyReceived => "**{$subject}**\n\nNieuwe reactie van klant".($contact['name'] ?? '' ? " ({$contact['name']})" : ''),
        };
    }

    /**
     * Deliver a webhook.
     */
    public function deliver(Webhook $webhook, WebhookEvent $eventType, array $data): WebhookDeliveryResult
    {
        $payload = $this->buildPayload($eventType, $data, $webhook);
        $timestamp = now()->toIso8601String();

        $headers = [
            'Content-Type' => 'application/json',
            'User-Agent' => 'FluxDesk-Webhook/1.0',
        ];

        // Only add signature headers for standard format
        if ($webhook->format->usesSignature()) {
            $signature = $this->sign($payload, $webhook->secret);
            $headers['X-Webhook-Signature'] = $signature;
            $headers['X-Webhook-Event'] = $eventType->value;
            $headers['X-Webhook-Timestamp'] = $timestamp;
        }

        $startTime = microtime(true);

        try {
            $response = Http::timeout(10)
                ->withHeaders($headers)
                ->post($webhook->url, $payload);

            $durationMs = (int) ((microtime(true) - $startTime) * 1000);

            if ($response->successful()) {
                return WebhookDeliveryResult::success(
                    status: $response->status(),
                    body: Str::limit($response->body(), 2000),
                    durationMs: $durationMs,
                );
            }

            return WebhookDeliveryResult::failure(
                error: "HTTP {$response->status()}: ".Str::limit($response->body(), 500),
                durationMs: $durationMs,
                status: $response->status(),
                body: Str::limit($response->body(), 2000),
            );
        } catch (Exception $e) {
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);

            Log::warning('Webhook delivery failed', [
                'webhook_id' => $webhook->id,
                'url' => $webhook->url,
                'event' => $eventType->value,
                'error' => $e->getMessage(),
            ]);

            return WebhookDeliveryResult::failure(
                error: $e->getMessage(),
                durationMs: $durationMs,
            );
        }
    }

    /**
     * Send a test webhook.
     */
    public function sendTest(Webhook $webhook): WebhookDeliveryResult
    {
        $testData = [
            'test' => true,
            'message' => 'This is a test webhook delivery from FluxDesk',
            'ticket' => [
                'id' => 0,
                'ticket_number' => 'TEST-0001',
                'subject' => 'Test Ticket',
                'url' => url('/inbox/0'),
                'status' => ['id' => 1, 'name' => 'Open'],
                'priority' => ['id' => 1, 'name' => 'Normal'],
                'assigned_to' => null,
                'created_at' => now()->toIso8601String(),
            ],
            'contact' => [
                'id' => 0,
                'name' => 'Test Contact',
                'email' => 'test@example.com',
            ],
        ];

        return $this->deliver($webhook, WebhookEvent::TicketCreated, $testData);
    }
}
