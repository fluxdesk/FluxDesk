<?php

namespace App\Http\Middleware;

use App\Models\Tag;
use App\Models\Ticket;
use App\Models\TicketFolder;
use App\Services\OrganizationContext;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    public function __construct(
        protected OrganizationContext $organizationContext,
    ) {}

    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user,
            ],
            'organization' => fn () => $this->organizationContext->get()?->load('settings'),
            'timezone' => fn () => $this->organizationContext->get()?->settings?->timezone ?? 'UTC',
            'organizations' => fn () => $user?->organizations()->get(['organizations.id', 'organizations.name', 'organizations.slug']) ?? [],
            'isAdmin' => fn () => $user && $this->organizationContext->get() ? $user->isAdminOf($this->organizationContext->get()) : false,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'unreadCount' => fn () => $user && $this->organizationContext->get()
                ? Ticket::unread()->count()
                : 0,
            'folders' => fn () => $user && $this->organizationContext->get()
                ? TicketFolder::withCount('tickets')->orderBy('sort_order')->get()
                : [],
            'inboxCount' => fn () => $user && $this->organizationContext->get()
                ? Ticket::whereNull('folder_id')->count()
                : 0,
            'tags' => fn () => $user && $this->organizationContext->get()
                ? Tag::where(fn ($q) => $q->whereNull('user_id')->orWhere('user_id', $user->id))->orderBy('name')->get()
                : [],
            'locale' => App::getLocale(),
            'availableLocales' => config('app.available_locales', ['en']),
        ];
    }
}
