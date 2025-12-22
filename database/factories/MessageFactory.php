<?php

namespace Database\Factories;

use App\Enums\MessageType;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Message>
 */
class MessageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'ticket_id' => Ticket::factory(),
            'user_id' => User::factory(),
            'contact_id' => null,
            'type' => MessageType::Reply,
            'body' => fake()->paragraphs(2, true),
            'body_html' => null,
            'is_from_contact' => false,
            'email_message_id' => null,
            'email_in_reply_to' => null,
            'email_references' => null,
        ];
    }

    public function fromContact(): static
    {
        return $this->state(function (array $attributes) {
            $ticket = Ticket::find($attributes['ticket_id']);

            return [
                'user_id' => null,
                'contact_id' => $ticket?->contact_id,
                'is_from_contact' => true,
            ];
        });
    }

    public function note(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => MessageType::Note,
        ]);
    }

    public function system(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => MessageType::System,
            'user_id' => null,
        ]);
    }
}
