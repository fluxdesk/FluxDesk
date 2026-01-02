<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Contact extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\ContactFactory> */
    use BelongsToOrganization, HasFactory, Notifiable;

    protected $fillable = [
        'organization_id',
        'company_id',
        'email',
        'locale',
        'name',
        'phone',
        'instagram_id',
        'instagram_username',
        'facebook_id',
        'whatsapp_phone',
        'wechat_id',
        'avatar_url',
        'company',
        'metadata',
        'sla_id',
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

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function accessTokens(): HasMany
    {
        return $this->hasMany(ContactAccessToken::class);
    }

    public function authTokens(): HasMany
    {
        return $this->hasMany(ContactAuthToken::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function sla(): BelongsTo
    {
        return $this->belongsTo(Sla::class);
    }

    public function companyRelation(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    /**
     * Get the effective SLA for this contact.
     * Returns the contact's assigned SLA, or falls back to the organization's default SLA.
     */
    public function getEffectiveSla(): ?Sla
    {
        if ($this->sla_id) {
            return $this->sla;
        }

        return Sla::query()
            ->where('organization_id', $this->organization_id)
            ->where('is_default', true)
            ->first();
    }

    public function getDisplayNameAttribute(): string
    {
        return $this->name ?? $this->email;
    }
}
