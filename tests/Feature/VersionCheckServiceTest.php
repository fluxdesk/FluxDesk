<?php

use App\Services\VersionCheckService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;

beforeEach(function () {
    Cache::flush();
});

test('getCurrentVersion returns version from git tag', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(output: 'v1.2.3'),
    ]);

    $service = new VersionCheckService;
    $version = $service->getCurrentVersion();

    expect($version)->toBe('1.2.3');
});

test('getCurrentVersion strips v prefix from git tag', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(output: 'v2.0.0'),
    ]);

    $service = new VersionCheckService;

    expect($service->getCurrentVersion())->toBe('2.0.0');
});

test('getCurrentVersion handles tags without v prefix', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(output: '1.5.0'),
    ]);

    $service = new VersionCheckService;

    expect($service->getCurrentVersion())->toBe('1.5.0');
});

test('getCurrentVersion caches the result', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(output: 'v1.0.0'),
    ]);

    $service = new VersionCheckService;

    // First call should hit git
    $service->getCurrentVersion();

    // Second call should use cache
    $service->getCurrentVersion();

    Process::assertRan('git describe --tags --abbrev=0');
});

test('getCurrentVersion returns unknown when git fails', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(
            output: '',
            errorOutput: 'fatal: No names found',
            exitCode: 128
        ),
    ]);

    $service = new VersionCheckService;

    expect($service->getCurrentVersion())->toBe('unknown');
});

test('getLatestVersion fetches from GitHub API', function () {
    Http::fake([
        'api.github.com/repos/fluxdesk/FluxDesk/releases/latest' => Http::response([
            'tag_name' => 'v2.0.0',
            'html_url' => 'https://github.com/fluxdesk/FluxDesk/releases/tag/v2.0.0',
            'published_at' => '2024-01-15T10:00:00Z',
            'body' => 'Release notes here',
            'name' => 'Version 2.0.0',
        ]),
    ]);

    $service = new VersionCheckService;
    $latest = $service->getLatestVersion();

    expect($latest)->toBeArray()
        ->and($latest['version'])->toBe('2.0.0')
        ->and($latest['url'])->toBe('https://github.com/fluxdesk/FluxDesk/releases/tag/v2.0.0')
        ->and($latest['name'])->toBe('Version 2.0.0');
});

test('getLatestVersion returns null on API failure', function () {
    Http::fake([
        'api.github.com/*' => Http::response([], 404),
    ]);

    $service = new VersionCheckService;

    expect($service->getLatestVersion())->toBeNull();
});

test('isOutOfDate returns true when current version is older', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(output: 'v1.0.0'),
    ]);

    Http::fake([
        'api.github.com/*' => Http::response([
            'tag_name' => 'v2.0.0',
            'html_url' => 'https://github.com/fluxdesk/FluxDesk/releases/tag/v2.0.0',
            'published_at' => '2024-01-15T10:00:00Z',
            'body' => '',
        ]),
    ]);

    $service = new VersionCheckService;

    expect($service->isOutOfDate())->toBeTrue();
});

test('isOutOfDate returns false when current version is latest', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(output: 'v2.0.0'),
    ]);

    Http::fake([
        'api.github.com/*' => Http::response([
            'tag_name' => 'v2.0.0',
            'html_url' => 'https://github.com/fluxdesk/FluxDesk/releases/tag/v2.0.0',
            'published_at' => '2024-01-15T10:00:00Z',
            'body' => '',
        ]),
    ]);

    $service = new VersionCheckService;

    expect($service->isOutOfDate())->toBeFalse();
});

test('isOutOfDate returns false when current version is newer', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(output: 'v3.0.0'),
    ]);

    Http::fake([
        'api.github.com/*' => Http::response([
            'tag_name' => 'v2.0.0',
            'html_url' => 'https://github.com/fluxdesk/FluxDesk/releases/tag/v2.0.0',
            'published_at' => '2024-01-15T10:00:00Z',
            'body' => '',
        ]),
    ]);

    $service = new VersionCheckService;

    expect($service->isOutOfDate())->toBeFalse();
});

