<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Company entity that can have multiple contacts linked to it.
 *
 * @property int $id
 * @property int $organization_id
 * @property string $name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $website
 * @property string|null $address
 * @property string|null $notes
 * @property int|null $sla_id
 * @property array<string>|null $domains
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * @property \Carbon\Carbon|null $deleted_at
 * @property-read Organization $organization
 * @property-read Sla|null $sla
 * @property-read \Illuminate\Database\Eloquent\Collection<Contact> $contacts
 * @property-read int $contacts_count
 * @property-read int $tickets_count
 */
class Company extends Model
{
    use BelongsToOrganization;
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'name',
        'email',
        'phone',
        'website',
        'address',
        'notes',
        'sla_id',
        'domains',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'domains' => 'array',
        ];
    }

    /**
     * Get the organization that owns this company.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the SLA associated with this company.
     */
    public function sla(): BelongsTo
    {
        return $this->belongsTo(Sla::class);
    }

    /**
     * Get all contacts linked to this company.
     */
    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    /**
     * Get all tickets from contacts belonging to this company.
     */
    public function tickets(): HasManyThrough
    {
        return $this->hasManyThrough(Ticket::class, Contact::class);
    }

    /**
     * Get the effective SLA for this company.
     * Returns the company's assigned SLA, or falls back to the organization's default SLA.
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
}
