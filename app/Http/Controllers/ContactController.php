<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Sla;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function __construct(
        protected OrganizationContext $organizationContext
    ) {}

    public function index(Request $request): Response
    {
        $query = Contact::with('sla')->withCount('tickets')->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $contacts = $query->paginate(50)->withQueryString();
        $slas = Sla::orderBy('name')->get();

        return Inertia::render('contacts/index', [
            'contacts' => $contacts,
            'filters' => $request->only(['search']),
            'slas' => $slas,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique(Contact::class)->where('organization_id', $this->organizationContext->id()),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'sla_id' => ['nullable', 'exists:slas,id'],
        ]);

        // If no SLA specified, use the organization's default SLA
        if (empty($validated['sla_id'])) {
            $defaultSla = Sla::where('is_default', true)->first();
            $validated['sla_id'] = $defaultSla?->id;
        }

        Contact::create([
            'organization_id' => $this->organizationContext->id(),
            ...$validated,
        ]);

        return back()->with('success', 'Contact created successfully.');
    }

    public function update(Request $request, Contact $contact): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique(Contact::class)
                    ->where('organization_id', $this->organizationContext->id())
                    ->ignore($contact->id),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'sla_id' => ['nullable', 'exists:slas,id'],
        ]);

        $contact->update($validated);

        return back()->with('success', 'Contact updated successfully.');
    }

    public function destroy(Contact $contact): RedirectResponse
    {
        // Check if contact has tickets
        if ($contact->tickets()->count() > 0) {
            return back()->with('error', 'Cannot delete contact with existing tickets.');
        }

        $contact->delete();

        return back()->with('success', 'Contact deleted successfully.');
    }
}
