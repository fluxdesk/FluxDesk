<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\OrganizationSettings;
use App\Models\SlaReminderSent;
use App\Models\Ticket;
use App\Models\User;
use App\Notifications\Tickets\SlaBreachWarningNotification;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

class SlaBreachReminderService
{
    /**
     * Check all organizations for approaching SLA deadlines and send reminders.
     */
    public function checkAndSendReminders(): void
    {
        // Get all organization settings that have reminder intervals configured
        $organizationSettings = OrganizationSettings::query()
            ->whereNotNull('sla_reminder_intervals')
            ->where('sla_reminder_intervals', '!=', '[]')
            ->where('sla_reminder_intervals', '!=', 'null')
            ->with('organization')
            ->get();

        foreach ($organizationSettings as $settings) {
            if (! $settings->organization) {
                continue;
            }

            $this->processOrganization($settings->organization, $settings);
        }
    }

    /**
     * Process reminder checks for a single organization.
     */
    private function processOrganization(Organization $organization, OrganizationSettings $settings): void
    {
        $intervals = $settings->getSortedSlaReminderIntervals();

        if (empty($intervals)) {
            return;
        }

        foreach ($intervals as $minutes) {
            // Check first response deadlines
            $this->checkDeadlineType($organization, 'first_response', $minutes);

            // Check resolution deadlines
            $this->checkDeadlineType($organization, 'resolution', $minutes);
        }
    }

    /**
     * Check and send reminders for a specific deadline type and interval.
     */
    private function checkDeadlineType(Organization $organization, string $type, int $minutesBefore): void
    {
        $tickets = $this->getTicketsNeedingReminder($organization, $type, $minutesBefore);

        foreach ($tickets as $ticket) {
            $this->sendReminder($ticket, $type, $minutesBefore);
        }
    }

    /**
     * Get tickets that need a reminder for the specified deadline type and interval.
     *
     * @return Collection<int, Ticket>
     */
    public function getTicketsNeedingReminder(Organization $organization, string $type, int $minutesBefore): Collection
    {
        $now = Carbon::now();
        $deadlineColumn = $type === 'first_response' ? 'sla_first_response_due_at' : 'sla_resolution_due_at';
        $completedColumn = $type === 'first_response' ? 'first_response_at' : 'resolved_at';

        // Calculate the window: deadline is within minutesBefore from now
        // but hasn't passed yet (not overdue)
        $windowStart = $now;
        $windowEnd = $now->copy()->addMinutes($minutesBefore);

        return Ticket::withoutGlobalScopes()
            ->where('organization_id', $organization->id)
            ->whereNotNull($deadlineColumn)
            ->whereNull($completedColumn) // Not yet completed
            ->whereBetween($deadlineColumn, [$windowStart, $windowEnd])
            // Only open tickets
            ->whereHas('status', fn ($q) => $q->where('is_closed', false))
            // Exclude tickets that already received this reminder
            ->whereDoesntHave('slaRemindersSent', function ($query) use ($type, $minutesBefore) {
                $query->where('type', $type)
                    ->where('minutes_before', $minutesBefore);
            })
            ->with(['assignee', 'contact', 'organization.users.notificationPreferences', 'sla'])
            ->get();
    }

    /**
     * Send a reminder for a specific ticket and record it.
     */
    public function sendReminder(Ticket $ticket, string $type, int $minutesBefore): void
    {
        $deadline = $type === 'first_response'
            ? $ticket->sla_first_response_due_at
            : $ticket->sla_resolution_due_at;

        if (! $deadline) {
            return;
        }

        $minutesRemaining = max(0, (int) Carbon::now()->diffInMinutes($deadline, false));

        // Determine who to notify
        $usersToNotify = $this->getUsersToNotify($ticket);

        if ($usersToNotify->isEmpty()) {
            Log::debug('SlaBreachReminderService: No users to notify for ticket', [
                'ticket_id' => $ticket->id,
                'type' => $type,
                'minutes_before' => $minutesBefore,
            ]);

            return;
        }

        // Send notifications
        foreach ($usersToNotify as $user) {
            try {
                $notification = new SlaBreachWarningNotification($ticket, $type, $minutesRemaining);
                $user->notify($notification);

                Log::info('SlaBreachReminderService: Sent SLA breach warning', [
                    'ticket_id' => $ticket->id,
                    'user_id' => $user->id,
                    'type' => $type,
                    'minutes_remaining' => $minutesRemaining,
                ]);
            } catch (\Exception $e) {
                Log::error('SlaBreachReminderService: Failed to send SLA breach warning', [
                    'ticket_id' => $ticket->id,
                    'user_id' => $user->id,
                    'type' => $type,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Record that we sent this reminder
        $this->recordReminderSent($ticket, $type, $minutesBefore);
    }

    /**
     * Get the users who should receive the reminder.
     *
     * @return \Illuminate\Support\Collection<int, User>
     */
    private function getUsersToNotify(Ticket $ticket): \Illuminate\Support\Collection
    {
        // If ticket has an assignee, only notify them (if preference allows)
        if ($ticket->assignee) {
            if ($this->shouldNotifyUser($ticket->assignee, $ticket->organization_id)) {
                return collect([$ticket->assignee]);
            }

            return collect();
        }

        // Otherwise, notify all organization members with the preference enabled
        return $ticket->organization->users
            ->filter(fn (User $user) => $this->shouldNotifyUser($user, $ticket->organization_id));
    }

    /**
     * Check if a user should receive SLA breach warnings.
     */
    private function shouldNotifyUser(User $user, int $organizationId): bool
    {
        $preferences = $user->notificationPreferencesFor($organizationId);

        // If no preferences set, default to true
        if (! $preferences) {
            return true;
        }

        return (bool) ($preferences->notify_sla_breach_warning ?? true);
    }

    /**
     * Record that a reminder was sent.
     */
    private function recordReminderSent(Ticket $ticket, string $type, int $minutesBefore): void
    {
        SlaReminderSent::create([
            'ticket_id' => $ticket->id,
            'type' => $type,
            'minutes_before' => $minutesBefore,
            'sent_at' => Carbon::now(),
        ]);
    }

    /**
     * Check if a specific reminder was already sent.
     */
    public function reminderAlreadySent(Ticket $ticket, string $type, int $minutesBefore): bool
    {
        return SlaReminderSent::query()
            ->where('ticket_id', $ticket->id)
            ->where('type', $type)
            ->where('minutes_before', $minutesBefore)
            ->exists();
    }
}
