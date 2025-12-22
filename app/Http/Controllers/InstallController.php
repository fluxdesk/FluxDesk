<?php

namespace App\Http\Controllers;

use App\Services\InstallationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InstallController extends Controller
{
    public function __construct(
        protected InstallationService $installationService
    ) {}

    /**
     * Step 1: Welcome & Requirements
     */
    public function welcome(): Response
    {
        $this->installationService->ensureEnvFile();
        $this->installationService->generateAppKey();

        $requirements = $this->installationService->checkRequirements();
        $allMet = $this->installationService->requirementsMet();

        return Inertia::render('install/welcome', [
            'requirements' => $requirements,
            'allMet' => $allMet,
            'appName' => config('app.name', 'FluxDesk'),
        ]);
    }

    /**
     * Step 2: Database configuration
     */
    public function database(): Response
    {
        if (! $this->installationService->requirementsMet()) {
            return Inertia::location(route('install.welcome'));
        }

        return Inertia::render('install/database', [
            'appName' => config('app.name', 'FluxDesk'),
            'currentDriver' => config('database.default'),
        ]);
    }

    /**
     * Handle database configuration submission (validates and stores in session)
     */
    public function storeDatabase(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'driver' => ['required', 'in:sqlite,mysql,pgsql'],
            'host' => ['required_unless:driver,sqlite', 'nullable', 'string'],
            'port' => ['required_unless:driver,sqlite', 'nullable', 'string'],
            'database' => ['required_unless:driver,sqlite', 'nullable', 'string'],
            'username' => ['required_unless:driver,sqlite', 'nullable', 'string'],
            'password' => ['nullable', 'string'],
        ]);

        // Store in session for streaming endpoint
        session(['install_db_config' => $validated]);

        return redirect()->route('install.database.run');
    }

    /**
     * Test database connection without saving
     */
    public function testConnection(Request $request): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'driver' => ['required', 'in:sqlite,mysql,pgsql'],
            'host' => ['required_unless:driver,sqlite', 'nullable', 'string'],
            'port' => ['required_unless:driver,sqlite', 'nullable', 'string'],
            'database' => ['required_unless:driver,sqlite', 'nullable', 'string'],
            'username' => ['required_unless:driver,sqlite', 'nullable', 'string'],
            'password' => ['nullable', 'string'],
        ]);

        $result = $this->installationService->testDatabaseConnection($validated);

        return response()->json($result);
    }

    /**
     * Show the database setup progress page
     */
    public function runDatabase(): Response
    {
        $config = session('install_db_config');

        if (! $config) {
            return Inertia::location(route('install.database'));
        }

        return Inertia::render('install/database-setup', [
            'appName' => config('app.name', 'FluxDesk'),
            'dbConfig' => [
                'driver' => $config['driver'],
                'host' => $config['host'] ?? null,
                'database' => $config['database'] ?? null,
            ],
        ]);
    }

    /**
     * Stream database setup progress via Server-Sent Events
     */
    public function streamDatabaseSetup(Request $request): StreamedResponse
    {
        $config = session('install_db_config');

        return new StreamedResponse(function () use ($config) {
            // Disable output buffering
            if (ob_get_level()) {
                ob_end_clean();
            }

            $sendEvent = function (string $type, string $message, array $data = []) {
                $event = [
                    'type' => $type,
                    'message' => $message,
                    'timestamp' => now()->format('H:i:s'),
                    ...$data,
                ];
                echo 'data: '.json_encode($event)."\n\n";
                flush();
            };

            if (! $config) {
                $sendEvent('error', 'No database configuration found. Please go back and try again.');
                $sendEvent('complete', '', ['success' => false]);

                return;
            }

            try {
                // Step 1: Test connection
                $sendEvent('command', '$ Testing database connection...');
                usleep(300000);

                $result = $this->installationService->testDatabaseConnection($config);

                if (! $result['success']) {
                    $sendEvent('error', 'Connection failed: '.$result['message']);
                    $sendEvent('complete', '', ['success' => false]);

                    return;
                }

                $sendEvent('success', 'Connection successful!');
                usleep(200000);

                // Step 2: Save configuration
                $sendEvent('command', '$ Saving database configuration...');
                usleep(200000);

                $this->installationService->saveDatabaseConfig($config);
                $sendEvent('success', 'Configuration saved to .env');
                usleep(200000);

                // Step 3: Run migrations with streaming output
                $sendEvent('command', '$ php artisan migrate --force');
                $sendEvent('info', '');

                $migrationResult = $this->installationService->runMigrationsWithProgress(
                    function (string $type, string $message) use ($sendEvent) {
                        $sendEvent($type, $message);
                    }
                );

                // Clear session config
                session()->forget('install_db_config');

                // Final result
                $sendEvent('complete', '', ['success' => $migrationResult['success']]);

            } catch (\Exception $e) {
                $sendEvent('error', 'Unexpected error: '.$e->getMessage());
                $sendEvent('complete', '', ['success' => false]);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Step 3: Admin & Organization setup
     */
    public function admin(): Response
    {
        return Inertia::render('install/admin', [
            'appName' => config('app.name', 'FluxDesk'),
            'appUrl' => config('app.url', request()->getSchemeAndHttpHost()),
        ]);
    }

    /**
     * Handle admin creation submission
     */
    public function storeAdmin(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'app_name' => ['required', 'string', 'max:255'],
            'app_url' => ['required', 'url'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'max:255'],
            'admin_password' => ['required', 'string', 'min:8', 'confirmed'],
            'organization_name' => ['required', 'string', 'max:255'],
        ]);

        // Save app config
        $this->installationService->saveAppConfig([
            'app_name' => $validated['app_name'],
            'app_url' => $validated['app_url'],
        ]);

        // Create admin and organization
        $result = $this->installationService->createAdminAndOrganization($validated);

        if (! $result['success']) {
            return back()->withErrors(['admin' => $result['message']]);
        }

        // Mark as installed
        $this->installationService->markAsInstalled();

        return redirect()->route('install.complete');
    }

    /**
     * Step 4: Installation complete
     */
    public function complete(): Response
    {
        return Inertia::render('install/complete', [
            'appName' => config('app.name', 'FluxDesk'),
        ]);
    }
}
