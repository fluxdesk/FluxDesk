<?php

use App\Http\Middleware\EnsureContactAuthenticated;
use App\Http\Middleware\EnsureHasOrganization;
use App\Http\Middleware\EnsureOrganizationAdmin;
use App\Http\Middleware\EnsureOrganizationMember;
use App\Http\Middleware\EnsurePortalEnabled;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\HandlePortalInertiaRequests;
use App\Http\Middleware\RedirectIfNotInstalled;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\SetOrganizationContext;
use App\Http\Middleware\SetPortalLocale;
use App\Http\Middleware\SetPortalOrganizationContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            /*
            |--------------------------------------------------------------------------
            | Rate Limiters
            |--------------------------------------------------------------------------
            */
            RateLimiter::for('portal-magic-link', fn (Request $request) => Limit::perHour(5)->by($request->input('email') ?? $request->ip())
            );

            RateLimiter::for('portal-tickets', fn (Request $request) => Limit::perHour(20)->by($request->ip())
            );

            RateLimiter::for('contact-creation', fn (Request $request) => Limit::perHour(30)->by($request->ip())
            );

            // Portal routes with custom middleware stack (not using full 'web' group)
            Route::middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                ShareErrorsFromSession::class,
                ValidateCsrfToken::class,
                SubstituteBindings::class,
                RedirectIfNotInstalled::class,
                SetPortalOrganizationContext::class,
                HandleAppearance::class,
                SetPortalLocale::class,
                HandlePortalInertiaRequests::class,
                AddLinkHeadersForPreloadedAssets::class,
            ])->group(base_path('routes/portal.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(prepend: [
            RedirectIfNotInstalled::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            SetOrganizationContext::class,
        ]);

        $middleware->alias([
            'org.context' => SetOrganizationContext::class,
            'org.required' => EnsureHasOrganization::class,
            'org.member' => EnsureOrganizationMember::class,
            'org.admin' => EnsureOrganizationAdmin::class,
            'contact.auth' => EnsureContactAuthenticated::class,
            'portal.enabled' => EnsurePortalEnabled::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
