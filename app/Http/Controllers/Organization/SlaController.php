<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\StoreSlaRequest;
use App\Http\Requests\Organization\UpdateSlaRequest;
use App\Http\Requests\Organization\UpdateSlaSettingsRequest;
use App\Models\Priority;
use App\Models\Sla;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SlaController extends Controller
{
    public function __construct(private OrganizationContext $organizationContext) {}

    public function index(): Response
    {
        $slas = Sla::with('priority')->orderBy('name')->get();
        $priorities = Priority::orderBy('sort_order')->get();
        $settings = $this->organizationContext->get()?->settings;

        return Inertia::render('organization/slas', [
            'slas' => $slas,
            'priorities' => $priorities,
            'slaSettings' => [
                'share_sla_times_with_contacts' => $settings?->share_sla_times_with_contacts ?? false,
                'share_average_reply_time' => $settings?->share_average_reply_time ?? false,
                'sla_reminder_intervals' => $settings?->sla_reminder_intervals ?? [],
            ],
        ]);
    }

    public function updateSettings(UpdateSlaSettingsRequest $request): RedirectResponse
    {
        $settings = $this->organizationContext->get()?->settings;

        if (! $settings) {
            return back()->with('error', 'Organisation settings not found.');
        }

        $settings->update([
            'share_sla_times_with_contacts' => $request->boolean('share_sla_times_with_contacts'),
            'share_average_reply_time' => $request->boolean('share_average_reply_time'),
            'sla_reminder_intervals' => $request->sla_reminder_intervals,
        ]);

        return back()->with('success', 'SLA instellingen opgeslagen.');
    }

    public function store(StoreSlaRequest $request): RedirectResponse
    {
        Sla::create([
            'organization_id' => $this->organizationContext->id(),
            'name' => $request->name,
            'first_response_hours' => $request->first_response_hours,
            'resolution_hours' => $request->resolution_hours,
            'business_hours_only' => $request->boolean('business_hours_only'),
            'is_default' => $request->boolean('is_default'),
            'priority_id' => $request->priority_id,
        ]);

        if ($request->boolean('is_default')) {
            Sla::where('id', '!=', Sla::latest('id')->first()->id)
                ->update(['is_default' => false]);
        }

        return back()->with('success', 'SLA created successfully.');
    }

    public function update(UpdateSlaRequest $request, Sla $sla): RedirectResponse
    {
        $sla->update($request->validated());

        if ($request->boolean('is_default')) {
            Sla::where('id', '!=', $sla->id)
                ->update(['is_default' => false]);
        }

        return back()->with('success', 'SLA updated successfully.');
    }

    public function destroy(Sla $sla): RedirectResponse
    {
        if ($sla->is_system) {
            return back()->with('error', 'Cannot delete system SLAs.');
        }

        if ($sla->is_default) {
            return back()->with('error', 'Cannot delete the default SLA.');
        }

        if ($sla->tickets()->exists()) {
            return back()->with('error', 'Cannot delete an SLA that has tickets.');
        }

        $sla->delete();

        return back()->with('success', 'SLA deleted successfully.');
    }
}
