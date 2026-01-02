<?php

namespace App\Models;

use App\Enums\EmailStatus;
use App\Enums\MessageType;
use App\Enums\MessagingStatus;
use App\Enums\RecipientType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Message extends Model
{
    /** @use HasFactory<\Database\Factories\MessageFactory> */
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'user_id',
        'contact_id',
        'type',
        'body',
        'body_html',
        'raw_content',
        'is_from_contact',
        'ai_assisted',
        'email_message_id',
        'email_provider_id',
        'email_in_reply_to',
        'email_references',
        'email_status',
        'email_error',
        'email_sent_at',
        'messaging_provider_id',
        'messaging_status',
        'messaging_error',
        'messaging_sent_at',
        'messaging_delivered_at',
        'messaging_read_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => MessageType::class,
            'is_from_contact' => 'boolean',
            'ai_assisted' => 'boolean',
            'email_status' => EmailStatus::class,
            'email_sent_at' => 'datetime',
            'messaging_status' => MessagingStatus::class,
            'messaging_sent_at' => 'datetime',
            'messaging_delivered_at' => 'datetime',
            'messaging_read_at' => 'datetime',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(MessageRecipient::class);
    }

    public function toRecipients(): HasMany
    {
        return $this->hasMany(MessageRecipient::class)->where('type', RecipientType::To);
    }

    public function ccRecipients(): HasMany
    {
        return $this->hasMany(MessageRecipient::class)->where('type', RecipientType::Cc);
    }

    public function bccRecipients(): HasMany
    {
        return $this->hasMany(MessageRecipient::class)->where('type', RecipientType::Bcc);
    }

    /**
     * Get non-inline attachments (regular file attachments).
     */
    public function fileAttachments(): HasMany
    {
        return $this->hasMany(Attachment::class)->where('is_inline', false);
    }

    /**
     * Get inline attachments (embedded images).
     */
    public function inlineAttachments(): HasMany
    {
        return $this->hasMany(Attachment::class)->where('is_inline', true);
    }

    /**
     * Get the users mentioned in this message.
     */
    public function mentionedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'message_mentions')
            ->withTimestamps();
    }

    public function getAuthorNameAttribute(): string
    {
        if ($this->is_from_contact) {
            return $this->contact?->display_name ?? 'Unknown';
        }

        return $this->user?->name ?? 'System';
    }

    public function isReply(): bool
    {
        return $this->type === MessageType::Reply;
    }

    public function isNote(): bool
    {
        return $this->type === MessageType::Note;
    }

    public function isSystem(): bool
    {
        return $this->type === MessageType::System;
    }

    public function isVisibleToContact(): bool
    {
        return $this->type->isVisibleToContact();
    }

    /**
     * Check if email is pending to be sent.
     */
    public function isEmailPending(): bool
    {
        return $this->email_status === EmailStatus::Pending;
    }

    /**
     * Check if email was sent successfully.
     */
    public function isEmailSent(): bool
    {
        return $this->email_status === EmailStatus::Sent;
    }

    /**
     * Check if email delivery failed.
     */
    public function isEmailFailed(): bool
    {
        return $this->email_status === EmailStatus::Failed;
    }

    /**
     * Mark the email as sent.
     */
    public function markEmailSent(?string $messageId = null): void
    {
        $data = [
            'email_status' => EmailStatus::Sent,
            'email_sent_at' => now(),
            'email_error' => null,
        ];

        if ($messageId) {
            $data['email_message_id'] = $messageId;
        }

        $this->update($data);
    }

    /**
     * Mark the email as failed.
     */
    public function markEmailFailed(string $error): void
    {
        $this->update([
            'email_status' => EmailStatus::Failed,
            'email_error' => $error,
        ]);
    }

    /**
     * Mark the email as pending.
     */
    public function markEmailPending(): void
    {
        $this->update([
            'email_status' => EmailStatus::Pending,
            'email_error' => null,
        ]);
    }

    /**
     * Check if messaging is pending to be sent.
     */
    public function isMessagingPending(): bool
    {
        return $this->messaging_status === MessagingStatus::Pending;
    }

    /**
     * Check if messaging was sent successfully.
     */
    public function isMessagingSent(): bool
    {
        return in_array($this->messaging_status, [
            MessagingStatus::Sent,
            MessagingStatus::Delivered,
            MessagingStatus::Read,
        ]);
    }

    /**
     * Check if messaging delivery failed.
     */
    public function isMessagingFailed(): bool
    {
        return $this->messaging_status === MessagingStatus::Failed;
    }

    /**
     * Mark the messaging as sent.
     */
    public function markMessagingSent(?string $providerId = null): void
    {
        $data = [
            'messaging_status' => MessagingStatus::Sent,
            'messaging_sent_at' => now(),
            'messaging_error' => null,
        ];

        if ($providerId) {
            $data['messaging_provider_id'] = $providerId;
        }

        $this->update($data);
    }

    /**
     * Mark the messaging as delivered.
     */
    public function markMessagingDelivered(): void
    {
        $this->update([
            'messaging_status' => MessagingStatus::Delivered,
            'messaging_delivered_at' => now(),
        ]);
    }

    /**
     * Mark the messaging as read.
     */
    public function markMessagingRead(): void
    {
        $this->update([
            'messaging_status' => MessagingStatus::Read,
            'messaging_read_at' => now(),
        ]);
    }

    /**
     * Mark the messaging as failed.
     */
    public function markMessagingFailed(string $error): void
    {
        $this->update([
            'messaging_status' => MessagingStatus::Failed,
            'messaging_error' => $error,
        ]);
    }

    /**
     * Mark the messaging as pending.
     */
    public function markMessagingPending(): void
    {
        $this->update([
            'messaging_status' => MessagingStatus::Pending,
            'messaging_error' => null,
        ]);
    }
}
