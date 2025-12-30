<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfNotInstalled
{
    /**
     * Handle an incoming request.
     *
     * Shows an error page if the application hasn't been installed yet,
     * instructing the user to run the CLI install command.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('app.installed')) {
            abort(503, 'FluxDesk is not installed. Run: php artisan fluxdesk:install');
        }

        return $next($request);
    }
}
