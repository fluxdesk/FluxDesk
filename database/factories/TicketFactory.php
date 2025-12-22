<?php

namespace Database\Factories;

use App\Enums\TicketChannel;
use App\Models\Contact;
use App\Models\Organization;
use App\Models\Priority;
use App\Models\Status;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Ticket>
 */
class TicketFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'ticket_number' => 'TKT-'.str_pad((string) fake()->unique()->numberBetween(1, 99999), 5, '0', STR_PAD_LEFT),
            'subject' => fake()->sentence(),
            'contact_id' => Contact::factory(),
            'status_id' => Status::factory(),
            'priority_id' => Priority::factory(),
            'sla_id' => null,
            'assigned_to' => null,
            'channel' => fake()->randomElement(TicketChannel::cases()),
            'first_response_at' => null,
            'sla_first_response_due_at' => null,
            'sla_resolution_due_at' => null,
            'resolved_at' => null,
            'closed_at' => null,
        ];
    }

    public function forOrganization(Organization $organization): static
    {
        return $this->state(fn (array $attributes) => [
            'organization_id' => $organization->id,
            'contact_id' => Contact::factory()->for($organization),
            'status_id' => Status::factory()->for($organization),
            'priority_id' => Priority::factory()->for($organization),
        ]);
    }

    public function assigned(\App\Models\User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'assigned_to' => $user->id,
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn (array $attributes) => [
            'closed_at' => now(),
            'resolved_at' => now()->subHour(),
        ]);
    }
}
