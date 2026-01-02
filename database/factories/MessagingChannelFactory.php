<?php

namespace Database\Factories;

use App\Enums\MessagingProvider;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MessagingChannel>
 */
class MessagingChannelFactory extends Factory
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
            'name' => fake()->word().' Support',
            'provider' => MessagingProvider::Instagram,
            'external_id' => fake()->unique()->numerify('############'),
            'external_name' => fake()->company(),
            'external_username' => fake()->userName(),
            'is_active' => true,
            'is_default' => false,
            'auto_reply_enabled' => false,
            'auto_reply_delay_seconds' => 0,
            'auto_reply_business_hours_only' => false,
        ];
    }

    /**
     * Indicate the channel is the default.
     */
    public function default(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_default' => true,
        ]);
    }

    /**
     * Indicate the channel is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate the channel uses Instagram.
     */
    public function instagram(): static
    {
        return $this->state(fn (array $attributes) => [
            'provider' => MessagingProvider::Instagram,
        ]);
    }

    /**
     * Indicate the channel uses Facebook Messenger.
     */
    public function facebookMessenger(): static
    {
        return $this->state(fn (array $attributes) => [
            'provider' => MessagingProvider::FacebookMessenger,
        ]);
    }

    /**
     * Indicate the channel uses WhatsApp.
     */
    public function whatsapp(): static
    {
        return $this->state(fn (array $attributes) => [
            'provider' => MessagingProvider::WhatsApp,
        ]);
    }

    /**
     * Indicate the channel has OAuth tokens configured.
     */
    public function authenticated(): static
    {
        return $this->state(fn (array $attributes) => [
            'access_token' => 'fake-access-token',
            'refresh_token' => 'fake-refresh-token',
            'token_expires_at' => now()->addDays(30),
        ]);
    }

    /**
     * Indicate the channel has an expired OAuth token.
     */
    public function expiredToken(): static
    {
        return $this->state(fn (array $attributes) => [
            'access_token' => 'fake-access-token',
            'refresh_token' => 'fake-refresh-token',
            'token_expires_at' => now()->subHour(),
        ]);
    }

    /**
     * Indicate the channel was recently synced.
     */
    public function synced(): static
    {
        return $this->state(fn (array $attributes) => [
            'last_sync_at' => now(),
            'last_sync_error' => null,
        ]);
    }

    /**
     * Indicate the channel has a sync error.
     */
    public function withSyncError(string $error = 'Sync failed'): static
    {
        return $this->state(fn (array $attributes) => [
            'last_sync_at' => now(),
            'last_sync_error' => $error,
        ]);
    }

    /**
     * Indicate the channel has auto-reply enabled.
     */
    public function withAutoReply(string $message = 'Thank you for contacting us!'): static
    {
        return $this->state(fn (array $attributes) => [
            'auto_reply_enabled' => true,
            'auto_reply_message' => $message,
            'auto_reply_delay_seconds' => 0,
        ]);
    }

    /**
     * Indicate the channel needs configuration (authenticated but not configured).
     */
    public function needsConfiguration(): static
    {
        return $this->state(fn (array $attributes) => [
            'access_token' => 'fake-access-token',
            'external_id' => null,
            'is_active' => false,
        ]);
    }
}
