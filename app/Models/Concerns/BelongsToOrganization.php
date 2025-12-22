<?php

namespace App\Models\Concerns;

use App\Models\Organization;
use App\Models\Scopes\OrganizationScope;
use App\Services\OrganizationContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @mixin Model
 */
trait BelongsToOrganization
{
    public static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope(new OrganizationScope);

        static::creating(function (Model $model) {
            if (! $model->organization_id) {
                $model->organization_id = app(OrganizationContext::class)->id();
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function scopeForOrganization($query, int|Organization $organization): void
    {
        $organizationId = $organization instanceof Organization ? $organization->id : $organization;

        $query->withoutGlobalScope(OrganizationScope::class)
            ->where($this->getTable().'.organization_id', $organizationId);
    }
}
