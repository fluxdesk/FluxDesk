<?php

namespace App\Enums;

enum WebhookEvent: string
{
    case TicketCreated = 'ticket.created';
    case TicketStatusChanged = 'ticket.status_changed';
    case TicketPriorityChanged = 'ticket.priority_changed';
    case TicketAssigned = 'ticket.assigned';
    case TicketSlaChanged = 'ticket.sla_changed';
    case MessageCreated = 'message.created';
    case ReplyReceived = 'message.reply_received';

    public function label(): string
    {
        return match ($this) {
            self::TicketCreated => 'Nieuw ticket',
            self::TicketStatusChanged => 'Status gewijzigd',
            self::TicketPriorityChanged => 'Prioriteit gewijzigd',
            self::TicketAssigned => 'Ticket toegewezen',
            self::TicketSlaChanged => 'SLA gewijzigd',
            self::MessageCreated => 'Nieuw bericht',
            self::ReplyReceived => 'Klantreactie ontvangen',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::TicketCreated => 'Wordt verzonden wanneer een nieuw ticket wordt aangemaakt',
            self::TicketStatusChanged => 'Wordt verzonden wanneer de status van een ticket verandert',
            self::TicketPriorityChanged => 'Wordt verzonden wanneer de prioriteit van een ticket verandert',
            self::TicketAssigned => 'Wordt verzonden wanneer een ticket wordt toegewezen aan een medewerker',
            self::TicketSlaChanged => 'Wordt verzonden wanneer de SLA van een ticket verandert',
            self::MessageCreated => 'Wordt verzonden wanneer er een nieuw bericht aan een ticket wordt toegevoegd',
            self::ReplyReceived => 'Wordt verzonden wanneer een klant reageert op een ticket',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::TicketCreated => 'ticket-plus',
            self::TicketStatusChanged => 'circle-dot',
            self::TicketPriorityChanged => 'flag',
            self::TicketAssigned => 'user-check',
            self::TicketSlaChanged => 'clock',
            self::MessageCreated => 'message-square',
            self::ReplyReceived => 'reply',
        };
    }

    /**
     * Get all events as options for the frontend.
     *
     * @return array<array{value: string, label: string, description: string}>
     */
    public static function toOptions(): array
    {
        return array_map(
            fn (self $event) => [
                'value' => $event->value,
                'label' => $event->label(),
                'description' => $event->description(),
            ],
            self::cases()
        );
    }
}
