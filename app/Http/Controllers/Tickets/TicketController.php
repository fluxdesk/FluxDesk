<?php

namespace App\Http\Controllers\Tickets;

use App\Enums\MessageType;
use App\Enums\TicketChannel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tickets\StoreTicketRequest;
use App\Http\Requests\Tickets\UpdateTicketRequest;
use App\Models\Contact;
use App\Models\Department;
use App\Models\EmailChannel;
use App\Models\Message;
use App\Models\Priority;
use App\Models\Status;
use App\Models\Tag;
use App\Models\Ticket;
use App\Models\TicketFolder;
use App\Models\User;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TicketController extends Controller
{
    public function index(Request $request): Response
    {
        $orgId = app(OrganizationContext::class)->id();

        $query = Ticket::with(['contact', 'status', 'priority', 'assignee', 'latestMessage', 'readers', 'tags', 'folder', 'sla']);

        // Apply folder filter
        // Default view (no folder or 'inbox') shows only tickets in Inbox (folder_id = null)
        // This ensures Solved, Spam, Archived, Deleted tickets don't clutter the main view
        if (! $request->filled('folder') || $request->folder === 'inbox') {
            $query->whereNull('folder_id');
        } else {
            $query->where('folder_id', $request->folder);
        }

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status_id', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority_id', $request->priority);
        }

        if ($request->filled('assigned_to')) {
            if ($request->assigned_to === 'unassigned') {
                $query->whereNull('assigned_to');
            } else {
                $query->where('assigned_to', $request->assigned_to);
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                    ->orWhere('ticket_number', 'like', "%{$search}%")
                    ->orWhereHas('contact', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->boolean('unread')) {
            $query->unread();
        }

        // Apply sorting
        $sort = $request->input('sort', 'latest');
        match ($sort) {
            'oldest' => $query->oldest(),
            'priority' => $query->orderBy('priority_id', 'asc'), // Lower sort_order = higher priority
            'sla' => $query->orderByRaw('CASE WHEN sla_first_response_due_at IS NOT NULL AND first_response_at IS NULL AND sla_first_response_due_at < NOW() THEN 0 WHEN sla_resolution_due_at IS NOT NULL AND resolved_at IS NULL AND sla_resolution_due_at < NOW() THEN 1 ELSE 2 END')->orderByRaw('COALESCE(sla_first_response_due_at, sla_resolution_due_at, updated_at)'),
            default => $query->latest(),
        };

        $tickets = $query->paginate(50)->withQueryString();

        // Get filter options
        $statuses = Status::orderBy('sort_order')->get();
        $priorities = Priority::orderBy('sort_order')->get();
        $agents = User::whereHas('organizations', function ($q) use ($orgId) {
            $q->where('organizations.id', $orgId);
        })->get();
        $contacts = Contact::orderBy('name')->get();

        // Get folders with ticket counts
        $folders = TicketFolder::withCount('tickets')
            ->orderBy('sort_order')
            ->get();

        // Get tags (both organization and personal)
        $tags = Tag::where(function ($q) {
            $q->whereNull('user_id')->orWhere('user_id', auth()->id());
        })->orderBy('name')->get();

        // Get email channels for ticket creation
        $emailChannels = EmailChannel::where('is_active', true)->orderBy('name')->get();

        // Get departments
        $departments = Department::orderBy('sort_order')->get();

        return Inertia::render('inbox/index', [
            'tickets' => $tickets,
            'statuses' => $statuses,
            'priorities' => $priorities,
            'agents' => $agents,
            'contacts' => $contacts,
            'folders' => $folders,
            'tags' => $tags,
            'emailChannels' => $emailChannels,
            'departments' => $departments,
            'filters' => $request->only(['status', 'priority', 'assigned_to', 'search', 'unread', 'folder', 'sort']),
        ]);
    }

    public function show(Request $request, Ticket $ticket): Response
    {
        $orgId = app(OrganizationContext::class)->id();

        // Mark as read when viewing
        $ticket->markAsRead();

        $ticket->load([
            'contact',
            'status',
            'priority',
            'sla',
            'assignee',
            'tags',
            'readers',
            'folder',
            'messages' => function ($query) {
                $query->with(['user', 'contact', 'fileAttachments', 'ccRecipients'])->orderBy('created_at', 'asc');
            },
            'activities' => function ($query) {
                $query->with('user')->orderBy('created_at', 'desc')->limit(20);
            },
        ]);

        // Get the ticket list for the sidebar
        $ticketsQuery = Ticket::with(['contact', 'status', 'priority', 'assignee', 'latestMessage', 'readers', 'tags', 'folder', 'sla']);

        // Apply folder filter
        // Default view (no folder or 'inbox') shows only tickets in Inbox (folder_id = null)
        // This ensures Solved, Spam, Archived, Deleted tickets don't clutter the main view
        if (! $request->filled('folder') || $request->folder === 'inbox') {
            $ticketsQuery->whereNull('folder_id');
        } else {
            $ticketsQuery->where('folder_id', $request->folder);
        }

        if ($request->filled('status')) {
            $ticketsQuery->where('status_id', $request->status);
        }

        if ($request->filled('priority')) {
            $ticketsQuery->where('priority_id', $request->priority);
        }

        if ($request->filled('assigned_to')) {
            if ($request->assigned_to === 'unassigned') {
                $ticketsQuery->whereNull('assigned_to');
            } else {
                $ticketsQuery->where('assigned_to', $request->assigned_to);
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $ticketsQuery->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                    ->orWhere('ticket_number', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('unread')) {
            $ticketsQuery->unread();
        }

        // Apply sorting
        $sort = $request->input('sort', 'latest');
        match ($sort) {
            'oldest' => $ticketsQuery->oldest(),
            'priority' => $ticketsQuery->orderBy('priority_id', 'asc'),
            'sla' => $ticketsQuery->orderByRaw('CASE WHEN sla_first_response_due_at IS NOT NULL AND first_response_at IS NULL AND sla_first_response_due_at < NOW() THEN 0 WHEN sla_resolution_due_at IS NOT NULL AND resolved_at IS NULL AND sla_resolution_due_at < NOW() THEN 1 ELSE 2 END')->orderByRaw('COALESCE(sla_first_response_due_at, sla_resolution_due_at, updated_at)'),
            default => $ticketsQuery->latest(),
        };

        $tickets = $ticketsQuery->paginate(50)->withQueryString();

        // Get options for dropdowns
        $statuses = Status::orderBy('sort_order')->get();
        $priorities = Priority::orderBy('sort_order')->get();
        $agents = User::whereHas('organizations', function ($q) use ($orgId) {
            $q->where('organizations.id', $orgId);
        })->get();
        $contacts = Contact::orderBy('name')->get();

        // Get folders with ticket counts
        $folders = TicketFolder::withCount('tickets')
            ->orderBy('sort_order')
            ->get();

        // Get tags (both organization and personal)
        $tags = Tag::where(function ($q) {
            $q->whereNull('user_id')->orWhere('user_id', auth()->id());
        })->orderBy('name')->get();

        // Get email channels for ticket creation
        $emailChannels = EmailChannel::where('is_active', true)->orderBy('name')->get();

        // Get departments
        $departments = Department::orderBy('sort_order')->get();

        return Inertia::render('inbox/show', [
            'ticket' => $ticket,
            'tickets' => $tickets,
            'statuses' => $statuses,
            'priorities' => $priorities,
            'agents' => $agents,
            'contacts' => $contacts,
            'folders' => $folders,
            'tags' => $tags,
            'emailChannels' => $emailChannels,
            'departments' => $departments,
            'filters' => $request->only(['status', 'priority', 'assigned_to', 'search', 'unread', 'folder', 'sort']),
        ]);
    }

    public function markAsUnread(Request $request, Ticket $ticket): RedirectResponse
    {
        $ticket->markAsUnread();

        // Redirect to inbox list (not back to ticket view, which would mark it as read again)
        // Preserve the folder filter if present
        $redirectUrl = '/inbox';
        if ($request->has('folder') || $request->query('folder')) {
            $folder = $request->input('folder') ?? $request->query('folder');
            $redirectUrl = '/inbox?folder='.$folder;
        } elseif ($request->headers->get('referer')) {
            // Try to extract folder from referer URL
            $referer = $request->headers->get('referer');
            if (preg_match('/[?&]folder=([^&]+)/', $referer, $matches)) {
                $redirectUrl = '/inbox?folder='.$matches[1];
            }
        }

        return redirect($redirectUrl)->with('success', 'Ticket marked as unread.');
    }

    public function store(StoreTicketRequest $request): RedirectResponse
    {
        $orgId = app(OrganizationContext::class)->id();

        // Resolve contact - either existing or create new from email
        if ($request->contact_id) {
            $contactId = $request->contact_id;
        } else {
            $contact = Contact::firstOrCreate(
                [
                    'organization_id' => $orgId,
                    'email' => strtolower($request->contact_email),
                ],
                [
                    'name' => $request->contact_name ?? $this->extractNameFromEmail($request->contact_email),
                ]
            );
            $contactId = $contact->id;
        }

        $ticket = Ticket::create([
            'organization_id' => $orgId,
            'subject' => $request->subject,
            'contact_id' => $contactId,
            'status_id' => $request->status_id,
            'priority_id' => $request->priority_id,
            'department_id' => $request->department_id,
            'assigned_to' => $request->assigned_to,
            'email_channel_id' => $request->email_channel_id,
            'channel' => TicketChannel::Web,
        ]);

        // Create the initial message
        Message::create([
            'ticket_id' => $ticket->id,
            'user_id' => auth()->id(),
            'type' => MessageType::Reply,
            'body' => $request->message,
            'is_from_contact' => false,
        ]);

        return redirect()->route('inbox.show', $ticket)
            ->with('success', 'Ticket created successfully.');
    }

    /**
     * Extract a display name from an email address.
     */
    private function extractNameFromEmail(string $email): string
    {
        $localPart = explode('@', $email)[0];

        return ucwords(str_replace(['.', '_', '-'], ' ', $localPart));
    }

    public function update(UpdateTicketRequest $request, Ticket $ticket): RedirectResponse
    {
        $ticket->update($request->validated());

        return back()->with('success', 'Ticket updated successfully.');
    }

    public function destroy(Ticket $ticket): RedirectResponse
    {
        $ticket->delete();

        return redirect()->route('inbox.index')
            ->with('success', 'Ticket deleted successfully.');
    }

    public function moveToFolder(Request $request, Ticket $ticket): RedirectResponse
    {
        $validated = $request->validate([
            'folder_id' => ['nullable', 'integer', Rule::exists('ticket_folders', 'id')],
        ]);

        $updateData = ['folder_id' => $validated['folder_id']];

        // If the folder has an auto_status_id, also update the ticket status
        if ($validated['folder_id']) {
            $folder = \App\Models\TicketFolder::find($validated['folder_id']);
            if ($folder && $folder->auto_status_id) {
                $updateData['status_id'] = $folder->auto_status_id;
                // If moving to solved folder, also set resolved_at timestamp
                if ($folder->system_type === 'solved' && ! $ticket->resolved_at) {
                    $updateData['resolved_at'] = now();
                }
            }
        }

        $ticket->update($updateData);

        return back()->with('success', 'Ticket moved successfully.');
    }

    public function updateTags(Request $request, Ticket $ticket): RedirectResponse
    {
        $validated = $request->validate([
            'tags' => ['array'],
            'tags.*' => ['integer', Rule::exists('tags', 'id')],
        ]);

        $ticket->tags()->sync($validated['tags'] ?? []);

        return back()->with('success', 'Tags updated successfully.');
    }

    public function merge(Request $request, Ticket $ticket): RedirectResponse
    {
        $validated = $request->validate([
            'merge_ticket_id' => ['required', 'integer', Rule::exists('tickets', 'id')],
            'copy_cc_recipients' => ['boolean'],
            'add_merge_note' => ['boolean'],
        ]);

        $mergeTicket = Ticket::findOrFail($validated['merge_ticket_id']);

        // Move all messages from the merge ticket to this ticket
        $mergeTicket->messages()->update(['ticket_id' => $ticket->id]);

        // Move all activities from the merge ticket
        $mergeTicket->activities()->update(['ticket_id' => $ticket->id]);

        // Copy tags (merge, don't duplicate)
        $existingTagIds = $ticket->tags()->pluck('id')->toArray();
        $mergeTagIds = $mergeTicket->tags()->pluck('id')->toArray();
        $allTagIds = array_unique(array_merge($existingTagIds, $mergeTagIds));
        $ticket->tags()->sync($allTagIds);

        // Add a merge note if requested
        if ($validated['add_merge_note'] ?? true) {
            Message::create([
                'ticket_id' => $ticket->id,
                'user_id' => auth()->id(),
                'type' => MessageType::Note,
                'body' => "Dit ticket is samengevoegd met ticket #{$mergeTicket->ticket_number} ({$mergeTicket->subject}).",
                'is_from_contact' => false,
            ]);
        }

        // Delete the merged ticket
        $mergeTicket->delete();

        return redirect()->route('inbox.show', $ticket)
            ->with('success', 'Tickets samengevoegd.');
    }
}
