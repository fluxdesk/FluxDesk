<?php

namespace App\Observers;

use App\Models\Department;
use App\Models\Organization;
use App\Models\OrganizationSettings;
use App\Models\Priority;
use App\Models\Sla;
use App\Models\Status;
use App\Models\TicketFolder;
use Illuminate\Support\Facades\App;

class OrganizationObserver
{
    public function created(Organization $organization): void
    {
        // Determine locale: use initialLocale if set, otherwise fall back to config
        $locale = $organization->initialLocale ?? config('app.locale', 'en');

        // Temporarily set locale for translations
        $previousLocale = App::getLocale();
        App::setLocale($locale);

        try {
            // Create default organization settings with email_locale
            OrganizationSettings::create([
                'organization_id' => $organization->id,
                'ticket_prefix' => 'TKT',
                'ticket_number_format' => '{prefix}-{number}',
                'next_ticket_number' => 1,
                'timezone' => 'UTC',
                'email_locale' => $locale,
                'primary_color' => '#000000',
                'secondary_color' => '#ffffff',
            ]);

            // Create default statuses
            $this->createDefaultStatuses($organization);

            // Create default priorities
            $this->createDefaultPriorities($organization);

            // Create default SLA
            $this->createDefaultSla($organization);

            // Create default folders
            $this->createDefaultFolders($organization);

            // Create default department
            $this->createDefaultDepartment($organization);
        } finally {
            // Restore previous locale
            App::setLocale($previousLocale);
        }
    }

    protected function createDefaultStatuses(Organization $organization): void
    {
        $statuses = [
            ['name' => __('defaults.statuses.open'), 'slug' => __('defaults.statuses.open_slug'), 'color' => '#22c55e', 'is_default' => true, 'is_closed' => false, 'sort_order' => 0],
            ['name' => __('defaults.statuses.in_progress'), 'slug' => __('defaults.statuses.in_progress_slug'), 'color' => '#3b82f6', 'is_default' => false, 'is_closed' => false, 'sort_order' => 1],
            ['name' => __('defaults.statuses.pending'), 'slug' => __('defaults.statuses.pending_slug'), 'color' => '#f59e0b', 'is_default' => false, 'is_closed' => false, 'sort_order' => 2],
            ['name' => __('defaults.statuses.closed'), 'slug' => __('defaults.statuses.closed_slug'), 'color' => '#6b7280', 'is_default' => false, 'is_closed' => true, 'sort_order' => 3],
        ];

        foreach ($statuses as $status) {
            Status::withoutGlobalScopes()->create([
                'organization_id' => $organization->id,
                ...$status,
            ]);
        }
    }

    protected function createDefaultPriorities(Organization $organization): void
    {
        $priorities = [
            ['name' => __('defaults.priorities.low'), 'slug' => __('defaults.priorities.low_slug'), 'color' => '#6b7280', 'is_default' => false, 'sort_order' => 0],
            ['name' => __('defaults.priorities.normal'), 'slug' => __('defaults.priorities.normal_slug'), 'color' => '#3b82f6', 'is_default' => true, 'sort_order' => 1],
            ['name' => __('defaults.priorities.urgent'), 'slug' => __('defaults.priorities.urgent_slug'), 'color' => '#ef4444', 'is_default' => false, 'sort_order' => 2],
        ];

        foreach ($priorities as $priority) {
            Priority::withoutGlobalScopes()->create([
                'organization_id' => $organization->id,
                ...$priority,
            ]);
        }
    }

    protected function createDefaultSla(Organization $organization): void
    {
        Sla::withoutGlobalScopes()->create([
            'organization_id' => $organization->id,
            'name' => __('defaults.sla.default_name'),
            'is_default' => true,
            'is_system' => true,
            'first_response_hours' => 48,
            'resolution_hours' => 168,
            'business_hours_only' => true,
        ]);
    }

    protected function createDefaultFolders(Organization $organization): void
    {
        // Get the closed status to auto-move solved tickets
        $closedStatus = Status::withoutGlobalScopes()
            ->where('organization_id', $organization->id)
            ->where('is_closed', true)
            ->first();

        // Note: Inbox is not a real folder - it represents tickets with folder_id = null
        $folders = [
            ['name' => __('defaults.folders.solved'), 'slug' => __('defaults.folders.solved_slug'), 'color' => '#22c55e', 'icon' => 'check-circle', 'is_system' => true, 'system_type' => 'solved', 'sort_order' => 1, 'auto_status_id' => $closedStatus?->id],
            ['name' => __('defaults.folders.spam'), 'slug' => __('defaults.folders.spam_slug'), 'color' => '#f59e0b', 'icon' => 'alert-triangle', 'is_system' => true, 'system_type' => 'spam', 'sort_order' => 2],
            ['name' => __('defaults.folders.archived'), 'slug' => __('defaults.folders.archived_slug'), 'color' => '#6b7280', 'icon' => 'archive', 'is_system' => true, 'system_type' => 'archived', 'sort_order' => 3],
            ['name' => __('defaults.folders.deleted'), 'slug' => __('defaults.folders.deleted_slug'), 'color' => '#ef4444', 'icon' => 'trash-2', 'is_system' => true, 'system_type' => 'deleted', 'sort_order' => 4],
        ];

        foreach ($folders as $folder) {
            TicketFolder::withoutGlobalScopes()->create([
                'organization_id' => $organization->id,
                ...$folder,
            ]);
        }
    }

    protected function createDefaultDepartment(Organization $organization): void
    {
        Department::withoutGlobalScopes()->create([
            'organization_id' => $organization->id,
            'name' => __('defaults.departments.general'),
            'slug' => __('defaults.departments.general_slug'),
            'description' => __('defaults.departments.general_description'),
            'color' => '#6b7280',
            'is_default' => true,
            'sort_order' => 0,
        ]);
    }

    public function deleting(Organization $organization): void
    {
        // Settings will cascade delete due to foreign key constraint
    }
}
