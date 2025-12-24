<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\UpdateSettingsRequest;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(private OrganizationContext $organizationContext) {}

    /**
     * General settings page (Algemeen)
     */
    public function index(): Response
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;
        $user = auth()->user();

        return Inertia::render('organization/settings', [
            'organization' => $organization,
            'settings' => $settings->toArray(),
            'canSetSystemDefault' => $user && $user->isSuperAdmin(),
        ]);
    }

    /**
     * Update general settings
     */
    public function update(UpdateSettingsRequest $request): RedirectResponse
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;
        $user = auth()->user();

        $data = $request->validated();

        // Handle timezone update
        if (isset($data['timezone'])) {
            $settings->update(['timezone' => $data['timezone']]);
        }

        // Handle system default toggle (super admin only)
        if (isset($data['is_system_default']) && $user && $user->isSuperAdmin()) {
            if ($data['is_system_default']) {
                $organization->markAsSystemDefault();
            } else {
                $organization->unmarkAsSystemDefault();
            }
        }

        return back()->with('success', 'Instellingen opgeslagen.');
    }

    /**
     * Branding page (Huisstijl)
     */
    public function branding(): Response
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        return Inertia::render('organization/branding', [
            'organization' => $organization,
            'settings' => $settings->toArray(),
        ]);
    }

    /**
     * Update branding settings
     */
    public function updateBranding(Request $request): RedirectResponse
    {
        $request->validate([
            'primary_color' => ['nullable', 'string', 'max:7'],
            'secondary_color' => ['nullable', 'string', 'max:7'],
            'accent_color' => ['nullable', 'string', 'max:7'],
            'email_background_color' => ['nullable', 'string', 'max:7'],
        ]);

        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        $settings->update($request->only([
            'primary_color',
            'secondary_color',
            'accent_color',
            'email_background_color',
        ]));

        return back()->with('success', 'Huisstijl opgeslagen.');
    }

    /**
     * Ticket numbers page (Ticketnummers)
     */
    public function ticketNumbers(): Response
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        return Inertia::render('organization/ticket-numbers', [
            'organization' => $organization,
            'settings' => array_merge($settings->toArray(), [
                'preview_ticket_number' => $settings->previewTicketNumber(),
            ]),
        ]);
    }

    /**
     * Update ticket number settings
     */
    public function updateTicketNumbers(Request $request): RedirectResponse
    {
        $request->validate([
            'ticket_prefix' => ['nullable', 'string', 'max:10'],
            'ticket_number_format' => ['nullable', 'string', 'max:50'],
            'use_random_numbers' => ['nullable', 'boolean'],
            'random_number_length' => ['nullable', 'integer', 'min:4', 'max:12'],
        ]);

        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        $settings->update($request->only([
            'ticket_prefix',
            'ticket_number_format',
            'use_random_numbers',
            'random_number_length',
        ]));

        return back()->with('success', 'Ticketnummers opgeslagen.');
    }

    /**
     * Portal page (Klantenportaal)
     */
    public function portal(): Response
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        return Inertia::render('organization/portal', [
            'organization' => $organization,
            'settings' => $settings->toArray(),
        ]);
    }

    /**
     * Update portal settings
     */
    public function updatePortal(Request $request): RedirectResponse
    {
        $request->validate([
            'slug' => ['nullable', 'string', 'max:50', 'regex:/^[a-z0-9-]+$/'],
        ]);

        $organization = $this->organizationContext->organization();

        if ($request->has('slug')) {
            $organization->update(['slug' => $request->slug]);
        }

        return back()->with('success', 'Portaalinstellingen opgeslagen.');
    }

    public function uploadLogo(Request $request): RedirectResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        if ($settings->logo_path) {
            Storage::disk('public')->delete($settings->logo_path);
        }

        $path = $request->file('logo')->store('logos', 'public');
        $settings->update(['logo_path' => $path]);

        return back()->with('success', 'Logo geupload.');
    }

    public function deleteLogo(): RedirectResponse
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        if ($settings->logo_path) {
            Storage::disk('public')->delete($settings->logo_path);
            $settings->update(['logo_path' => null]);
        }

        return back()->with('success', 'Logo verwijderd.');
    }

    public function uploadEmailLogo(Request $request): RedirectResponse
    {
        $request->validate([
            'email_logo' => ['required', 'image', 'max:2048'],
        ]);

        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        if ($settings->email_logo_path) {
            Storage::disk('public')->delete($settings->email_logo_path);
        }

        $path = $request->file('email_logo')->store('logos', 'public');
        $settings->update(['email_logo_path' => $path]);

        return back()->with('success', 'E-mail logo geupload.');
    }

    public function deleteEmailLogo(): RedirectResponse
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        if ($settings->email_logo_path) {
            Storage::disk('public')->delete($settings->email_logo_path);
            $settings->update(['email_logo_path' => null]);
        }

        return back()->with('success', 'E-mail logo verwijderd.');
    }
}
