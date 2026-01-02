<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessagingChannelLog extends Model
{
    protected $fillable = [
        'messaging_channel_id',
        'type',
        'status',
        'ticket_id',
        'message_id',
        'messages_received',
        'messages_sent',
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
            'messages_received' => 'integer',
            'messages_sent' => 'integer',
        ];
    }

    public function messagingChannel(): BelongsTo
    {
        return $this->belongsTo(MessagingChannel::class);
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
     * Log a webhook event.
     */
    public static function logWebhook(
        int $messagingChannelId,
        string $status,
        int $messagesReceived = 0,
        ?int $ticketId = null,
        ?string $error = null,
        ?array $metadata = null
    ): self {
        return self::create([
            'messaging_channel_id' => $messagingChannelId,
            'type' => 'webhook',
            'status' => $status,
            'messages_received' => $messagesReceived,
            'ticket_id' => $ticketId,
            'error' => $error,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Log a send event.
     */
    public static function logSend(
        int $messagingChannelId,
        string $status,
        ?int $ticketId = null,
        ?int $messageId = null,
        ?string $error = null,
        ?array $metadata = null
    ): self {
        return self::create([
            'messaging_channel_id' => $messagingChannelId,
            'type' => 'send',
            'status' => $status,
            'messages_sent' => $status === 'success' ? 1 : 0,
            'ticket_id' => $ticketId,
            'message_id' => $messageId,
            'error' => $error,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Log an auto-reply event.
     */
    public static function logAutoReply(
        int $messagingChannelId,
        string $status,
        ?int $ticketId = null,
        ?int $messageId = null,
        ?string $error = null,
        ?array $metadata = null
    ): self {
        return self::create([
            'messaging_channel_id' => $messagingChannelId,
            'type' => 'auto_reply',
            'status' => $status,
            'messages_sent' => $status === 'success' ? 1 : 0,
            'ticket_id' => $ticketId,
            'message_id' => $messageId,
            'error' => $error,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Log an error event.
     */
    public static function logError(
        int $messagingChannelId,
        string $error,
        ?int $ticketId = null,
        ?int $messageId = null,
        ?array $metadata = null
    ): self {
        return self::create([
            'messaging_channel_id' => $messagingChannelId,
            'type' => 'error',
            'status' => 'failed',
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
            'webhook' => $this->getWebhookDescription(),
            'send' => $this->getSendDescription(),
            'auto_reply' => $this->getAutoReplyDescription(),
            'error' => $this->error ?? 'Unknown error',
            default => ucfirst($this->type),
        };
    }

    private function getWebhookDescription(): string
    {
        if ($this->status === 'failed') {
            return 'Webhook processing failed';
        }

        if ($this->messages_received > 0) {
            return "{$this->messages_received} message(s) received";
        }

        return 'Webhook processed (no new messages)';
    }

    private function getSendDescription(): string
    {
        if ($this->status === 'failed') {
            return 'Message send failed';
        }

        return 'Message sent successfully';
    }

    private function getAutoReplyDescription(): string
    {
        if ($this->status === 'failed') {
            return 'Auto-reply failed';
        }

        return 'Auto-reply sent successfully';
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
            'webhook' => 'Webhook',
            'send' => 'Sent',
            'auto_reply' => 'Auto-reply',
            'error' => 'Error',
            default => ucfirst($this->type),
        };
    }
}
