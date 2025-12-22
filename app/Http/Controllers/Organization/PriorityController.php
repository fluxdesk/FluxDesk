<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\StorePriorityRequest;
use App\Http\Requests\Organization\UpdatePriorityRequest;
use App\Models\Priority;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PriorityController extends Controller
{
    public function __construct(private OrganizationContext $organizationContext) {}

    public function index(): Response
    {
        $priorities = Priority::orderBy('sort_order')->get();

        return Inertia::render('organization/priorities', [
            'priorities' => $priorities,
        ]);
    }

    public function store(StorePriorityRequest $request): RedirectResponse
    {
        $maxOrder = Priority::max('sort_order') ?? -1;

        Priority::create([
            'organization_id' => $this->organizationContext->id(),
            'name' => $request->name,
            'color' => $request->color,
            'is_default' => $request->boolean('is_default'),
            'sort_order' => $maxOrder + 1,
        ]);

        if ($request->boolean('is_default')) {
            Priority::where('id', '!=', Priority::latest('id')->first()->id)
                ->update(['is_default' => false]);
        }

        return back()->with('success', 'Priority created successfully.');
    }

    public function update(UpdatePriorityRequest $request, Priority $priority): RedirectResponse
    {
        $priority->update($request->validated());

        if ($request->boolean('is_default')) {
            Priority::where('id', '!=', $priority->id)
                ->update(['is_default' => false]);
        }

        return back()->with('success', 'Priority updated successfully.');
    }

    public function destroy(Priority $priority): RedirectResponse
    {
        if ($priority->is_default) {
            return back()->with('error', 'Cannot delete the default priority.');
        }

        if ($priority->tickets()->exists()) {
            return back()->with('error', 'Cannot delete a priority that has tickets.');
        }

        $priority->delete();

        return back()->with('success', 'Priority deleted successfully.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:priorities,id'],
        ]);

        foreach ($request->ids as $index => $id) {
            Priority::where('id', $id)->update(['sort_order' => $index]);
        }

        return back()->with('success', 'Priorities reordered successfully.');
    }
}
