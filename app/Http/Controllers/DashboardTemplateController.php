<?php

namespace App\Http\Controllers;

use App\Models\DashboardTemplate;
use App\Services\Dashboard\DashboardLayoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class DashboardTemplateController extends Controller
{
    public function __construct(
        private DashboardLayoutService $layoutService
    ) {}

    public function index(): JsonResponse
    {
        $user = auth()->user();
        $organization = $user->currentOrganization();

        $templates = $this->layoutService->getPresetsForOrganization($organization);

        return response()->json([
            'templates' => $templates,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $user = auth()->user();
        $organization = $user->currentOrganization();
        $layout = $this->layoutService->getOrCreateLayout($user, $organization);

        DashboardTemplate::create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'role_hint' => null,
            'is_preset' => false,
            'widgets' => $layout->widgets,
        ]);

        return back()->with('success', 'Template saved successfully.');
    }

    public function apply(DashboardTemplate $template): RedirectResponse
    {
        $user = auth()->user();
        $organization = $user->currentOrganization();

        if (! $template->is_preset && $template->organization_id !== $organization->id) {
            abort(403);
        }

        $layout = $this->layoutService->getOrCreateLayout($user, $organization);
        $this->layoutService->applyTemplate($layout, $template);

        return back()->with('success', 'Template applied successfully.');
    }

    public function destroy(DashboardTemplate $template): RedirectResponse
    {
        $user = auth()->user();

        if ($template->is_preset || $template->created_by !== $user->id) {
            abort(403);
        }

        $template->delete();

        return back()->with('success', 'Template deleted successfully.');
    }
}