test('isOutOfDate returns false when GitHub API fails', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(output: 'v1.0.0'),
    ]);

    Http::fake([
        'api.github.com/*' => Http::response([], 500),
    ]);

    $service = new VersionCheckService;

    expect($service->isOutOfDate())->toBeFalse();
});

test('flushVersionCache clears both caches', function () {
    Cache::put('fluxdesk_current_version', '1.0.0', 3600);
    Cache::put('fluxdesk_latest_version', ['version' => '2.0.0'], 3600);

    $service = new VersionCheckService;
    $service->flushVersionCache();

    expect(Cache::has('fluxdesk_current_version'))->toBeFalse()
        ->and(Cache::has('fluxdesk_latest_version'))->toBeFalse();
});

test('flushCurrentVersionCache only clears current version', function () {
    Cache::put('fluxdesk_current_version', '1.0.0', 3600);
    Cache::put('fluxdesk_latest_version', ['version' => '2.0.0'], 3600);

    $service = new VersionCheckService;
    $service->flushCurrentVersionCache();

    expect(Cache::has('fluxdesk_current_version'))->toBeFalse()
        ->and(Cache::has('fluxdesk_latest_version'))->toBeTrue();
});

test('flushLatestVersionCache only clears latest version', function () {
    Cache::put('fluxdesk_current_version', '1.0.0', 3600);
    Cache::put('fluxdesk_latest_version', ['version' => '2.0.0'], 3600);

    $service = new VersionCheckService;
    $service->flushLatestVersionCache();

    expect(Cache::has('fluxdesk_current_version'))->toBeTrue()
        ->and(Cache::has('fluxdesk_latest_version'))->toBeFalse();
});

test('getVersionStatus returns complete status array', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(output: 'v1.0.0'),
    ]);

    Http::fake([
        'api.github.com/*' => Http::response([
            'tag_name' => 'v2.0.0',
            'html_url' => 'https://github.com/fluxdesk/FluxDesk/releases/tag/v2.0.0',
            'published_at' => '2024-01-15T10:00:00Z',
            'body' => 'Release notes',
            'name' => 'Version 2.0.0',
        ]),
    ]);

    $service = new VersionCheckService;
    $status = $service->getVersionStatus();

    expect($status)->toBeArray()
        ->and($status['current'])->toBe('1.0.0')
        ->and($status['latest'])->toBe('2.0.0')
        ->and($status['is_outdated'])->toBeTrue()
        ->and($status['release_url'])->toBe('https://github.com/fluxdesk/FluxDesk/releases/tag/v2.0.0')
        ->and($status['release_notes'])->toBe('Release notes')
        ->and($status['release_name'])->toBe('Version 2.0.0');
});

test('getPhpVersion returns current PHP version', function () {
    $service = new VersionCheckService;

    expect($service->getPhpVersion())->toBe(phpversion());
});

test('getFullStatus includes PHP version', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(output: 'v1.0.0'),
    ]);

    Http::fake([
        'api.github.com/*' => Http::response([
            'tag_name' => 'v1.0.0',
            'html_url' => 'https://github.com/fluxdesk/FluxDesk/releases/tag/v1.0.0',
            'published_at' => '2024-01-15T10:00:00Z',
            'body' => '',
        ]),
    ]);

    $service = new VersionCheckService;
    $status = $service->getFullStatus();

    expect($status)->toHaveKey('php_version')
        ->and($status['php_version'])->toBe(phpversion());
});

test('refreshVersionData clears cache and returns fresh data', function () {
    Process::fake([
        'git describe --tags --abbrev=0' => Process::result(output: 'v1.5.0'),
    ]);

    Http::fake([
        'api.github.com/*' => Http::response([
            'tag_name' => 'v2.0.0',
            'html_url' => 'https://github.com/fluxdesk/FluxDesk/releases/tag/v2.0.0',
            'published_at' => '2024-01-15T10:00:00Z',
            'body' => 'Notes',
            'name' => 'v2.0.0',
        ]),
    ]);

    $service = new VersionCheckService;
    $data = $service->refreshVersionData();

    expect($data)->toBeArray()
        ->and($data['current'])->toBe('1.5.0')
        ->and($data['latest'])->toBeArray()
        ->and($data['latest']['version'])->toBe('2.0.0');
});
