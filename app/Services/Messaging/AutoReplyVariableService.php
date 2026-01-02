<?php

namespace App\Services\Messaging;

use App\Models\Contact;
use App\Models\MessagingChannel;
use App\Models\Organization;
use App\Models\Ticket;
use Illuminate\Support\Facades\DB;

/**
 * Service for handling auto-reply message variables.
 */
class AutoReplyVariableService
{
    /**
     * Get available variables for auto-reply messages.
     *
     * @return array<array{key: string, label: string, description: string, example: string}>
     */
    public function getAvailableVariables(): array
    {
        return [
            [
                'key' => 'contact_name',
                'label' => 'Contact Name',
                'description' => 'The customer\'s name',
                'example' => 'John Doe',
            ],
            [
                'key' => 'contact_first_name',
                'label' => 'Contact First Name',
                'description' => 'The customer\'s first name',
                'example' => 'John',
            ],
            [
                'key' => 'ticket_number',
                'label' => 'Ticket Number',
                'description' => 'The generated ticket reference number',
                'example' => 'TKT-00001',
            ],
            [
                'key' => 'average_response_time',
                'label' => 'Average Response Time',
                'description' => 'Average response time in a human-readable format',
                'example' => '15 minutes',
            ],
            [
                'key' => 'organization_name',
                'label' => 'Organization Name',
                'description' => 'Your organization\'s name',
                'example' => 'Acme Corp',
            ],
            [
                'key' => 'channel_name',
                'label' => 'Channel Name',
                'description' => 'The messaging channel name',
                'example' => '@acme_support',
            ],
            [
                'key' => 'current_time',
                'label' => 'Current Time',
                'description' => 'Current time in the organization\'s timezone',
                'example' => '14:30',
            ],
            [
                'key' => 'current_date',
                'label' => 'Current Date',
                'description' => 'Current date in the organization\'s timezone',
                'example' => 'December 31, 2025',
            ],
        ];
    }

    /**
     * Substitute variables in a message template.
     *
     * @param  array<string, mixed>  $context
     */
    public function substitute(string $template, array $context): string
    {
        foreach ($context as $key => $value) {
            $template = str_replace('{{'.$key.'}}', (string) $value, $template);
        }

        // Remove any unsubstituted variables
        $template = preg_replace('/\{\{[^}]+\}\}/', '', $template);

        return trim($template);
    }

    /**
     * Build context for auto-reply variable substitution.
     *
     * @return array<string, mixed>
     */
    public function buildContext(
        Ticket $ticket,
        MessagingChannel $channel,
        Contact $contact
    ): array {
        $organization = $channel->organization;

        return [
            'contact_name' => $contact->name ?? $contact->display_name,
            'contact_first_name' => $this->getFirstName($contact->name),
            'ticket_number' => $ticket->ticket_number,
            'average_response_time' => $this->formatAverageResponseTime(
                $this->getAverageResponseTime($organization)
            ),
            'organization_name' => $organization->name,
            'channel_name' => $channel->display_name,
            'current_time' => now($organization->settings?->timezone ?? 'UTC')->format('H:i'),
            'current_date' => now($organization->settings?->timezone ?? 'UTC')->format('F j, Y'),
        ];
    }

    /**
     * Get the average response time in minutes for an organization.
     */
    public function getAverageResponseTime(Organization $organization): ?int
    {
        // Try to get from the average reply times table
        $avgTime = DB::table('sla_average_reply_times')
            ->where('organization_id', $organization->id)
            ->orderByDesc('calculated_at')
            ->value('average_minutes');

        if ($avgTime !== null) {
            return (int) $avgTime;
        }

        // Fall back to calculating from recent tickets
        $avgSeconds = DB::table('tickets')
            ->where('organization_id', $organization->id)
            ->whereNotNull('first_response_at')
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('AVG(TIMESTAMPDIFF(SECOND, created_at, first_response_at)) as avg_seconds')
            ->value('avg_seconds');

        if ($avgSeconds !== null) {
            return (int) ceil($avgSeconds / 60);
        }

        return null;
    }

    /**
     * Format average response time as a human-readable string.
     */
    public function formatAverageResponseTime(?int $minutes): string
    {
        if ($minutes === null) {
            return 'shortly';
        }

        if ($minutes < 60) {
            return "{$minutes} minute".($minutes !== 1 ? 's' : '');
        }

        $hours = (int) floor($minutes / 60);
        if ($hours < 24) {
            return "{$hours} hour".($hours !== 1 ? 's' : '');
        }

        $days = (int) floor($hours / 24);

        return "{$days} day".($days !== 1 ? 's' : '');
    }

    /**
     * Get the first name from a full name.
     */
    private function getFirstName(?string $fullName): string
    {
        if (! $fullName) {
            return '';
        }

        $parts = explode(' ', trim($fullName));

        return $parts[0];
    }

    /**
     * Preview a template with sample data.
     */
    public function preview(string $template, Organization $organization): string
    {
        $sampleContext = [
            'contact_name' => 'John Doe',
            'contact_first_name' => 'John',
            'ticket_number' => 'TKT-00001',
            'average_response_time' => '15 minutes',
            'organization_name' => $organization->name,
            'channel_name' => '@support',
            'current_time' => now($organization->settings?->timezone ?? 'UTC')->format('H:i'),
            'current_date' => now($organization->settings?->timezone ?? 'UTC')->format('F j, Y'),
        ];

        return $this->substitute($template, $sampleContext);
    }
}
