<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNotInstalled
{
    /**
     * Handle an incoming request.
     *
     * Block access to installation routes if the application is already installed.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (config('app.installed')) {
            // If trying to access install routes when already installed, redirect to home
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Application is already installed.',
                ], 403);
            }

            return redirect('/')->with('error', 'Application is already installed.');
        }

        return $next($request);
    }
}
