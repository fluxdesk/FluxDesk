<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Sla;
use App\Services\CompanyService;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    public function __construct(
        protected OrganizationContext $organizationContext,
        protected CompanyService $companyService
    ) {}

    public function index(Request $request): Response
    {
        $query = Company::with('sla')
            ->withCount('contacts')
            ->withCount('tickets')
            ->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereJsonContains('domains', $search)
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $companies = $query->paginate(50)->withQueryString();
        $slas = Sla::orderBy('name')->get();

        return Inertia::render('companies/index', [
            'companies' => $companies,
            'filters' => $request->only(['search']),
            'slas' => $slas,
        ]);
    }

    public function show(Company $company): Response
    {
        $company->loadCount(['contacts', 'tickets']);
        $company->load('sla');

        $openTicketsCount = $company->tickets()
            ->whereHas('status', fn ($q) => $q->where('is_closed', false))
            ->count();

        $contacts = $company->contacts()
            ->withCount('tickets')
            ->latest()
            ->paginate(25);

        $recentTickets = $company->tickets()
            ->with(['contact', 'status', 'priority', 'assignee'])
            ->latest()
            ->limit(10)
            ->get();

        $slas = Sla::orderBy('name')->get();

        // Get contacts that could be linked (same organization, no company)
        $availableContacts = Contact::query()
            ->where('organization_id', $this->organizationContext->id())
            ->whereNull('company_id')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('companies/show', [
            'company' => $company,
            'contacts' => $contacts,
            'recentTickets' => $recentTickets,
            'openTicketsCount' => $openTicketsCount,
            'slas' => $slas,
            'availableContacts' => $availableContacts,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'url', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'sla_id' => ['nullable', 'exists:slas,id'],
            'domains' => ['nullable', 'array'],
            'domains.*' => ['string', 'max:255'],
        ]);

        // Clean and normalize domains
        if (! empty($validated['domains'])) {
            $validated['domains'] = $this->cleanDomains($validated['domains']);

            // Check for duplicate domains across companies in same organization
            $existingDomains = $this->findConflictingDomains($validated['domains']);
            if ($existingDomains) {
                return back()->withErrors([
                    'domains' => 'De volgende domeinen zijn al in gebruik: '.implode(', ', $existingDomains),
                ])->withInput();
            }
        }

        $company = Company::create([
            'organization_id' => $this->organizationContext->id(),
            ...$validated,
        ]);

        // Auto-match contacts if domains are set
        if (! empty($company->domains)) {
            $matched = $this->companyService->matchAllContactsForCompany($company);
            if ($matched > 0) {
                return back()->with('success', "Bedrijf aangemaakt en {$matched} contact(en) automatisch gekoppeld.");
            }
        }

        return back()->with('success', 'Bedrijf succesvol aangemaakt.');
    }

    public function update(Request $request, Company $company): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'url', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'sla_id' => ['nullable', 'exists:slas,id'],
            'domains' => ['nullable', 'array'],
            'domains.*' => ['string', 'max:255'],
        ]);

        // Clean and normalize domains
        if (! empty($validated['domains'])) {
            $validated['domains'] = $this->cleanDomains($validated['domains']);

            // Check for duplicate domains across companies in same organization (excluding current)
            $existingDomains = $this->findConflictingDomains($validated['domains'], $company->id);
            if ($existingDomains) {
                return back()->withErrors([
                    'domains' => 'De volgende domeinen zijn al in gebruik: '.implode(', ', $existingDomains),
                ])->withInput();
            }
        }

        $oldDomains = $company->domains ?? [];
        $company->update($validated);
        $newDomains = $company->domains ?? [];

        // Check for new domains that were added
        $addedDomains = array_diff($newDomains, $oldDomains);

        // Auto-match contacts if new domains were added
        if (count($addedDomains) > 0) {
            $matched = $this->companyService->matchAllContactsForCompany($company);
            if ($matched > 0) {
                return back()->with('success', "Bedrijf bijgewerkt en {$matched} contact(en) automatisch gekoppeld.");
            }
        }

        return back()->with('success', 'Bedrijf succesvol bijgewerkt.');
    }

    public function destroy(Company $company): RedirectResponse
    {
        // Soft delete will keep the company but unlink won't happen automatically
        // We'll unlink contacts first
        $company->contacts()->update(['company_id' => null]);
        $company->delete();

        return redirect()->route('companies.index')->with('success', 'Bedrijf succesvol verwijderd.');
    }

    public function linkContact(Request $request, Company $company, Contact $contact): RedirectResponse
    {
        // Verify contact belongs to same organization
        if ($contact->organization_id !== $company->organization_id) {
            return back()->with('error', 'Contact behoort niet tot dezelfde organisatie.');
        }

        $contact->update(['company_id' => $company->id]);

        return back()->with('success', 'Contact succesvol gekoppeld aan bedrijf.');
    }

    public function unlinkContact(Company $company, Contact $contact): RedirectResponse
    {
        if ($contact->company_id !== $company->id) {
            return back()->with('error', 'Contact is niet gekoppeld aan dit bedrijf.');
        }

        $contact->update(['company_id' => null]);

        return back()->with('success', 'Contact succesvol ontkoppeld van bedrijf.');
    }

    public function tickets(Company $company): Response
    {
        $company->loadCount(['contacts', 'tickets']);

        $tickets = $company->tickets()
            ->with(['contact', 'status', 'priority', 'assignee'])
            ->latest()
            ->paginate(50);

        return Inertia::render('companies/tickets', [
            'company' => $company,
            'tickets' => $tickets,
        ]);
    }

    /**
     * Clean and normalize domains array.
     *
     * @param  array<string>  $domains
     * @return array<string>
     */
    protected function cleanDomains(array $domains): array
    {
        return array_values(array_unique(array_filter(
            array_map(fn ($d) => strtolower(trim($d)), $domains)
        )));
    }

    /**
     * Find domains that are already used by other companies in the organization.
     *
     * @param  array<string>  $domains
     * @return array<string>
     */
    protected function findConflictingDomains(array $domains, ?int $excludeCompanyId = null): array
    {
        $conflicting = [];

        $query = Company::query()
            ->where('organization_id', $this->organizationContext->id())
            ->whereNotNull('domains');

        if ($excludeCompanyId) {
            $query->where('id', '!=', $excludeCompanyId);
        }

        $existingCompanies = $query->get();

        foreach ($existingCompanies as $existingCompany) {
            $existingDomains = array_map('strtolower', $existingCompany->domains ?? []);
            foreach ($domains as $domain) {
                if (in_array(strtolower($domain), $existingDomains)) {
                    $conflicting[] = $domain;
                }
            }
        }

        return array_unique($conflicting);
    }
}
