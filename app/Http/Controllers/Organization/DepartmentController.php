<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\StoreDepartmentRequest;
use App\Http\Requests\Organization\UpdateDepartmentRequest;
use App\Models\Department;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentController extends Controller
{
    public function __construct(private OrganizationContext $organizationContext) {}

    public function index(): Response
    {
        $departments = Department::orderBy('sort_order')
            ->withCount(['tickets', 'emailChannels'])
            ->get();

        return Inertia::render('organization/departments', [
            'departments' => $departments,
        ]);
    }

    public function store(StoreDepartmentRequest $request): RedirectResponse
    {
        $maxOrder = Department::max('sort_order') ?? -1;

        $department = Department::create([
            'organization_id' => $this->organizationContext->id(),
            'name' => $request->name,
            'description' => $request->description,
            'color' => $request->color,
            'is_default' => $request->boolean('is_default'),
            'sort_order' => $maxOrder + 1,
        ]);

        if ($request->boolean('is_default')) {
            Department::where('id', '!=', $department->id)
                ->update(['is_default' => false]);
        }

        return back()->with('success', 'Afdeling aangemaakt.');
    }

    public function update(UpdateDepartmentRequest $request, Department $department): RedirectResponse
    {
        $department->update($request->validated());

        if ($request->boolean('is_default')) {
            Department::where('id', '!=', $department->id)
                ->update(['is_default' => false]);
        }

        return back()->with('success', 'Afdeling bijgewerkt.');
    }

    public function destroy(Department $department): RedirectResponse
    {
        if ($department->is_default) {
            return back()->with('error', 'Kan de standaard afdeling niet verwijderen.');
        }

        if ($department->tickets()->exists()) {
            return back()->with('error', 'Kan een afdeling met tickets niet verwijderen.');
        }

        if ($department->emailChannels()->exists()) {
            return back()->with('error', 'Kan een afdeling met e-mailkanalen niet verwijderen.');
        }

        $department->delete();

        return back()->with('success', 'Afdeling verwijderd.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:departments,id'],
        ]);

        foreach ($request->ids as $index => $id) {
            Department::where('id', $id)->update(['sort_order' => $index]);
        }

        return back()->with('success', 'Afdelingen opnieuw geordend.');
    }
}
