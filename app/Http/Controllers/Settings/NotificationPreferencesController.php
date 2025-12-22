<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\UserNotificationPreference;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationPreferencesController extends Controller
{
    public function __construct(
        private OrganizationContext $organizationContext,
    ) {}

    /**
     * Show the notification preferences form.
     */
    public function edit(): Response
    {
        $organization = $this->organizationContext->get();
        $user = auth()->user();

        $preferences = $user->notificationPreferencesFor($organization->id);

        // If no preferences exist yet, use defaults (all enabled)
        $preferencesData = $preferences ? $preferences->toArray() : [
            'notify_new_ticket' => true,
            'notify_contact_reply' => true,
            'notify_internal_note' => true,
            'notify_ticket_assigned' => true,
            'notify_sla_breach_warning' => true,
            'notify_when_mentioned' => true,
        ];

        return Inertia::render('settings/notifications', [
            'preferences' => $preferencesData,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
        ]);
    }

    /**
     * Update the notification preferences.
     */
    public function update(Request $request): RedirectResponse
    {
        $organization = $this->organizationContext->get();
        $user = auth()->user();

        $validated = $request->validate([
            'notify_new_ticket' => ['required', 'boolean'],
            'notify_contact_reply' => ['required', 'boolean'],
            'notify_internal_note' => ['required', 'boolean'],
            'notify_ticket_assigned' => ['required', 'boolean'],
            'notify_sla_breach_warning' => ['required', 'boolean'],
            'notify_when_mentioned' => ['required', 'boolean'],
        ]);

        UserNotificationPreference::updateOrCreate(
            [
                'user_id' => $user->id,
                'organization_id' => $organization->id,
            ],
            $validated
        );

        return back()->with('success', 'Notificatie-instellingen opgeslagen');
    }
}
