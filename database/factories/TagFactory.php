<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tag>
 */
class TagFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->word();

        return [
            'organization_id' => \App\Models\Organization::factory(),
            'name' => ucfirst($name),
            'slug' => \Illuminate\Support\Str::slug($name),
            'color' => fake()->hexColor(),
        ];
    }
}
