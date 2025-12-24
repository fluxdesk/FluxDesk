<?php

namespace App\Services;

use App\Models\Organization;
use Illuminate\Http\Request;

class TenantResolver
{
    /**
     * Resolve the organization from the request.
     *
     * Resolution order:
     * 1. URL slug parameter
     * 2. Custom domain
     * 3. System default organization
     */
    public function resolve(Request $request): ?Organization
    {
        // 1. Check URL slug parameter
        if ($slug = $request->route('organization')) {
            return $this->resolveBySlug($slug);
        }

        // 2. Check custom domain
        if ($org = $this->resolveByDomain($request->getHost())) {
            return $org;
        }

        // 3. Fall back to system default
        return Organization::systemDefault();
    }

    /**
     * Resolve organization by slug.
     */
    protected function resolveBySlug(mixed $slug): ?Organization
    {
        if ($slug instanceof Organization) {
            return $slug;
        }

        return Organization::where('slug', $slug)->first();
    }

    /**
     * Resolve organization by custom domain.
     */
    protected function resolveByDomain(string $host): ?Organization
    {
        // Normalize the host (remove www. prefix if present)
        $normalizedHost = preg_replace('/^www\./i', '', $host);

        return Organization::whereHas('settings', function ($q) use ($host, $normalizedHost) {
            $q->where('custom_domain', $host)
                ->orWhere('custom_domain', $normalizedHost);
        })->first();
    }
}
