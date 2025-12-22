<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Inertia\Inertia;
use Inertia\Response;

class LandingController extends Controller
{
    /**
     * Show the organization landing page.
     */
    public function show(Organization $organization): Response
    {
        return Inertia::render('landing', [
            'organization' => $organization->load('settings'),
        ]);
    }
}
