<?php

namespace App\Http\Controllers;

use App\Models\CustomWidget;
use App\Services\Dashboard\DashboardLayoutService;
use App\Services\Dashboard\WidgetDataService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private WidgetDataService $widgetDataService,
        private DashboardLayoutService $layoutService
    ) {}

    public function index(Request $request): Response
    {
        $user = auth()->user();
        $organization = $user->currentOrganization();

        $layout = $this->layoutService->getOrCreateLayout($user, $organization);

        $range = $request->get('range', $layout->date_range);

        if ($range !== $layout->date_range) {
            $this->layoutService->updateDateRange($layout, $range);
        }

        $widgetData = $this->widgetDataService->getAllBuiltInWidgetData($range);

        $customWidgets = CustomWidget::where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhere('is_shared', true);
            })
            ->get();

        $customWidgetData = [];
        foreach ($customWidgets as $widget) {
            $customWidgetData[$widget->id] = $this->widgetDataService->getCustomWidgetData($widget);
        }

        return Inertia::render('dashboard', [
            'layout' => $layout,
            'availableWidgets' => $this->layoutService->getAvailableWidgets(),
            'customWidgets' => $customWidgets,
            'customWidgetData' => $customWidgetData,
            'templates' => $this->layoutService->getPresetsForOrganization($organization),
            'metrics' => $widgetData['metrics'],
            'ticketsByStatus' => $widgetData['ticketsByStatus'],
            'ticketsOverTime' => $widgetData['ticketsOverTime'],
            'recentTickets' => $widgetData['recentTickets'],
            'slaAtRisk' => $widgetData['slaAtRisk'],
            'slaBreached' => $widgetData['slaBreached'],
            'selectedRange' => $range,
            'responseTimeMetrics' => $widgetData['responseTimeMetrics'],
            'agentPerformance' => $widgetData['agentPerformance'],
            'trends' => $widgetData['trends'],
            'ticketsByChannel' => $widgetData['ticketsByChannel'],
        ]);
    }

    public function updateLayout(Request $request): RedirectResponse
    {
        $request->validate([
            'widgets' => 'required|array',
            'widgets.*.id' => 'required|string',
            'widgets.*.type' => 'required|string|in:built-in,custom',
            'widgets.*.size' => 'required|string|in:sm,md,lg',
            'widgets.*.position' => 'required|integer|min:0',
        ]);

        $user = auth()->user();
        $organization = $user->currentOrganization();
        $layout = $this->layoutService->getOrCreateLayout($user, $organization);

        $this->layoutService->updateLayout($layout, $request->widgets);

        return back();
    }

    public function resetLayout(): RedirectResponse
    {
        $user = auth()->user();
        $organization = $user->currentOrganization();
        $layout = $this->layoutService->getOrCreateLayout($user, $organization);

        $this->layoutService->resetLayout($layout);

        return back();
    }
}
