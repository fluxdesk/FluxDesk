<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use App\Services\PortalOrganizationContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;

class HandlePortalInertiaRequests extends Middleware
{
    public function __construct(
        protected PortalOrganizationContext $portalContext
    ) {}

    /**
     * The root template that's loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'portal';

    /**
     * Determines the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $contact = Auth::guard('contact')->user();

        // Get organization from portal context or fallback to route parameter
        $organization = $this->portalContext->get();
        if (! $organization) {
            $orgParam = $request->route('organization');
            if ($orgParam instanceof Organization) {
                $organization = $orgParam;
            } elseif (is_string($orgParam)) {
                $organization = Organization::where('slug', $orgParam)->first();
            }
        }

        $organization = $organization?->load('settings');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'contact' => $contact ? [
                'id' => $contact->id,
                'email' => $contact->email,
                'name' => $contact->name,
                'display_name' => $contact->display_name,
                'phone' => $contact->phone,
                'company' => $contact->company,
            ] : null,
            'organization' => $organization ? [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'settings' => $organization->settings ? [
                    'logo_path' => $organization->settings->logo_path,
                    'primary_color' => $organization->settings->primary_color,
                    'secondary_color' => $organization->settings->secondary_color,
                    'accent_color' => $organization->settings->accent_color,
                ] : null,
            ] : null,
            'locale' => App::getLocale(),
            'availableLocales' => config('app.available_locales', ['en']),
        ];
    }
}
