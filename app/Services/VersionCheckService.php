<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Check for application updates from GitHub releases.
 */
class VersionCheckService
{
    private const CACHE_KEY = 'fluxdesk_latest_version';

    private const CACHE_TTL = 3600; // 1 hour

    /**
     * Get the current application version.
     */
    public function getCurrentVersion(): string
    {
        return config('app.version', '1.0.0');
    }

    /**
     * Get the GitHub repository.
     */
    public function getGitHubRepo(): string
    {
        return config('app.github_repo', 'fluxdesk/FluxDesk');
    }

    /**
     * Get the latest version information from GitHub.
     *
     * @return array{version: string, url: string, published_at: string, body: string}|null
     */
    public function getLatestVersion(): ?array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return $this->fetchLatestVersionFromGitHub();
        });
    }

    /**
     * Fetch the latest release from GitHub API.
     *
     * @return array{version: string, url: string, published_at: string, body: string}|null
     */
    private function fetchLatestVersionFromGitHub(): ?array
    {
        try {
            $repo = $this->getGitHubRepo();
            $response = Http::timeout(10)
                ->withHeaders([
                    'Accept' => 'application/vnd.github.v3+json',
                    'User-Agent' => 'FluxDesk-Update-Checker',
                ])
                ->get("https://api.github.com/repos/{$repo}/releases/latest");

            if (! $response->successful()) {
                Log::warning('Failed to fetch latest version from GitHub', [
                    'status' => $response->status(),
                ]);

                return null;
            }

            $data = $response->json();

            // Extract version from tag_name (remove 'v' prefix if present)
            $version = ltrim($data['tag_name'] ?? '', 'v');

            return [
                'version' => $version,
                'url' => $data['html_url'] ?? '',
                'published_at' => $data['published_at'] ?? '',
                'body' => $data['body'] ?? '',
                'name' => $data['name'] ?? $version,
            ];
        } catch (\Exception $e) {
            Log::warning('Exception while checking for updates', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Check if the current version is outdated.
     */
    public function isOutOfDate(): bool
    {
        $latest = $this->getLatestVersion();

        if (! $latest) {
            return false;
        }

        return version_compare($this->getCurrentVersion(), $latest['version'], '<');
    }

    /**
     * Get version comparison result.
     *
     * @return array{current: string, latest: string|null, is_outdated: bool, release_url: string|null, release_notes: string|null, published_at: string|null}
     */
    public function getVersionStatus(): array
    {
        $current = $this->getCurrentVersion();
        $latest = $this->getLatestVersion();

        return [
            'current' => $current,
            'latest' => $latest['version'] ?? null,
            'is_outdated' => $this->isOutOfDate(),
            'release_url' => $latest['url'] ?? null,
            'release_notes' => $latest['body'] ?? null,
            'release_name' => $latest['name'] ?? null,
            'published_at' => $latest['published_at'] ?? null,
        ];
    }

    /**
     * Flush the version cache.
     */
    public function flushVersionCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Force refresh the version data.
     *
     * @return array{version: string, url: string, published_at: string, body: string}|null
     */
    public function refreshVersionData(): ?array
    {
        $this->flushVersionCache();

        return $this->getLatestVersion();
    }
}
