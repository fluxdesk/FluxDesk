<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class OrganizationSettings extends Model
{
    protected $fillable = [
        'organization_id',
        'logo_path',
        'email_logo_path',
        'primary_color',
        'secondary_color',
        'accent_color',
        'email_background_color',
        'email_footer_text',
        'ticket_prefix',
        'ticket_number_format',
        'use_random_numbers',
        'random_number_length',
        'next_ticket_number',
        'timezone',
        'business_hours',
        'system_email_channel_id',
        'system_emails_enabled',
        'portal_enabled',
        'custom_domain',
        'custom_domain_verified',
        'custom_domain_verified_at',
        'share_sla_times_with_contacts',
        'share_average_reply_time',
        'sla_reminder_intervals',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'next_ticket_number' => 'integer',
            'use_random_numbers' => 'boolean',
            'random_number_length' => 'integer',
            'business_hours' => 'array',
            'share_sla_times_with_contacts' => 'boolean',
            'share_average_reply_time' => 'boolean',
            'sla_reminder_intervals' => 'array',
            'system_emails_enabled' => 'boolean',
            'portal_enabled' => 'boolean',
            'custom_domain_verified' => 'boolean',
            'custom_domain_verified_at' => 'datetime',
        ];
    }

    /**
     * Get the SLA reminder intervals sorted in descending order.
     *
     * @return array<int>
     */
    public function getSortedSlaReminderIntervals(): array
    {
        $intervals = $this->sla_reminder_intervals ?? [];

        if (empty($intervals)) {
            return [];
        }

        rsort($intervals);

        return $intervals;
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function systemEmailChannel(): BelongsTo
    {
        return $this->belongsTo(EmailChannel::class, 'system_email_channel_id');
    }

    /**
     * Check if system emails are enabled for this organization.
     *
     * This is used by import modules and notification services to determine
     * if emails should be sent. Defaults to true if not explicitly set.
     */
    public function areSystemEmailsEnabled(): bool
    {
        return $this->system_emails_enabled ?? true;
    }

    /**
     * Check if the customer portal is enabled for this organization.
     * Defaults to true if not explicitly set.
     */
    public function isPortalEnabled(): bool
    {
        return $this->portal_enabled ?? true;
    }

    /**
     * Generate a ticket number using the configured format.
     *
     * Supported variables:
     * - {prefix} - The configured ticket prefix
     * - {number} - Sequential ticket number (padded to 5 digits)
     * - {random} - Random alphanumeric string (length configurable)
     * - {yyyy} - Full year (e.g., 2025)
     * - {yy} - Short year (e.g., 25)
     * - {y} - Short year (same as {yy})
     * - {mm} - Month with leading zero (e.g., 01-12)
     * - {m} - Month without leading zero (e.g., 1-12)
     * - {dd} - Day with leading zero (e.g., 01-31)
     * - {d} - Day without leading zero (e.g., 1-31)
     */
    public function generateTicketNumber(): string
    {
        $now = now($this->timezone ?? 'UTC');

        // Build the number component (sequential or random)
        if ($this->use_random_numbers) {
            $number = $this->generateUniqueRandomNumber();
        } else {
            $number = str_pad((string) $this->next_ticket_number, 5, '0', STR_PAD_LEFT);
            $this->increment('next_ticket_number');
        }

        // Replace all variables
        $replacements = [
            '{prefix}' => $this->ticket_prefix,
            '{number}' => $number,
            '{random}' => $this->generateRandomString(),
            '{yyyy}' => $now->format('Y'),
            '{yy}' => $now->format('y'),
            '{y}' => $now->format('y'),
            '{mm}' => $now->format('m'),
            '{m}' => $now->format('n'),
            '{dd}' => $now->format('d'),
            '{d}' => $now->format('j'),
        ];

        return str_replace(
            array_keys($replacements),
            array_values($replacements),
            $this->ticket_number_format
        );
    }

    /**
     * Generate a random alphanumeric string.
     */
    protected function generateRandomString(): string
    {
        $length = $this->random_number_length ?? 6;

        return strtoupper(Str::random($length));
    }

    /**
     * Generate a unique random number that doesn't already exist.
     */
    protected function generateUniqueRandomNumber(): string
    {
        $length = $this->random_number_length ?? 6;
        $maxAttempts = 100;
        $attempts = 0;

        do {
            // Generate random string of digits
            $random = '';
            for ($i = 0; $i < $length; $i++) {
                $random .= random_int(0, 9);
            }

            // Check if this number format already exists
            $testNumber = str_replace(
                ['{prefix}', '{number}', '{random}'],
                [$this->ticket_prefix, $random, $random],
                $this->ticket_number_format
            );

            // Check if ticket exists with similar prefix pattern
            $exists = Ticket::withoutGlobalScopes()
                ->where('organization_id', $this->organization_id)
                ->where('ticket_number', 'LIKE', $this->ticket_prefix.'%')
                ->where('ticket_number', $testNumber)
                ->exists();

            $attempts++;
        } while ($exists && $attempts < $maxAttempts);

        return $random;
    }

    /**
     * Get a preview of what a ticket number would look like.
     */
    public function previewTicketNumber(): string
    {
        $now = now($this->timezone ?? 'UTC');

        $number = str_pad((string) ($this->next_ticket_number ?? 1), 5, '0', STR_PAD_LEFT);

        $replacements = [
            '{prefix}' => $this->ticket_prefix,
            '{number}' => $this->use_random_numbers ? str_repeat('X', $this->random_number_length ?? 6) : $number,
            '{random}' => str_repeat('X', $this->random_number_length ?? 6),
            '{yyyy}' => $now->format('Y'),
            '{yy}' => $now->format('y'),
            '{y}' => $now->format('y'),
            '{mm}' => $now->format('m'),
            '{m}' => $now->format('n'),
            '{dd}' => $now->format('d'),
            '{d}' => $now->format('j'),
        ];

        return str_replace(
            array_keys($replacements),
            array_values($replacements),
            $this->ticket_number_format
        );
    }
}
