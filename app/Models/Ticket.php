<?php

namespace App\Models;

use App\Enums\TicketChannel;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    /** @use HasFactory<\Database\Factories\TicketFactory> */
    use BelongsToOrganization, HasFactory;

    protected $fillable = [
        'organization_id',
        'ticket_number',
        'subject',
        'contact_id',
        'status_id',
        'priority_id',
        'sla_id',
        'department_id',
        'assigned_to',
        'channel',
        'email_channel_id',
        'email_thread_id',
        'email_thread_index',
        'email_original_message_id',
        'email_sent_message_id',
        'messaging_channel_id',
        'messaging_conversation_id',
        'messaging_participant_id',
        'folder_id',
        'first_response_at',
        'sla_first_response_due_at',
        'sla_resolution_due_at',
        'resolved_at',
        'closed_at',
    ];

    protected $appends = ['is_read'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'channel' => TicketChannel::class,
            'first_response_at' => 'datetime',
            'sla_first_response_due_at' => 'datetime',
            'sla_resolution_due_at' => 'datetime',
            'resolved_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(Status::class);
    }

    public function priority(): BelongsTo
    {
        return $this->belongsTo(Priority::class);
    }

    public function sla(): BelongsTo
    {
        return $this->belongsTo(Sla::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(TicketFolder::class, 'folder_id');
    }

    /**
     * Get the email channel this ticket originated from.
     */
    public function emailChannel(): BelongsTo
    {
        return $this->belongsTo(EmailChannel::class);
    }

    /**
     * Get the messaging channel this ticket originated from.
     */
    public function messagingChannel(): BelongsTo
    {
        return $this->belongsTo(MessagingChannel::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }

    public function latestMessage(): HasMany
    {
        return $this->hasMany(Message::class)->latest()->limit(1);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(TicketActivity::class)->orderBy('created_at', 'desc');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'ticket_tag');
    }

    public function slaRemindersSent(): HasMany
    {
        return $this->hasMany(SlaReminderSent::class);
    }

    /**
     * CC contacts who should receive copies of replies.
     */
    public function ccContacts(): HasMany
    {
        return $this->hasMany(TicketCcContact::class);
    }

    /**
     * Add a CC contact to this ticket if not already present.
     * Ignores agents (users) and the primary contact.
     */
    public function addCcContact(string $email, ?string $name = null): ?TicketCcContact
    {
        $email = strtolower(trim($email));

        // Skip if it's the primary contact's email
        if ($this->contact && strtolower($this->contact->email) === $email) {
            return null;
        }

        // Skip if it's an agent's email (any user in the organization)
        $isAgent = User::whereHas('organizations', function ($q) {
            $q->where('organizations.id', $this->organization_id);
        })->whereRaw('LOWER(email) = ?', [$email])->exists();

        if ($isAgent) {
            return null;
        }

        // Check if contact already exists in the organization
        $contact = Contact::where('organization_id', $this->organization_id)
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        // Add or update CC contact
        return TicketCcContact::updateOrCreate(
            [
                'ticket_id' => $this->id,
                'email' => $email,
            ],
            [
                'name' => $name,
                'contact_id' => $contact?->id,
            ]
        );
    }

    /**
     * Users who have read this ticket.
     */
    public function readers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'ticket_reads')
            ->withPivot('read_at');
    }

    /**
     * Check if the current user has read this ticket.
     */
    public function getIsReadAttribute(): bool
    {
        if (! auth()->check()) {
            return false;
        }

        // If readers relation is already loaded, use it
        if ($this->relationLoaded('readers')) {
            return $this->readers->contains('id', auth()->id());
        }

        // Otherwise, check the pivot table directly
        return $this->readers()->where('user_id', auth()->id())->exists();
    }

    public function scopeOpen($query)
    {
        return $query->whereHas('status', fn ($q) => $q->where('is_closed', false));
    }

    public function scopeClosed($query)
    {
        return $query->whereHas('status', fn ($q) => $q->where('is_closed', true));
    }

    public function scopeUnassigned($query)
    {
        return $query->whereNull('assigned_to');
    }

    public function scopeAssignedTo($query, User $user)
    {
        return $query->where('assigned_to', $user->id);
    }

    public function scopeOverdue($query)
    {
        return $query->where(function ($q) {
            $q->whereNotNull('sla_first_response_due_at')
                ->whereNull('first_response_at')
                ->where('sla_first_response_due_at', '<', now());
        })->orWhere(function ($q) {
            $q->whereNotNull('sla_resolution_due_at')
                ->whereNull('resolved_at')
                ->where('sla_resolution_due_at', '<', now());
        });
    }

    public function scopeUnread($query)
    {
        return $query->whereDoesntHave('readers', function ($q) {
            $q->where('user_id', auth()->id());
        });
    }

    public function scopeRead($query)
    {
        return $query->whereHas('readers', function ($q) {
            $q->where('user_id', auth()->id());
        });
    }

    /**
     * Scope to get tickets that originated from email.
     */
    public function scopeFromEmail($query)
    {
        return $query->whereNotNull('email_channel_id');
    }

    /**
     * Scope to get tickets that originated from messaging channels.
     */
    public function scopeFromMessaging($query)
    {
        return $query->whereNotNull('messaging_channel_id');
    }

    /**
     * Check if this ticket originated from an email.
     */
    public function isFromEmail(): bool
    {
        return $this->email_channel_id !== null;
    }

    /**
     * Check if this ticket originated from a messaging channel.
     */
    public function isFromMessaging(): bool
    {
        return $this->messaging_channel_id !== null;
    }

    public function markAsRead(): void
    {
        if (! auth()->check()) {
            return;
        }

        $this->readers()->syncWithoutDetaching([auth()->id() => ['read_at' => now()]]);
    }

    public function markAsUnread(): void
    {
        if (! auth()->check()) {
            return;
        }

        $this->readers()->detach(auth()->id());
    }

    public function isOpen(): bool
    {
        return ! $this->status->is_closed;
    }

    public function isClosed(): bool
    {
        return $this->status->is_closed;
    }

    public function isOverdue(): bool
    {
        if ($this->sla_first_response_due_at && ! $this->first_response_at) {
            if ($this->sla_first_response_due_at->isPast()) {
                return true;
            }
        }

        if ($this->sla_resolution_due_at && ! $this->resolved_at) {
            if ($this->sla_resolution_due_at->isPast()) {
                return true;
            }
        }

        return false;
    }
}
