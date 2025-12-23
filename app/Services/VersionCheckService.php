<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

/**
 * Check for application updates from GitHub releases.
 */
class VersionCheckService
{
    private const CACHE_KEY_LATEST = 'fluxdesk_latest_version';

    private const CACHE_KEY_CURRENT = 'fluxdesk_current_version';

    private const CACHE_TTL = 3600; // 1 hour

    private const CACHE_TTL_CURRENT = 86400; // 24 hours for current version

    /**
     * Get the current application version from git tag.
     */
    public function getCurrentVersion(): string
    {
        return Cache::remember(self::CACHE_KEY_CURRENT, self::CACHE_TTL_CURRENT, function () {
            return $this->getVersionFromGitTag();
        });
    }

    /**
     * Get the version from the current git tag.
     */
    private function getVersionFromGitTag(): string
    {
        try {
            $result = Process::run('git describe --tags --abbrev=0');

            if ($result->successful()) {
                $version = trim($result->output());

                // Remove 'v' prefix if present and return
                return ltrim($version, 'v');
            }

            Log::warning('Failed to get git tag', [
                'error' => $result->errorOutput(),
            ]);
        } catch (Exception $e) {
            Log::warning('Exception while getting git tag', [
                'error' => $e->getMessage(),
            ]);
        }

        // Fallback: try to read from .version file if it exists
        $versionFile = base_path('.version');
        if (file_exists($versionFile)) {
            return trim(file_get_contents($versionFile));
        }

        return 'unknown';
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
        return Cache::remember(self::CACHE_KEY_LATEST, self::CACHE_TTL, function () {
            return $this->fetchLatestVersionFromGitHub();
        });
    }

    /**
     * Fetch the latest tags from remote to ensure we have up-to-date version info.
     */
    private function fetchLatestTags(): void
    {
        try {
            Process::run('git fetch --tags --quiet');
        } catch (Exception $e) {
            Log::warning('Failed to fetch latest git tags', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Fetch the latest release from GitHub API.
     *
     * @return array{version: string, url: string, published_at: string, body: string}|null
     */
    private function fetchLatestVersionFromGitHub(): ?array
    {
        // Fetch latest tags from remote before checking
        $this->fetchLatestTags();

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
     * Flush the version cache (both current and latest).
     */
    public function flushVersionCache(): void
    {
        Cache::forget(self::CACHE_KEY_LATEST);
        Cache::forget(self::CACHE_KEY_CURRENT);
    }

    /**
     * Flush only the current version cache.
     */
    public function flushCurrentVersionCache(): void
    {
        Cache::forget(self::CACHE_KEY_CURRENT);
    }

    /**
     * Flush only the latest version cache.
     */
    public function flushLatestVersionCache(): void
    {
        Cache::forget(self::CACHE_KEY_LATEST);
    }

    /**
     * Force refresh the version data.
     *
     * @return array{current: string, latest: array{version: string, url: string, published_at: string, body: string}|null}
     */
    public function refreshVersionData(): array
    {
        $this->flushVersionCache();

        return [
            'current' => $this->getCurrentVersion(),
            'latest' => $this->getLatestVersion(),
        ];
    }

    /**
     * Get PHP version.
     */
    public function getPhpVersion(): string
    {
        return phpversion();
    }

    /**
     * Get the full version status including environment info.
     *
     * @return array{current: string, latest: string|null, is_outdated: bool, release_url: string|null, release_notes: string|null, published_at: string|null, php_version: string}
     */
    public function getFullStatus(): array
    {
        return array_merge($this->getVersionStatus(), [
            'php_version' => $this->getPhpVersion(),
        ]);
    }

    /**
     * Get cached version status without making external requests.
     * Returns null if no cached data is available.
     *
     * This is safe to call on every request as it never blocks on external services.
     *
     * @return array{current: string, latest: string|null, is_outdated: bool, release_url: string|null, release_notes: string|null, published_at: string|null}|null
     */
    public function getCachedVersionStatus(): ?array
    {
        $current = Cache::get(self::CACHE_KEY_CURRENT);
        $latest = Cache::get(self::CACHE_KEY_LATEST);

        // If we don't have current version cached, get it (this is fast, just local git)
        if ($current === null) {
            $current = $this->getVersionFromGitTag();
        }

        return [
            'current' => $current,
            'latest' => $latest['version'] ?? null,
            'is_outdated' => $latest ? version_compare($current, $latest['version'], '<') : false,
            'release_url' => $latest['url'] ?? null,
            'release_notes' => $latest['body'] ?? null,
            'release_name' => $latest['name'] ?? null,
            'published_at' => $latest['published_at'] ?? null,
        ];
    }
}
