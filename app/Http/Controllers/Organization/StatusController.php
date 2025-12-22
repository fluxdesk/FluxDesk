<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\StoreStatusRequest;
use App\Http\Requests\Organization\UpdateStatusRequest;
use App\Models\Status;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StatusController extends Controller
{
    public function __construct(private OrganizationContext $organizationContext) {}

    public function index(): Response
    {
        $statuses = Status::orderBy('sort_order')->get();

        return Inertia::render('organization/statuses', [
            'statuses' => $statuses,
        ]);
    }

    public function store(StoreStatusRequest $request): RedirectResponse
    {
        $maxOrder = Status::max('sort_order') ?? -1;

        Status::create([
            'organization_id' => $this->organizationContext->id(),
            'name' => $request->name,
            'color' => $request->color,
            'is_default' => $request->boolean('is_default'),
            'is_closed' => $request->boolean('is_closed'),
            'sort_order' => $maxOrder + 1,
        ]);

        if ($request->boolean('is_default')) {
            Status::where('id', '!=', Status::latest('id')->first()->id)
                ->update(['is_default' => false]);
        }

        return back()->with('success', 'Status created successfully.');
    }

    public function update(UpdateStatusRequest $request, Status $status): RedirectResponse
    {
        $status->update($request->validated());

        if ($request->boolean('is_default')) {
            Status::where('id', '!=', $status->id)
                ->update(['is_default' => false]);
        }

        return back()->with('success', 'Status updated successfully.');
    }

    public function destroy(Status $status): RedirectResponse
    {
        if ($status->is_default) {
            return back()->with('error', 'Cannot delete the default status.');
        }

        if ($status->tickets()->exists()) {
            return back()->with('error', 'Cannot delete a status that has tickets.');
        }

        $status->delete();

        return back()->with('success', 'Status deleted successfully.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:statuses,id'],
        ]);

        foreach ($request->ids as $index => $id) {
            Status::where('id', $id)->update(['sort_order' => $index]);
        }

        return back()->with('success', 'Statuses reordered successfully.');
    }
}
