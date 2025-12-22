<?php

namespace Database\Factories;

use App\Enums\EmailProvider;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EmailChannel>
 */
class EmailChannelFactory extends Factory
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
            'email_address' => fake()->unique()->safeEmail(),
            'provider' => EmailProvider::Microsoft365,
            'is_active' => true,
            'is_default' => false,
            'sync_interval_minutes' => 5,
            'fetch_folder' => 'INBOX',
            'auto_reply_enabled' => false,
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
     * Indicate the channel uses Microsoft 365.
     */
    public function microsoft365(): static
    {
        return $this->state(fn (array $attributes) => [
            'provider' => EmailProvider::Microsoft365,
        ]);
    }

    /**
     * Indicate the channel uses Google Workspace.
     */
    public function google(): static
    {
        return $this->state(fn (array $attributes) => [
            'provider' => EmailProvider::Google,
        ]);
    }

    /**
     * Indicate the channel has OAuth tokens configured.
     */
    public function authenticated(): static
    {
        return $this->state(fn (array $attributes) => [
            'oauth_token' => encrypt('fake-oauth-token'),
            'oauth_refresh_token' => encrypt('fake-refresh-token'),
            'oauth_token_expires_at' => now()->addHour(),
        ]);
    }

    /**
     * Indicate the channel has an expired OAuth token.
     */
    public function expiredToken(): static
    {
        return $this->state(fn (array $attributes) => [
            'oauth_token' => encrypt('fake-oauth-token'),
            'oauth_refresh_token' => encrypt('fake-refresh-token'),
            'oauth_token_expires_at' => now()->subHour(),
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
     * Indicate the channel needs configuration (authenticated but not configured).
     */
    public function needsConfiguration(): static
    {
        return $this->state(fn (array $attributes) => [
            'oauth_token' => encrypt('fake-oauth-token'),
            'oauth_refresh_token' => encrypt('fake-refresh-token'),
            'oauth_token_expires_at' => now()->addHour(),
            'fetch_folder' => null,
            'is_active' => false,
        ]);
    }
}
