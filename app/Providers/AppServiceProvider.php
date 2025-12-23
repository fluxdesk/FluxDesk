<?php

namespace App\Providers;

use App\Integrations\IntegrationManager;
use App\Models\Message;
use App\Models\Organization;
use App\Models\Ticket;
use App\Observers\MessageObserver;
use App\Observers\OrganizationObserver;
use App\Observers\TicketObserver;
use App\Services\OrganizationContext;
use App\Services\PortalOrganizationContext;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(OrganizationContext::class);
        $this->app->scoped(PortalOrganizationContext::class);
        $this->app->singleton(IntegrationManager::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Organization::observe(OrganizationObserver::class);
        Ticket::observe(TicketObserver::class);
        Message::observe(MessageObserver::class);
    }
}
