<?php

namespace App\Http\Controllers;

use App\Models\TicketFolder;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class FolderController extends Controller
{
    public function __construct(
        protected OrganizationContext $organizationContext
    ) {}

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['required', 'string', 'max:7'],
            'icon' => ['nullable', 'string', 'max:50'],
        ]);

        // All folders are organization-wide (shared), no personal folders
        TicketFolder::create([
            'organization_id' => $this->organizationContext->id(),
            'user_id' => null,
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'color' => $validated['color'],
            'icon' => $validated['icon'] ?? 'folder',
            'is_system' => false,
            'sort_order' => TicketFolder::max('sort_order') + 1,
        ]);

        return back()->with('success', 'Folder created successfully.');
    }

    public function update(Request $request, TicketFolder $folder): RedirectResponse
    {
        // Check permissions
        if (! $folder->isEditableBy(auth()->user())) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['required', 'string', 'max:7'],
            'icon' => ['nullable', 'string', 'max:50'],
        ]);

        $folder->update([
            'name' => $validated['name'],
            'slug' => $folder->is_system ? $folder->slug : Str::slug($validated['name']),
            'color' => $validated['color'],
            'icon' => $validated['icon'] ?? $folder->icon,
        ]);

        return back()->with('success', 'Folder updated successfully.');
    }

    public function destroy(TicketFolder $folder): RedirectResponse
    {
        if (! $folder->canBeDeleted()) {
            return back()->with('error', 'System folders cannot be deleted.');
        }

        if (! $folder->isEditableBy(auth()->user())) {
            abort(403);
        }

        // Move tickets to Inbox before deleting
        // Inbox is virtual (folder_id = null), not a real folder
        $folder->tickets()->update(['folder_id' => null]);

        $folder->delete();

        return back()->with('success', 'Folder deleted successfully.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'folders' => ['required', 'array'],
            'folders.*.id' => ['required', 'integer', Rule::exists('ticket_folders', 'id')],
            'folders.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        foreach ($validated['folders'] as $item) {
            TicketFolder::where('id', $item['id'])
                ->where('organization_id', $this->organizationContext->id())
                ->update(['sort_order' => $item['sort_order']]);
        }

        return back()->with('success', 'Folders reordered successfully.');
    }
}
