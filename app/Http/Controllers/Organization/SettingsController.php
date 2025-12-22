<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\UpdateSettingsRequest;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(private OrganizationContext $organizationContext) {}

    public function index(): Response
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;
        $user = auth()->user();

        return Inertia::render('organization/settings', [
            'organization' => $organization,
            'settings' => array_merge($settings->toArray(), [
                'preview_ticket_number' => $settings->previewTicketNumber(),
            ]),
            'canSetSystemDefault' => $user && $user->isSuperAdmin(),
        ]);
    }

    public function update(UpdateSettingsRequest $request): RedirectResponse
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;
        $user = auth()->user();

        $data = $request->validated();

        // Handle slug update on organization (not settings)
        if (isset($data['slug'])) {
            $organization->update(['slug' => $data['slug']]);
            unset($data['slug']);
        }

        // Handle system default toggle (super admin only)
        if (isset($data['is_system_default']) && $user && $user->isSuperAdmin()) {
            if ($data['is_system_default']) {
                $organization->markAsSystemDefault();
            } else {
                $organization->unmarkAsSystemDefault();
            }
            unset($data['is_system_default']);
        }

        if ($request->hasFile('logo')) {
            if ($settings->logo_path) {
                Storage::disk('public')->delete($settings->logo_path);
            }

            $data['logo_path'] = $request->file('logo')->store('logos', 'public');
            unset($data['logo']);
        }

        $settings->update($data);

        return back()->with('success', 'Settings updated successfully.');
    }

    public function uploadLogo(\Illuminate\Http\Request $request): RedirectResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'max:2048'], // Max 2MB
        ]);

        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        // Delete old logo if exists
        if ($settings->logo_path) {
            Storage::disk('public')->delete($settings->logo_path);
        }

        $path = $request->file('logo')->store('logos', 'public');
        $settings->update(['logo_path' => $path]);

        return back()->with('success', 'Logo uploaded successfully.');
    }

    public function deleteLogo(): RedirectResponse
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        if ($settings->logo_path) {
            Storage::disk('public')->delete($settings->logo_path);
            $settings->update(['logo_path' => null]);
        }

        return back()->with('success', 'Logo removed successfully.');
    }

    public function uploadEmailLogo(\Illuminate\Http\Request $request): RedirectResponse
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

        return back()->with('success', 'Email logo uploaded successfully.');
    }

    public function deleteEmailLogo(): RedirectResponse
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        if ($settings->email_logo_path) {
            Storage::disk('public')->delete($settings->email_logo_path);
            $settings->update(['email_logo_path' => null]);
        }

        return back()->with('success', 'Email logo removed successfully.');
    }
}
