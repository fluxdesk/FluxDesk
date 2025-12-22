<?php

namespace App\Notifications\Tickets;

use App\Channels\TicketEmailChannel;
use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Base class for ticket-related notifications.
 *
 * All ticket notifications extend this class to share common functionality
 * and ensure consistent behavior across the notification system.
 */
abstract class BaseTicketNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Ticket $ticket,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return [TicketEmailChannel::class];
    }

    /**
     * Get the ticket email representation.
     *
     * This method should be implemented by child classes to return
     * the email data for the TicketEmailChannel.
     *
     * @return array{
     *     view: string,
     *     subject: string,
     *     data: array<string, mixed>,
     *     to_email?: string,
     *     to_name?: string,
     *     cc?: array<array{email: string, name: string|null}>
     * }|null
     */
    abstract public function toTicketEmail(object $notifiable): ?array;

    /**
     * Get the truncated message body for preview.
     */
    protected function getMessagePreview(string $body, int $length = 200): string
    {
        $preview = strip_tags($body);
        if (strlen($preview) > $length) {
            return substr($preview, 0, $length).'...';
        }

        return $preview;
    }
}
