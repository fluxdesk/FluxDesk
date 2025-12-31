<?php

namespace App\Http\Middleware;

use App\Services\PortalOrganizationContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SetPortalLocale
{
    public function __construct(
        private PortalOrganizationContext $portalContext
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->determineLocale($request);

        App::setLocale($locale);

        return $next($request);
    }

    private function determineLocale(Request $request): string
    {
        /** @var array<string> $availableLocales */
        $availableLocales = config('app.available_locales', ['en']);

        // 1. Check authenticated contact's preference
        $contact = Auth::guard('contact')->user();
        if ($contact && $contact->locale && in_array($contact->locale, $availableLocales, true)) {
            return $contact->locale;
        }

        // 2. Check session-stored locale (for unauthenticated portal visitors)
        $sessionLocale = $request->session()->get('portal_locale');
        if ($sessionLocale && in_array($sessionLocale, $availableLocales, true)) {
            return $sessionLocale;
        }

        // 3. Fall back to organization's email locale
        $organization = $this->portalContext->get();
        if ($organization?->settings?->email_locale && in_array($organization->settings->email_locale, $availableLocales, true)) {
            return $organization->settings->email_locale;
        }

        // 4. Default locale
        return config('app.locale', 'en');
    }
}
