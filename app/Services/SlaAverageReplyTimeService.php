<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\Priority;
use App\Models\SlaAverageReplyTime;
use App\Models\Ticket;
use Carbon\Carbon;

class SlaAverageReplyTimeService
{
    /**
     * Calculate and store weekly average reply times for an organization.
     * This calculates the average first response time for tickets resolved in the past week.
     */
    public function calculateWeeklyAverages(Organization $organization): void
    {
        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();

        // Get all priorities for this organization
        $priorities = Priority::where('organization_id', $organization->id)->get();

        // Calculate average for each priority
        foreach ($priorities as $priority) {
            $this->calculateAndStoreAverage($organization, $priority, $weekStart, $weekEnd);
        }

        // Also calculate the overall average (null priority)
        $this->calculateAndStoreAverage($organization, null, $weekStart, $weekEnd);
    }

    /**
     * Calculate and store the average for a specific organization/priority combination.
     */
    private function calculateAndStoreAverage(
        Organization $organization,
        ?Priority $priority,
        Carbon $weekStart,
        Carbon $weekEnd
    ): void {
        $query = Ticket::withoutGlobalScopes()
            ->where('organization_id', $organization->id)
            ->whereNotNull('first_response_at')
            ->whereBetween('created_at', [$weekStart->copy()->subWeek(), $weekEnd->copy()->subWeek()]);

        if ($priority) {
            $query->where('priority_id', $priority->id);
        }

        // Get tickets and calculate average in PHP to be database-agnostic
        $tickets = $query->select(['created_at', 'first_response_at'])->get();

        $ticketCount = $tickets->count();

        if ($ticketCount === 0) {
            return;
        }

        $totalMinutes = $tickets->sum(function ($ticket) {
            return Carbon::parse($ticket->created_at)->diffInMinutes(Carbon::parse($ticket->first_response_at));
        });

        $averageMinutes = (int) round($totalMinutes / $ticketCount);

        SlaAverageReplyTime::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'priority_id' => $priority?->id,
                'week_start' => $weekStart,
            ],
            [
                'average_minutes' => $averageMinutes,
                'ticket_count' => $ticketCount,
            ]
        );
    }

    /**
     * Get the cached average reply time for a priority (in minutes).
     * Returns null if no data is available.
     */
    public function getAverageForPriority(Organization $organization, ?Priority $priority): ?int
    {
        $weekStart = Carbon::now()->startOfWeek();

        $average = SlaAverageReplyTime::query()
            ->where('organization_id', $organization->id)
            ->where('priority_id', $priority?->id)
            ->where('week_start', $weekStart)
            ->first();

        // If no data for current week, try last week
        if (! $average) {
            $average = SlaAverageReplyTime::query()
                ->where('organization_id', $organization->id)
                ->where('priority_id', $priority?->id)
                ->where('week_start', $weekStart->copy()->subWeek())
                ->first();
        }

        return $average?->average_minutes;
    }

    /**
     * Get the formatted average reply time for display.
     * Returns a human-readable string like "2 uur" or "45 minuten".
     */
    public function getFormattedAverage(Organization $organization, ?Priority $priority): ?string
    {
        $minutes = $this->getAverageForPriority($organization, $priority);

        if ($minutes === null) {
            return null;
        }

        return $this->formatMinutes($minutes);
    }

    /**
     * Format minutes into a human-readable string.
     */
    public function formatMinutes(int $minutes): string
    {
        if ($minutes < 60) {
            return $minutes === 1 ? '1 minuut' : "{$minutes} minuten";
        }

        $hours = floor($minutes / 60);
        $remainingMinutes = $minutes % 60;

        if ($hours < 24) {
            if ($remainingMinutes === 0) {
                return $hours === 1 ? '1 uur' : "{$hours} uur";
            }

            return $hours === 1
                ? "1 uur en {$remainingMinutes} minuten"
                : "{$hours} uur en {$remainingMinutes} minuten";
        }

        $days = floor($hours / 24);
        $remainingHours = $hours % 24;

        if ($remainingHours === 0) {
            return $days === 1 ? '1 dag' : "{$days} dagen";
        }

        return $days === 1
            ? "1 dag en {$remainingHours} uur"
            : "{$days} dagen en {$remainingHours} uur";
    }
}
