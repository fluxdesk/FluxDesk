<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
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

        $user = $request->user();

        if ($user && $user->locale && in_array($user->locale, $availableLocales, true)) {
            return $user->locale;
        }

        return config('app.locale', 'en');
    }
}
