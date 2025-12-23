<?php

namespace App\Console\Commands;

use App\Services\VersionCheckService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\error;
use function Laravel\Prompts\info;
use function Laravel\Prompts\spin;
use function Laravel\Prompts\warning;

class UpgradeCommand extends Command
{
    protected $signature = 'fluxdesk:upgrade
                            {--skip-git : Skip git fetch and pull}
                            {--skip-composer : Skip composer install}
                            {--skip-npm : Skip npm install and build}
                            {--skip-maintenance : Skip maintenance mode}
                            {--force : Skip confirmation prompt}';

    protected $description = 'Upgrade FluxDesk to the latest version';

    public function handle(VersionCheckService $versionCheckService): int
    {
        $this->showIntro();

        // Show current version
        $currentVersion = $versionCheckService->getCurrentVersion();
        $this->line("  <fg=gray>Huidige versie:</> <fg=white>v{$currentVersion}</>");

        // Check for updates
        $status = $versionCheckService->getVersionStatus();
        if ($status['latest']) {
            $this->line("  <fg=gray>Nieuwste versie:</> <fg=cyan>v{$status['latest']}</>");
        }

        $this->line('');

        // Confirm upgrade
        if (! $this->option('force')) {
            if (! confirm('Wil je doorgaan met de upgrade?', true)) {
                info('Upgrade geannuleerd.');

                return Command::SUCCESS;
            }
        }

        $this->line('');

        // Step 1: Enable maintenance mode
        if (! $this->option('skip-maintenance')) {
            spin(function () {
                $this->callSilently('down', ['--secret' => 'fluxdesk-upgrade']);
            }, 'Onderhoudsmodus inschakelen...');
            info('Onderhoudsmodus ingeschakeld.');
            $this->line('');
        }

        // Step 2: Git fetch and pull
        if (! $this->option('skip-git')) {
            // Fetch
            $result = spin(function () {
                return Process::timeout(120)->run('git fetch --all --tags');
            }, 'Nieuwste versie ophalen van GitHub...');

            if ($result->successful()) {
                info('Git fetch voltooid.');
            } else {
                warning('Git fetch mislukt: '.$result->errorOutput());
            }
            $this->line('');

            // Pull
            $result = spin(function () {
                return Process::timeout(300)->run('git pull --ff-only');
            }, 'Nieuwe bestanden downloaden...');

            if ($result->successful()) {
                info('Git pull voltooid.');
            } else {
                warning('Git pull mislukt, probeer checkout naar laatste tag...');

                $latestTag = Process::run('git describe --tags $(git rev-list --tags --max-count=1)');
                if ($latestTag->successful()) {
                    $tag = trim($latestTag->output());
                    $checkout = Process::run("git checkout {$tag}");
                    if ($checkout->successful()) {
                        info("Checkout naar {$tag} gelukt.");
                    } else {
                        error('Checkout mislukt: '.$checkout->errorOutput());
                        $this->disableMaintenanceMode();

                        return Command::FAILURE;
                    }
                } else {
                    error('Kon nieuwste tag niet vinden.');
                    $this->disableMaintenanceMode();

                    return Command::FAILURE;
                }
            }
            $this->line('');
        }

        // Step 3: Composer install
        if (! $this->option('skip-composer')) {
            $result = spin(function () {
                return Process::timeout(600)->run('composer install --no-dev --optimize-autoloader --no-interaction');
            }, 'PHP dependencies installeren...');

            if ($result->successful()) {
                info('Composer install voltooid.');
            } else {
                error('Composer install mislukt: '.$result->errorOutput());
                $this->disableMaintenanceMode();

                return Command::FAILURE;
            }
            $this->line('');
        }

        // Step 4: NPM install and build
        if (! $this->option('skip-npm')) {
            // NPM install
            $result = spin(function () {
                return Process::timeout(600)->run('npm install');
            }, 'Node.js dependencies installeren...');

            if ($result->successful()) {
                info('NPM install voltooid.');
            } else {
                error('NPM install mislukt: '.$result->errorOutput());
                $this->disableMaintenanceMode();

                return Command::FAILURE;
            }
            $this->line('');

            // NPM build
            $result = spin(function () {
                return Process::timeout(600)->run('npm run build');
            }, 'Frontend bouwen...');

            if ($result->successful()) {
                info('NPM build voltooid.');
            } else {
                error('NPM build mislukt: '.$result->errorOutput());
                $this->disableMaintenanceMode();

                return Command::FAILURE;
            }
            $this->line('');
        }

        // Step 5: Run migrations
        spin(fn () => $this->callSilently('migrate', ['--force' => true]), 'Database migraties uitvoeren...');
        info('Database migraties voltooid.');
        $this->line('');

        // Step 6: Clear caches
        spin(fn () => $this->callSilently('optimize:clear'), 'Caches legen...');
        info('Caches geleegd.');
        $this->line('');

        // Step 7: Rebuild caches
        spin(function () {
            $this->callSilently('config:cache');
            $this->callSilently('route:cache');
            $this->callSilently('view:cache');
        }, 'Caches opbouwen...');
        info('Caches opgebouwd.');
        $this->line('');

        // Step 8: Clear version cache
        spin(fn () => $versionCheckService->flushVersionCache(), 'Versie cache vernieuwen...');
        $newVersion = $versionCheckService->getCurrentVersion();
        info("Versie bijgewerkt naar v{$newVersion}.");
        $this->line('');

        // Step 9: Disable maintenance mode
        if (! $this->option('skip-maintenance')) {
            $this->disableMaintenanceMode();
            $this->line('');
        }

        // Complete
        $this->line('');
        $this->line('  <fg=green;options=bold>✓ FluxDesk is bijgewerkt naar versie '.$newVersion.'!</>');
        $this->line('');

        return Command::SUCCESS;
    }

    private function disableMaintenanceMode(): void
    {
        try {
            $this->callSilently('up');
            info('Onderhoudsmodus uitgeschakeld.');
        } catch (\Exception $e) {
            warning('Kon onderhoudsmodus niet uitschakelen: '.$e->getMessage());
        }
    }

    private function showIntro(): void
    {
        $this->line('');
        $this->line('  <fg=cyan>  _____ _           ____            _   </>');
        $this->line('  <fg=cyan> |  ___| |_   ___  |  _ \  ___  ___| | __</>');
        $this->line('  <fg=cyan> | |_  | | | | \ \/ / | | |/ _ \/ __| |/ /</>');
        $this->line('  <fg=cyan> |  _| | | |_| |>  <| |_| |  __/\__ \   < </>');
        $this->line('  <fg=cyan> |_|   |_|\__,_/_/\_\____/ \___||___/_|\_\\</>');
        $this->line('');
        $this->line('  <fg=white;options=bold>FluxDesk Upgrade</>');
        $this->line('');
    }
}
