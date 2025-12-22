<?php

namespace App\Notifications\Tickets;

use App\Channels\TicketEmailChannel;
use App\Models\Message;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Notification sent when a user is mentioned in a ticket message.
 */
class MentionNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Ticket $ticket,
        public Message $message,
        public User $mentionedBy,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', TicketEmailChannel::class];
    }

    /**
     * Get the database representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'mention',
            'ticket_id' => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'ticket_subject' => $this->ticket->subject,
            'message_id' => $this->message->id,
            'message_preview' => $this->getMessagePreview($this->message->body ?? $this->message->body_html ?? '', 100),
            'mentioned_by_id' => $this->mentionedBy->id,
            'mentioned_by_name' => $this->mentionedBy->name,
        ];
    }

    /**
     * Get the ticket email representation.
     */
    public function toTicketEmail(object $notifiable): ?array
    {
        if (! $notifiable instanceof User) {
            return null;
        }

        return [
            'view' => 'emails.tickets.mention',
            'subject' => "Je bent vermeld in ticket #{$this->ticket->ticket_number}",
            'data' => [
                'user' => $notifiable,
                'message' => $this->message,
                'mentionedBy' => $this->mentionedBy,
                'actionUrl' => route('inbox.show', $this->ticket),
            ],
        ];
    }

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
