<?php

namespace App\Integrations\Contracts;

use App\Models\OrganizationIntegration;

/**
 * Abstract base class for all integrations.
 *
 * Each integration is a self-contained class that provides everything needed:
 * metadata, credential fields, OAuth configuration, and connection testing.
 *
 * To create a new integration:
 * 1. Create a folder in app/Integrations/ (e.g., Todoist/)
 * 2. Create FolderNameIntegration.php extending this class
 * 3. The integration will be auto-discovered
 */
abstract class Integration
{
    /**
     * Get the unique identifier for this integration.
     *
     * @example 'microsoft365', 'google', 'todoist'
     */
    abstract public function identifier(): string;

    /**
     * Get the human-readable name.
     *
     * @example 'Microsoft 365', 'Google Workspace'
     */
    abstract public function name(): string;

    /**
     * Get the description shown to users.
     */
    abstract public function description(): string;

    /**
     * Get the icon identifier or SVG path.
     *
     * @example 'microsoft', 'google', or a custom SVG
     */
    abstract public function icon(): string;

    /**
     * Get the authentication type.
     *
     * @return string 'oauth' or 'api_key'
     */
    abstract public function authType(): string;

    /**
     * Get the category for grouping integrations in the UI.
     *
     * @return string 'email', 'ai', or other category identifiers
     */
    public function category(): string
    {
        return 'general';
    }

    /**
     * Check if this integration uses OAuth.
     */
    public function isOAuth(): bool
    {
        return $this->authType() === 'oauth';
    }

    /**
     * Define the credential fields required by this integration.
     *
     * Each field should have:
     * - name: The field key (stored in credentials JSON)
     * - label: The human-readable label
     * - type: 'text' or 'password'
     * - required: Whether the field is required
     * - default: Optional default value
     * - hint: Optional help text
     *
     * @return array<array{name: string, label: string, type: string, required: bool, default?: string, hint?: string}>
     */
    abstract public function credentialFields(): array;

    /**
     * Get the OAuth redirect URI for this integration.
     * Override in OAuth integrations.
     */
    public function redirectUri(): string
    {
        return '';
    }

    /**
     * Get the OAuth scopes for this integration.
     * Override in OAuth integrations.
     *
     * @return array<string>
     */
    public function scopes(): array
    {
        return [];
    }

    /**
     * Build the OAuth authorization URL.
     * Override in OAuth integrations.
     *
     * @param  array<string, mixed>  $credentials
     */
    public function authorizationUrl(array $credentials, string $state): string
    {
        return '';
    }

    /**
     * Get the OAuth token endpoint URL.
     * Override in OAuth integrations.
     *
     * @param  array<string, mixed>  $credentials
     */
    public function tokenUrl(array $credentials): string
    {
        return '';
    }

    /**
     * Test the connection with the configured credentials.
     *
     * @return array{success: bool, message: string}
     */
    abstract public function testConnection(OrganizationIntegration $integration): array;

    /**
     * Get validation rules based on credential fields.
     *
     * @return array<string, string>
     */
    public function validationRules(): array
    {
        return collect($this->credentialFields())
            ->mapWithKeys(fn (array $field): array => [
                $field['name'] => $field['required'] ? 'required|string|max:1000' : 'nullable|string|max:1000',
            ])->all();
    }

    /**
     * Get a credential value from the integration.
     */
    public function getCredential(OrganizationIntegration $integration, string $key, mixed $default = null): mixed
    {
        return $integration->credentials[$key] ?? $default;
    }

    /**
     * Get the credential field names.
     *
     * @return array<string>
     */
    public function credentialFieldNames(): array
    {
        return array_column($this->credentialFields(), 'name');
    }
}
