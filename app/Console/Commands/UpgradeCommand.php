<?php

namespace App\Console\Commands;

use App\Services\VersionCheckService;
use Illuminate\Console\Command;

use function Laravel\Prompts\info;
use function Laravel\Prompts\spin;

class UpgradeCommand extends Command
{
    protected $signature = 'fluxdesk:upgrade';

    protected $description = 'Run upgrade tasks after updating FluxDesk to a new version';

    public function handle(VersionCheckService $versionCheckService): int
    {
        $this->showIntro();

        $this->line('');

        // Step 1: Clear version cache
        spin(fn () => $versionCheckService->flushVersionCache(), 'Clearing version cache...');
        info('Version cache cleared.');

        $this->line('');

        // Step 2: Run migrations
        spin(fn () => $this->callSilently('migrate', ['--force' => true]), 'Running database migrations...');
        info('Database migrations complete.');

        $this->line('');

        // Step 3: Clear and rebuild caches
        spin(fn () => $this->callSilently('optimize:clear'), 'Clearing application caches...');
        info('Application caches cleared.');

        $this->line('');

        // Step 4: Cache routes
        spin(fn () => $this->callSilently('route:cache'), 'Caching routes...');
        info('Routes cached.');

        $this->line('');

        // Step 5: Cache views
        spin(fn () => $this->callSilently('view:cache'), 'Caching views...');
        info('Views cached.');

        $this->line('');

        // Step 6: Cache config
        spin(fn () => $this->callSilently('config:cache'), 'Caching configuration...');
        info('Configuration cached.');

        $this->line('');
        $this->line('');

        $version = config('app.version', '1.0.0');
        info("FluxDesk has been upgraded to version {$version}!");

        $this->line('');

        return Command::SUCCESS;
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
