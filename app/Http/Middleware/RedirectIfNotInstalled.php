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
     * Redirects to the installation wizard if the application hasn't been installed yet.
     * This provides a seamless first-run experience where users just need to visit
     * the application URL and are automatically guided to setup.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip if already on an install route
        if ($request->is('install*')) {
            return $next($request);
        }

        // Skip if application is already installed
        if (config('app.installed')) {
            return $next($request);
        }

        // Redirect to installation wizard
        return redirect('/install');
    }
}
