<?php

namespace App\Observers;

use App\Models\Organization;
use App\Models\OrganizationSettings;
use App\Models\Priority;
use App\Models\Sla;
use App\Models\Status;
use App\Models\TicketFolder;

class OrganizationObserver
{
    public function created(Organization $organization): void
    {
        // Create default organization settings
        OrganizationSettings::create([
            'organization_id' => $organization->id,
            'ticket_prefix' => 'TKT',
            'ticket_number_format' => '{prefix}-{number}',
            'next_ticket_number' => 1,
            'timezone' => 'UTC',
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
    }

    protected function createDefaultStatuses(Organization $organization): void
    {
        $statuses = [
            ['name' => 'Open', 'slug' => 'open', 'color' => '#22c55e', 'is_default' => true, 'is_closed' => false, 'sort_order' => 0],
            ['name' => 'In behandeling', 'slug' => 'in-behandeling', 'color' => '#3b82f6', 'is_default' => false, 'is_closed' => false, 'sort_order' => 1],
            ['name' => 'Wachtend', 'slug' => 'wachtend', 'color' => '#f59e0b', 'is_default' => false, 'is_closed' => false, 'sort_order' => 2],
            ['name' => 'Gesloten', 'slug' => 'gesloten', 'color' => '#6b7280', 'is_default' => false, 'is_closed' => true, 'sort_order' => 3],
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
            ['name' => 'Laag', 'slug' => 'laag', 'color' => '#6b7280', 'is_default' => false, 'sort_order' => 0],
            ['name' => 'Normaal', 'slug' => 'normaal', 'color' => '#3b82f6', 'is_default' => true, 'sort_order' => 1],
            ['name' => 'Urgent', 'slug' => 'urgent', 'color' => '#ef4444', 'is_default' => false, 'sort_order' => 2],
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
            'name' => 'Standaard SLA',
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

        // Note: "Postvak" is not a real folder - it represents tickets with folder_id = null
        $folders = [
            ['name' => 'Opgelost', 'slug' => 'opgelost', 'color' => '#22c55e', 'icon' => 'check-circle', 'is_system' => true, 'system_type' => 'solved', 'sort_order' => 1, 'auto_status_id' => $closedStatus?->id],
            ['name' => 'Spam', 'slug' => 'spam', 'color' => '#f59e0b', 'icon' => 'alert-triangle', 'is_system' => true, 'system_type' => 'spam', 'sort_order' => 2],
            ['name' => 'Gearchiveerd', 'slug' => 'gearchiveerd', 'color' => '#6b7280', 'icon' => 'archive', 'is_system' => true, 'system_type' => 'archived', 'sort_order' => 3],
            ['name' => 'Verwijderd', 'slug' => 'verwijderd', 'color' => '#ef4444', 'icon' => 'trash-2', 'is_system' => true, 'system_type' => 'deleted', 'sort_order' => 4],
        ];

        foreach ($folders as $folder) {
            TicketFolder::withoutGlobalScopes()->create([
                'organization_id' => $organization->id,
                ...$folder,
            ]);
        }
    }

    public function deleting(Organization $organization): void
    {
        // Settings will cascade delete due to foreign key constraint
    }
}
