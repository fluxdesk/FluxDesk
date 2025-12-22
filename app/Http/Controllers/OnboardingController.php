<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function showOrganization(): Response
    {
        // If user already has an organization, redirect to inbox
        if (auth()->user()->organizations()->count() > 0) {
            return Inertia::location(route('inbox.index'));
        }

        return Inertia::render('onboarding/organization');
    }

    public function storeOrganization(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
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

        $organization = Organization::create([
            'name' => $validated['name'],
            'slug' => $slug,
        ]);

        // Attach user as admin with default flag
        auth()->user()->organizations()->attach($organization->id, [
            'role' => UserRole::Admin,
            'is_default' => true,
        ]);

        // Set the organization in session
        $request->session()->put('current_organization_id', $organization->id);

        return redirect()->route('inbox.index')
            ->with('success', 'Organization created successfully! Welcome to FluxDesk.');
    }
}
