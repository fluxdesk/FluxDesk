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

        // Handle email locale update
        if (isset($data['email_locale'])) {
            $settings->update(['email_locale' => $data['email_locale']]);
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
            'email_footer_text' => ['nullable', 'string', 'max:255'],
        ]);

        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        $settings->update($request->only([
            'primary_color',
            'secondary_color',
            'accent_color',
            'email_background_color',
            'email_footer_text',
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
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        $request->validate([
            'slug' => ['nullable', 'string', 'max:50', 'regex:/^[a-z0-9-]+$/'],
            'portal_enabled' => ['nullable', 'boolean'],
            'custom_domain' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i',
                function ($attribute, $value, $fail) use ($settings) {
                    if (! $value) {
                        return;
                    }

                    // Check if domain is already used by another organization
                    $exists = \App\Models\OrganizationSettings::where('custom_domain', $value)
                        ->where('id', '!=', $settings->id)
                        ->exists();

                    if ($exists) {
                        $fail('Dit domein is al in gebruik door een andere organisatie.');
                    }
                },
            ],
        ]);

        // Update organization slug
        if ($request->has('slug')) {
            $organization->update(['slug' => $request->slug]);
        }

        // Check if custom domain changed
        $domainChanged = $request->has('custom_domain') && $request->custom_domain !== $settings->custom_domain;

        // Update settings
        $settings->update($request->only([
            'portal_enabled',
            'custom_domain',
        ]));

        // Reset verification if domain changed
        if ($domainChanged) {
            $settings->update([
                'custom_domain_verified' => false,
                'custom_domain_verified_at' => null,
            ]);
        }

        return back()->with('success', 'Portaalinstellingen opgeslagen.');
    }

    /**
     * Verify DNS configuration for custom domain
     */
    public function verifyDns(): RedirectResponse
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->settings;

        if (! $settings->custom_domain) {
            return back()->with('error', 'Geen eigen domein geconfigureerd.');
        }

        // Get the expected target (current host)
        $expectedTarget = request()->getHost();

        // Perform DNS lookup
        $verified = $this->checkDnsConfiguration($settings->custom_domain, $expectedTarget);

        if ($verified) {
            $settings->update([
                'custom_domain_verified' => true,
                'custom_domain_verified_at' => now(),
            ]);

            return back()->with('success', 'DNS-configuratie geverifieerd! Je eigen domein is actief.');
        }

        return back()->with('error', 'DNS-configuratie niet gevonden. Controleer of het CNAME-record correct is ingesteld en wacht eventueel op DNS-propagatie (kan tot 48 uur duren).');
    }

    /**
     * Check if DNS is properly configured for custom domain
     */
    protected function checkDnsConfiguration(string $domain, string $expectedTarget): bool
    {
        // Remove www. prefix for checking
        $domain = preg_replace('/^www\./i', '', $domain);

        // Check CNAME records
        $cnameRecords = @dns_get_record($domain, DNS_CNAME);
        if ($cnameRecords) {
            foreach ($cnameRecords as $record) {
                $target = rtrim($record['target'] ?? '', '.');
                if (strcasecmp($target, $expectedTarget) === 0) {
                    return true;
                }
                // Also check without www
                if (strcasecmp($target, 'www.'.$expectedTarget) === 0) {
                    return true;
                }
            }
        }

        // Check A records as fallback (in case they pointed directly)
        $aRecords = @dns_get_record($domain, DNS_A);
        $expectedIps = @gethostbynamel($expectedTarget) ?: [];

        if ($aRecords && $expectedIps) {
            foreach ($aRecords as $record) {
                if (in_array($record['ip'] ?? '', $expectedIps, true)) {
                    return true;
                }
            }
        }

        return false;
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
