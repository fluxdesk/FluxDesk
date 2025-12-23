<?php

namespace App\Http\Controllers;

use App\Services\VersionCheckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Process;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UpgradeController extends Controller
{
    public function __construct(
        private VersionCheckService $versionCheckService,
    ) {}

    /**
     * Show the upgrade page.
     */
    public function index(): Response
    {
        $status = $this->versionCheckService->getVersionStatus();

        return Inertia::render('upgrade', [
            'versionStatus' => $status,
            'githubRepo' => $this->versionCheckService->getGitHubRepo(),
        ]);
    }

    /**
     * Show the upgrade runner page.
     */
    public function run(): Response
    {
        $status = $this->versionCheckService->getVersionStatus();

        return Inertia::render('upgrade-run', [
            'versionStatus' => $status,
            'currentVersion' => $status['current'],
            'targetVersion' => $status['latest'],
        ]);
    }

    /**
     * Check for updates (AJAX endpoint).
     */
    public function check(): JsonResponse
    {
        $this->versionCheckService->refreshVersionData();
        $status = $this->versionCheckService->getVersionStatus();

        return response()->json($status);
    }

    /**
     * Execute the upgrade process with streaming output.
     */
    public function execute(): StreamedResponse
    {
        return response()->stream(function () {
            // Disable output buffering
            if (ob_get_level()) {
                ob_end_clean();
            }

            $this->sendStep('start', 'Upgrade wordt gestart...', 'pending');

            // Step 1: Enable maintenance mode
            $this->sendStep('maintenance', 'Onderhoudsmodus inschakelen...', 'running');
            try {
                Artisan::call('down', ['--secret' => 'fluxdesk-upgrade']);
                $this->sendStep('maintenance', 'Onderhoudsmodus ingeschakeld', 'completed');
            } catch (\Exception $e) {
                $this->sendStep('maintenance', 'Onderhoudsmodus kon niet worden ingeschakeld: '.$e->getMessage(), 'warning');
            }

            // Step 2: Fetch latest tags
            $this->sendStep('fetch', 'Nieuwste versie ophalen van GitHub...', 'running');
            $result = Process::timeout(120)->run('git fetch --all --tags');
            if ($result->successful()) {
                $this->sendStep('fetch', 'Nieuwste versie opgehaald', 'completed');
            } else {
                $this->sendStep('fetch', 'Git fetch mislukt: '.$result->errorOutput(), 'error');
                $this->finishUpgrade(false);

                return;
            }

            // Step 3: Git pull
            $this->sendStep('pull', 'Nieuwe bestanden downloaden...', 'running');
            $result = Process::timeout(300)->run('git pull --ff-only');
            if ($result->successful()) {
                $this->sendStep('pull', 'Bestanden gedownload', 'completed');
                $this->sendOutput($result->output());
            } else {
                // Try checkout to latest tag instead
                $this->sendStep('pull', 'Pull mislukt, probeer checkout naar laatste tag...', 'warning');
                $latestTag = Process::run('git describe --tags $(git rev-list --tags --max-count=1)');
                if ($latestTag->successful()) {
                    $tag = trim($latestTag->output());
                    $checkout = Process::run("git checkout {$tag}");
                    if ($checkout->successful()) {
                        $this->sendStep('pull', "Checkout naar {$tag} gelukt", 'completed');
                    } else {
                        $this->sendStep('pull', 'Checkout mislukt: '.$checkout->errorOutput(), 'error');
                        $this->finishUpgrade(false);

                        return;
                    }
                } else {
                    $this->sendStep('pull', 'Kon nieuwste tag niet vinden', 'error');
                    $this->finishUpgrade(false);

                    return;
                }
            }

            // Step 4: Composer install
            $this->sendStep('composer', 'PHP dependencies installeren...', 'running');
            $result = Process::timeout(600)->run('composer install --no-dev --optimize-autoloader --no-interaction');
            if ($result->successful()) {
                $this->sendStep('composer', 'PHP dependencies geinstalleerd', 'completed');
            } else {
                $this->sendStep('composer', 'Composer install mislukt: '.$result->errorOutput(), 'error');
                $this->finishUpgrade(false);

                return;
            }

            // Step 5: NPM install
            $this->sendStep('npm_install', 'Node.js dependencies installeren...', 'running');
            $result = Process::timeout(600)->run('npm install');
            if ($result->successful()) {
                $this->sendStep('npm_install', 'Node.js dependencies geinstalleerd', 'completed');
            } else {
                $this->sendStep('npm_install', 'NPM install mislukt: '.$result->errorOutput(), 'error');
                $this->finishUpgrade(false);

                return;
            }

            // Step 6: NPM build
            $this->sendStep('npm_build', 'Frontend bouwen...', 'running');
            $result = Process::timeout(600)->run('npm run build');
            if ($result->successful()) {
                $this->sendStep('npm_build', 'Frontend gebouwd', 'completed');
            } else {
                $this->sendStep('npm_build', 'NPM build mislukt: '.$result->errorOutput(), 'error');
                $this->finishUpgrade(false);

                return;
            }

            // Step 7: Run migrations
            $this->sendStep('migrate', 'Database migraties uitvoeren...', 'running');
            try {
                Artisan::call('migrate', ['--force' => true]);
                $this->sendStep('migrate', 'Database migraties voltooid', 'completed');
                $this->sendOutput(Artisan::output());
            } catch (\Exception $e) {
                $this->sendStep('migrate', 'Migraties mislukt: '.$e->getMessage(), 'error');
                $this->finishUpgrade(false);

                return;
            }

            // Step 8: Clear caches
            $this->sendStep('cache_clear', 'Caches legen...', 'running');
            try {
                Artisan::call('optimize:clear');
                $this->sendStep('cache_clear', 'Caches geleegd', 'completed');
            } catch (\Exception $e) {
                $this->sendStep('cache_clear', 'Cache legen mislukt: '.$e->getMessage(), 'warning');
            }

            // Step 9: Rebuild caches
            $this->sendStep('cache_rebuild', 'Caches opbouwen...', 'running');
            try {
                Artisan::call('config:cache');
                Artisan::call('route:cache');
                Artisan::call('view:cache');
                $this->sendStep('cache_rebuild', 'Caches opgebouwd', 'completed');
            } catch (\Exception $e) {
                $this->sendStep('cache_rebuild', 'Cache opbouwen mislukt: '.$e->getMessage(), 'warning');
            }

            // Step 10: Clear version cache
            $this->sendStep('version', 'Versie cache vernieuwen...', 'running');
            $this->versionCheckService->flushVersionCache();
            $newVersion = $this->versionCheckService->getCurrentVersion();
            $this->sendStep('version', "Versie bijgewerkt naar v{$newVersion}", 'completed');

            // Step 11: Disable maintenance mode
            $this->sendStep('maintenance_off', 'Onderhoudsmodus uitschakelen...', 'running');
            try {
                Artisan::call('up');
                $this->sendStep('maintenance_off', 'Onderhoudsmodus uitgeschakeld', 'completed');
            } catch (\Exception $e) {
                $this->sendStep('maintenance_off', 'Kon onderhoudsmodus niet uitschakelen: '.$e->getMessage(), 'warning');
            }

            // Complete
            $this->sendStep('complete', "FluxDesk is bijgewerkt naar versie {$newVersion}!", 'completed');
            $this->sendEvent('complete', ['version' => $newVersion, 'success' => true]);
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Send a step update via SSE.
     */
    private function sendStep(string $id, string $message, string $status): void
    {
        $this->sendEvent('step', [
            'id' => $id,
            'message' => $message,
            'status' => $status,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Send output text via SSE.
     */
    private function sendOutput(string $output): void
    {
        if (trim($output)) {
            $this->sendEvent('output', ['text' => $output]);
        }
    }

    /**
     * Send an SSE event.
     */
    private function sendEvent(string $event, array $data): void
    {
        echo "event: {$event}\n";
        echo 'data: '.json_encode($data)."\n\n";

        if (ob_get_level()) {
            ob_flush();
        }
        flush();
    }

    /**
     * Finish upgrade and restore if failed.
     */
    private function finishUpgrade(bool $success): void
    {
        if (! $success) {
            // Try to disable maintenance mode on failure
            try {
                Artisan::call('up');
                $this->sendStep('maintenance_off', 'Onderhoudsmodus uitgeschakeld na fout', 'completed');
            } catch (\Exception $e) {
                $this->sendStep('maintenance_off', 'Kon onderhoudsmodus niet uitschakelen', 'warning');
            }
            $this->sendEvent('complete', ['success' => false]);
        }
    }
}
