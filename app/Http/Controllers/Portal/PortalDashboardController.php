<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Ticket;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PortalDashboardController extends Controller
{
    /**
     * Show the dashboard with ticket list.
     */
    public function index(Organization $organization): Response
    {
        $contact = Auth::guard('contact')->user();

        $tickets = Ticket::where('contact_id', $contact->id)
            ->with(['status', 'priority', 'latestMessage'])
            ->withCount('messages')
            ->latest('updated_at')
            ->paginate(20);

        return Inertia::render('portal/dashboard', [
            'tickets' => $tickets,
        ]);
    }
}
