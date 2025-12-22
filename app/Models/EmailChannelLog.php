<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailChannelLog extends Model
{
    protected $fillable = [
        'email_channel_id',
        'type',
        'status',
        'subject',
        'recipient',
        'ticket_id',
        'message_id',
        'emails_processed',
        'tickets_created',
        'messages_added',
        'error',
        'metadata',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function emailChannel(): BelongsTo
    {
        return $this->belongsTo(EmailChannel::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    /**
     * Log a sync event.
     */
    public static function logSync(
        int $emailChannelId,
        string $status,
        int $emailsProcessed = 0,
        int $ticketsCreated = 0,
        int $messagesAdded = 0,
        ?string $error = null,
        ?array $metadata = null
    ): self {
        return self::create([
            'email_channel_id' => $emailChannelId,
            'type' => 'sync',
            'status' => $status,
            'emails_processed' => $emailsProcessed,
            'tickets_created' => $ticketsCreated,
            'messages_added' => $messagesAdded,
            'error' => $error,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Log a send event.
     */
    public static function logSend(
        int $emailChannelId,
        string $status,
        ?string $subject = null,
        ?string $recipient = null,
        ?int $ticketId = null,
        ?int $messageId = null,
        ?string $error = null,
        ?array $metadata = null
    ): self {
        return self::create([
            'email_channel_id' => $emailChannelId,
            'type' => 'send',
            'status' => $status,
            'subject' => $subject,
            'recipient' => $recipient,
            'ticket_id' => $ticketId,
            'message_id' => $messageId,
            'error' => $error,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Get description for the log entry.
     */
    public function getDescriptionAttribute(): string
    {
        return match ($this->type) {
            'sync' => $this->getSyncDescription(),
            'send' => $this->getSendDescription(),
            default => ucfirst($this->type),
        };
    }

    private function getSyncDescription(): string
    {
        if ($this->status === 'failed') {
            return 'Synchronisatie mislukt';
        }

        $parts = [];
        if ($this->emails_processed > 0) {
            $parts[] = "{$this->emails_processed} e-mail(s) verwerkt";
        }
        if ($this->tickets_created > 0) {
            $parts[] = "{$this->tickets_created} ticket(s) aangemaakt";
        }
        if ($this->messages_added > 0) {
            $parts[] = "{$this->messages_added} antwoord(en) toegevoegd";
        }

        return count($parts) > 0
            ? implode(', ', $parts)
            : 'Geen nieuwe e-mails';
    }

    private function getSendDescription(): string
    {
        if ($this->status === 'failed') {
            return "Verzenden naar {$this->recipient} mislukt";
        }

        return "E-mail verzonden naar {$this->recipient}";
    }

    /**
     * Get status badge color.
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'success' => 'green',
            'failed' => 'red',
            'partial' => 'yellow',
            default => 'gray',
        };
    }

    /**
     * Get type label.
     */
    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'sync' => 'Synchronisatie',
            'send' => 'Verzonden',
            'receive' => 'Ontvangen',
            default => ucfirst($this->type),
        };
    }
}
