<?php

namespace App\Http\Controllers;

use App\Services\VersionCheckService;
use Illuminate\Http\JsonResponse;
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
     * Check for updates (AJAX endpoint) - forces refresh from GitHub.
     */
    public function check(): JsonResponse
    {
        $this->versionCheckService->refreshVersionData();
        $status = $this->versionCheckService->getVersionStatus();

        return response()->json($status);
    }

    /**
     * Get current version status (AJAX endpoint) - non-blocking.
     * Uses cached data if available, fetches from GitHub otherwise.
     * Designed to be called asynchronously after page load.
     */
    public function status(): JsonResponse
    {
        $status = $this->versionCheckService->getVersionStatus();

        return response()->json($status);
    }

    /**
     * Execute the upgrade process by running the Artisan command with streaming output.
     */
    public function execute(): StreamedResponse
    {
        return response()->stream(function () {
            // Disable output buffering
            while (ob_get_level()) {
                ob_end_clean();
            }

            $this->sendStep('start', 'Upgrade wordt gestart...', 'running');

            // Get the PHP binary path
            $phpBinary = PHP_BINARY;
            $artisanPath = base_path('artisan');

            // Run the upgrade command with real-time output
            $process = Process::timeout(1800) // 30 minutes max
                ->path(base_path())
                ->env([
                    'TERM' => 'dumb', // Disable colors/spinners for clean output
                    'NO_COLOR' => '1',
                ])
                ->run("{$phpBinary} {$artisanPath} fluxdesk:upgrade --force --no-ansi 2>&1", function (string $type, string $output) {
                    // Stream each line of output
                    $lines = explode("\n", $output);
                    foreach ($lines as $line) {
                        $line = trim($line);
                        if (empty($line)) {
                            continue;
                        }

                        // Parse the output and send appropriate events
                        $this->parseAndSendOutput($line);
                    }
                });

            if ($process->successful()) {
                // Get the new version
                $this->versionCheckService->flushVersionCache();
                $newVersion = $this->versionCheckService->getCurrentVersion();

                $this->sendStep('complete', "FluxDesk is bijgewerkt naar versie v{$newVersion}!", 'completed');
                $this->sendEvent('complete', ['version' => $newVersion, 'success' => true]);
            } else {
                $this->sendStep('error', 'Upgrade mislukt. Controleer de output hierboven.', 'error');
                $this->sendEvent('complete', ['success' => false, 'error' => $process->errorOutput()]);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Parse command output and send appropriate SSE events.
     */
    private function parseAndSendOutput(string $line): void
    {
        // Map common output patterns to step IDs
        $stepPatterns = [
            'Onderhoudsmodus inschakelen' => ['id' => 'maintenance', 'status' => 'running'],
            'Onderhoudsmodus ingeschakeld' => ['id' => 'maintenance', 'status' => 'completed'],
            'Nieuwste versie ophalen' => ['id' => 'fetch', 'status' => 'running'],
            'Git fetch voltooid' => ['id' => 'fetch', 'status' => 'completed'],
            'Nieuwe bestanden downloaden' => ['id' => 'pull', 'status' => 'running'],
            'Git pull voltooid' => ['id' => 'pull', 'status' => 'completed'],
            'Checkout naar' => ['id' => 'pull', 'status' => 'completed'],
            'PHP dependencies installeren' => ['id' => 'composer', 'status' => 'running'],
            'Composer install voltooid' => ['id' => 'composer', 'status' => 'completed'],
            'Autoloader optimaliseren' => ['id' => 'composer', 'status' => 'running'],
            'Autoloader geoptimaliseerd' => ['id' => 'composer', 'status' => 'completed'],
            'Node.js dependencies installeren' => ['id' => 'npm_install', 'status' => 'running'],
            'NPM install voltooid' => ['id' => 'npm_install', 'status' => 'completed'],
            'Frontend bouwen' => ['id' => 'npm_build', 'status' => 'running'],
            'NPM build voltooid' => ['id' => 'npm_build', 'status' => 'completed'],
            'Caches legen voor build' => ['id' => 'cache_prebuild', 'status' => 'running'],
            'Database migraties uitvoeren' => ['id' => 'migrate', 'status' => 'running'],
            'Database migraties voltooid' => ['id' => 'migrate', 'status' => 'completed'],
            'Caches legen' => ['id' => 'cache_clear', 'status' => 'running'],
            'Caches geleegd' => ['id' => 'cache_clear', 'status' => 'completed'],
            'Caches opbouwen' => ['id' => 'cache_rebuild', 'status' => 'running'],
            'Caches opgebouwd' => ['id' => 'cache_rebuild', 'status' => 'completed'],
            'Versie cache vernieuwen' => ['id' => 'version', 'status' => 'running'],
            'Versie bijgewerkt naar' => ['id' => 'version', 'status' => 'completed'],
            'Onderhoudsmodus uitgeschakeld' => ['id' => 'maintenance_off', 'status' => 'completed'],
            'is bijgewerkt naar versie' => ['id' => 'complete', 'status' => 'completed'],
        ];

        // Error patterns
        $errorPatterns = [
            'mislukt' => 'error',
            'error' => 'error',
            'failed' => 'error',
        ];

        // Warning patterns
        $warningPatterns = [
            'warning' => 'warning',
            'probeer' => 'warning',
        ];

        // Check for step patterns
        foreach ($stepPatterns as $pattern => $info) {
            if (stripos($line, $pattern) !== false) {
                $this->sendStep($info['id'], $line, $info['status']);

                return;
            }
        }

        // Check for errors
        foreach ($errorPatterns as $pattern => $status) {
            if (stripos($line, $pattern) !== false) {
                $this->sendStep('error', $line, 'error');

                return;
            }
        }

        // Check for warnings
        foreach ($warningPatterns as $pattern => $status) {
            if (stripos($line, $pattern) !== false) {
                $this->sendStep('warning', $line, 'warning');

                return;
            }
        }

        // Send as general output if not matched
        if (! empty($line) && ! preg_match('/^[\s\-_═─│┌┐└┘├┤┬┴┼]+$/', $line)) {
            $this->sendOutput($line);
        }
    }

    /**
     * Send a step update via SSE.
     */
    private function sendStep(string $id, string $message, string $status): void
    {
        // Clean ANSI codes from message
        $message = preg_replace('/\x1B\[[0-9;]*[A-Za-z]/', '', $message);
        $message = trim($message);

        if (empty($message)) {
            return;
        }

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
        // Clean ANSI codes
        $output = preg_replace('/\x1B\[[0-9;]*[A-Za-z]/', '', $output);
        $output = trim($output);

        if (! empty($output)) {
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
}
