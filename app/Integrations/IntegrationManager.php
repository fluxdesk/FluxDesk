<?php

namespace App\Integrations;

use App\Integrations\Contracts\Integration;

/**
 * Manages integration discovery and retrieval.
 *
 * Auto-discovers all Integration classes in integration folders.
 * Each integration lives in its own folder: FolderName/FolderNameIntegration.php
 * New integrations are automatically available without manual registration.
 */
class IntegrationManager
{
    /**
     * Discovered integrations indexed by identifier.
     *
     * @var array<string, Integration>
     */
    protected array $integrations = [];

    public function __construct()
    {
        $this->discover();
    }

    /**
     * Auto-discover all Integration classes from integration folders.
     *
     * Convention: Each integration lives in FolderName/FolderNameIntegration.php
     */
    protected function discover(): void
    {
        $basePath = app_path('Integrations');
        $entries = scandir($basePath);

        if ($entries === false) {
            return;
        }

        foreach ($entries as $folder) {
            $folderPath = $basePath.'/'.$folder;

            // Skip non-directories, hidden folders, and special folders
            if (! is_dir($folderPath) || str_starts_with($folder, '.') || $folder === 'Contracts') {
                continue;
            }

            // Convention: FolderName/FolderNameIntegration.php
            $class = "App\\Integrations\\{$folder}\\{$folder}Integration";

            if (class_exists($class) && is_subclass_of($class, Integration::class)) {
                /** @var Integration $instance */
                $instance = app($class);
                $this->integrations[$instance->identifier()] = $instance;
            }
        }
    }

    /**
     * Get all discovered integrations.
     *
     * @return array<string, Integration>
     */
    public function all(): array
    {
        return $this->integrations;
    }

    /**
     * Get an integration by identifier.
     */
    public function get(string $identifier): ?Integration
    {
        return $this->integrations[$identifier] ?? null;
    }

    /**
     * Check if an integration exists.
     */
    public function has(string $identifier): bool
    {
        return isset($this->integrations[$identifier]);
    }

    /**
     * Get integrations filtered by category.
     *
     * @return array<string, Integration>
     */
    public function byCategory(string $category): array
    {
        return array_filter(
            $this->integrations,
            fn (Integration $integration): bool => $integration->category() === $category
        );
    }

    /**
     * Get all integrations grouped by category.
     *
     * @return array<string, array<string, Integration>>
     */
    public function groupedByCategory(): array
    {
        $grouped = [];
        foreach ($this->integrations as $identifier => $integration) {
            $category = $integration->category();
            $grouped[$category][$identifier] = $integration;
        }

        return $grouped;
    }

    /**
     * Get integration for an email provider.
     * Convenience method for email channel integration.
     */
    public function forEmailProvider(string $provider): ?Integration
    {
        return $this->get($provider);
    }
}
