<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OrganizationController extends Controller
{
    public function switch(Request $request, Organization $organization): RedirectResponse
    {
        $user = $request->user();

        // Verify user belongs to this organization
        if (! $user->belongsToOrganization($organization) && ! $user->isSuperAdmin()) {
            abort(403, 'You do not have access to this organization.');
        }

        // Set the organization in session
        $request->session()->put('current_organization_id', $organization->id);

        return redirect()->route('inbox.index')
            ->with('success', "Switched to {$organization->name}");
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'locale' => ['required', 'string', 'in:en,nl'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique(Organization::class),
            ],
        ]);

        // Generate slug if not provided
        $slug = $validated['slug'] ?? Str::slug($validated['name']);

        // Ensure unique slug
        $originalSlug = $slug;
        $counter = 1;
        while (Organization::where('slug', $slug)->exists()) {
            $slug = $originalSlug.'-'.$counter++;
        }

        // Create organization with locale for the observer
        $organization = new Organization([
            'name' => $validated['name'],
            'slug' => $slug,
        ]);
        $organization->initialLocale = $validated['locale'];
        $organization->save();

        // Attach user as admin
        $request->user()->organizations()->attach($organization->id, [
            'role' => UserRole::Admin,
            'is_default' => false,
        ]);

        // Switch to the new organization
        $request->session()->put('current_organization_id', $organization->id);

        return redirect()->route('inbox.index')
            ->with('success', "Organization '{$organization->name}' created successfully!");
    }
}
