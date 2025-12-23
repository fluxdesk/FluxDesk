<?php

namespace App\Console\Commands;

use App\Services\VersionCheckService;
use Illuminate\Console\Command;

use function Laravel\Prompts\info;
use function Laravel\Prompts\warning;

class VersionCheckCommand extends Command
{
    protected $signature = 'fluxdesk:version
                            {--check : Check for available updates}
                            {--refresh : Force refresh the version cache}';

    protected $description = 'Display the current FluxDesk version and optionally check for updates';

    public function handle(VersionCheckService $versionCheckService): int
    {
        $currentVersion = $versionCheckService->getCurrentVersion();

        $this->line('');
        $this->line("  <fg=cyan>FluxDesk</> <fg=white;options=bold>v{$currentVersion}</>");
        $this->line('');

        if ($this->option('refresh')) {
            $versionCheckService->refreshVersionData();
            info('Version cache refreshed.');
            $this->line('');
        }

        if ($this->option('check') || $this->option('refresh')) {
            $status = $versionCheckService->getVersionStatus();

            if ($status['latest'] === null) {
                warning('Could not check for updates. Please check your internet connection.');

                return Command::FAILURE;
            }

            if ($status['is_outdated']) {
                warning("A new version is available: v{$status['latest']}");
                $this->line('');
                $this->line("  <fg=gray>Release:</> {$status['release_name']}");
                $this->line("  <fg=gray>Published:</> {$status['published_at']}");
                $this->line("  <fg=gray>URL:</> {$status['release_url']}");
                $this->line('');
                info('Run "php artisan fluxdesk:upgrade" after updating your files.');
            } else {
                info('You are running the latest version.');
            }

            $this->line('');
        }

        return Command::SUCCESS;
    }
}
