<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Sla;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Company>
 */
class CompanyFactory extends Factory
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
            'name' => fake()->company(),
            'email' => fake()->optional()->companyEmail(),
            'phone' => fake()->optional()->phoneNumber(),
            'website' => fake()->optional()->url(),
            'address' => fake()->optional()->address(),
            'notes' => fake()->optional()->sentence(),
            'domains' => fake()->optional()->randomElement([
                null,
                [fake()->domainName()],
                [fake()->domainName(), fake()->domainName()],
            ]),
        ];
    }

    /**
     * Associate the company with a specific SLA.
     */
    public function withSla(?Sla $sla = null): static
    {
        return $this->state(fn (array $attributes) => [
            'sla_id' => $sla?->id ?? Sla::factory(),
        ]);
    }

    /**
     * Set specific domains for the company.
     *
     * @param  array<string>|string  $domains
     */
    public function withDomains(array|string $domains): static
    {
        return $this->state(fn (array $attributes) => [
            'domains' => is_array($domains) ? $domains : [$domains],
        ]);
    }
}
