<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\PortalUpdateProfileRequest;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PortalProfileController extends Controller
{
    /**
     * Show the profile edit form.
     */
    public function edit(Organization $organization): Response
    {
        return Inertia::render('portal/profile');
    }

    /**
     * Update the profile.
     */
    public function update(PortalUpdateProfileRequest $request, Organization $organization): RedirectResponse
    {
        $contact = Auth::guard('contact')->user();

        $contact->update($request->validated());

        return back()->with('success', 'Profiel bijgewerkt.');
    }
}
