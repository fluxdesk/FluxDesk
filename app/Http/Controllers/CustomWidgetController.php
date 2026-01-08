<?php

namespace App\Http\Controllers;

use App\Models\CustomWidget;
use App\Services\Dashboard\WidgetDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CustomWidgetController extends Controller
{
    public function __construct(
        private WidgetDataService $widgetDataService
    ) {}

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'entity' => 'required|string|in:tickets,contacts',
            'chart_type' => 'required|string|in:bar,pie,line,number',
            'group_by' => 'nullable|string|in:status,priority,department,channel,assignee',
            'aggregation' => 'required|string|in:count,sum,avg',
            'aggregation_field' => 'nullable|string',
            'filters' => 'nullable|array',
            'is_shared' => 'boolean',
        ]);

        $user = auth()->user();
        $organization = $user->currentOrganization();

        $widget = CustomWidget::create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'entity' => $validated['entity'],
            'chart_type' => $validated['chart_type'],
            'group_by' => $validated['group_by'] ?? null,
            'aggregation' => $validated['aggregation'],
            'aggregation_field' => $validated['aggregation_field'] ?? null,
            'filters' => $validated['filters'] ?? [],
            'is_shared' => $validated['is_shared'] ?? false,
        ]);

        return back()->with('success', 'Widget created successfully.');
    }

    public function update(Request $request, CustomWidget $customWidget): RedirectResponse
    {
        Gate::authorize('update', $customWidget);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'entity' => 'required|string|in:tickets,contacts',
            'chart_type' => 'required|string|in:bar,pie,line,number',
            'group_by' => 'nullable|string|in:status,priority,department,channel,assignee',
            'aggregation' => 'required|string|in:count,sum,avg',
            'aggregation_field' => 'nullable|string',
            'filters' => 'nullable|array',
            'is_shared' => 'boolean',
        ]);

        $customWidget->update([
            'name' => $validated['name'],
            'entity' => $validated['entity'],
            'chart_type' => $validated['chart_type'],
            'group_by' => $validated['group_by'] ?? null,
            'aggregation' => $validated['aggregation'],
            'aggregation_field' => $validated['aggregation_field'] ?? null,
            'filters' => $validated['filters'] ?? [],
            'is_shared' => $validated['is_shared'] ?? false,
        ]);

        return back()->with('success', 'Widget updated successfully.');
    }

    public function destroy(CustomWidget $customWidget): RedirectResponse
    {
        Gate::authorize('delete', $customWidget);

        $customWidget->delete();

        return back()->with('success', 'Widget deleted successfully.');
    }

    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entity' => 'required|string|in:tickets,contacts',
            'chart_type' => 'required|string|in:bar,pie,line,number',
            'group_by' => 'nullable|string|in:status,priority,department,channel,assignee',
            'aggregation' => 'required|string|in:count,sum,avg',
            'aggregation_field' => 'nullable|string',
            'filters' => 'nullable|array',
        ]);

        $user = auth()->user();
        $organization = $user->currentOrganization();

        $tempWidget = new CustomWidget([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'name' => 'Preview',
            'entity' => $validated['entity'],
            'chart_type' => $validated['chart_type'],
            'group_by' => $validated['group_by'] ?? null,
            'aggregation' => $validated['aggregation'],
            'aggregation_field' => $validated['aggregation_field'] ?? null,
            'filters' => $validated['filters'] ?? [],
            'is_shared' => false,
        ]);

        $data = $this->widgetDataService->getCustomWidgetData($tempWidget);

        return response()->json([
            'data' => $data,
        ]);
    }
}
