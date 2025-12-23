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
     * Redirect to the appropriate step based on completed steps.
     */
    protected function redirectToCurrentStep(): RedirectResponse
    {
        $currentStep = $this->installationService->getCurrentStep();

        return match ($currentStep) {
            1 => redirect()->route('install.welcome'),
            2 => redirect()->route('install.database'),
            3 => redirect()->route('install.mail'),
            4 => redirect()->route('install.cache'),
            5 => redirect()->route('install.admin'),
            default => redirect()->route('install.complete'),
        };
    }

    /**
     * Step 1: Welcome & Requirements
     */
    public function welcome(): Response|RedirectResponse
    {
        // If welcome is already complete, redirect to current step
        if ($this->installationService->isStepComplete('welcome')) {
            return $this->redirectToCurrentStep();
        }

        $this->installationService->ensureEnvFile();
        $this->installationService->generateAppKey();

        $requirements = $this->installationService->checkRequirements();
        $allMet = $this->installationService->requirementsMet();

        // Mark welcome as complete when all requirements are met
        if ($allMet && ! $this->installationService->isStepComplete('welcome')) {
            $this->installationService->markStepComplete('welcome');
        }

        return Inertia::render('install/welcome', [
            'requirements' => $requirements,
            'allMet' => $allMet,
            'appName' => config('app.name', 'FluxDesk'),
        ]);
    }

    /**
     * Step 2: Database configuration
     */
    public function database(): Response|RedirectResponse
    {
        // If database is already complete, redirect to current step
        if ($this->installationService->isStepComplete('database')) {
            return $this->redirectToCurrentStep();
        }

        if (! $this->installationService->requirementsMet()) {
            return redirect()->route('install.welcome');
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
    public function runDatabase(): Response|RedirectResponse
    {
        $config = session('install_db_config');

        if (! $config) {
            return redirect()->route('install.database');
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

                // Mark database step as complete if successful
                if ($migrationResult['success']) {
                    $this->installationService->markStepComplete('database');
                }

                // Final result
                $sendEvent('complete', '', ['success' => $migrationResult['success']]);

            } catch (\Exception $e) {
                Log::error('Installation migration error', ['error' => $e->getMessage()]);
                $sendEvent('error', 'An unexpected error occurred during migration. Please check the logs.');
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
     * Step 3: Mail configuration
     */
    public function mail(): Response|RedirectResponse
    {
        // Must complete database first
        if (! $this->installationService->isStepComplete('database')) {
            return $this->redirectToCurrentStep();
        }

        // If mail is already complete, redirect to current step
        if ($this->installationService->isStepComplete('mail')) {
            return $this->redirectToCurrentStep();
        }

        return Inertia::render('install/mail', [
            'appName' => config('app.name', 'FluxDesk'),
            'currentMailer' => config('mail.default', 'log'),
            'currentConfig' => [
                'host' => config('mail.mailers.smtp.host', '127.0.0.1'),
                'port' => config('mail.mailers.smtp.port', '587'),
                'encryption' => config('mail.mailers.smtp.encryption', 'tls'),
                'from_address' => config('mail.from.address', 'hello@example.com'),
            ],
        ]);
    }

    /**
     * Handle mail configuration submission
     */
    public function storeMail(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'mailer' => ['required', 'in:log,smtp'],
            'host' => ['required_if:mailer,smtp', 'nullable', 'string'],
            'port' => ['required_if:mailer,smtp', 'nullable', 'string'],
            'username' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
            'encryption' => ['required_if:mailer,smtp', 'nullable', 'in:tls,ssl,null'],
            'from_address' => ['required', 'email'],
        ]);

        $this->installationService->saveMailConfig($validated);
        $this->installationService->markStepComplete('mail');

        return redirect()->route('install.cache');
    }

    /**
     * Test mail connection
     */
    public function testMail(Request $request): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'mailer' => ['required', 'in:log,smtp'],
            'host' => ['required_if:mailer,smtp', 'nullable', 'string'],
            'port' => ['required_if:mailer,smtp', 'nullable', 'string'],
            'username' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
            'encryption' => ['required_if:mailer,smtp', 'nullable', 'in:tls,ssl,null'],
        ]);

        $result = $this->installationService->testMailConnection($validated);

        return response()->json($result);
    }

    /**
     * Step 4: Cache & Services configuration
     */
    public function cache(): Response|RedirectResponse
    {
        // Must complete mail first
        if (! $this->installationService->isStepComplete('mail')) {
            return $this->redirectToCurrentStep();
        }

        // If cache is already complete, redirect to current step
        if ($this->installationService->isStepComplete('cache')) {
            return $this->redirectToCurrentStep();
        }

        return Inertia::render('install/cache', [
            'appName' => config('app.name', 'FluxDesk'),
            'currentConfig' => [
                'cache_store' => config('cache.default', 'database'),
                'session_driver' => config('session.driver', 'database'),
                'queue_connection' => config('queue.default', 'database'),
                'redis_host' => config('database.redis.default.host', '127.0.0.1'),
                'redis_port' => config('database.redis.default.port', '6379'),
            ],
        ]);
    }

    /**
     * Handle cache configuration submission
     */
    public function storeCache(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'store' => ['required', 'in:file,database,redis'],
            'session_driver' => ['required', 'in:file,database,redis'],
            'queue_connection' => ['required', 'in:sync,database,redis'],
            'redis_host' => ['required_if:store,redis', 'nullable', 'string'],
            'redis_port' => ['required_if:store,redis', 'nullable', 'string'],
            'redis_password' => ['nullable', 'string'],
        ]);

        $this->installationService->saveCacheConfig($validated);
        $this->installationService->markStepComplete('cache');

        return redirect()->route('install.admin');
    }

    /**
     * Test Redis connection
     */
    public function testRedis(Request $request): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'redis_host' => ['required', 'string'],
            'redis_port' => ['required', 'string'],
            'redis_password' => ['nullable', 'string'],
        ]);

        $result = $this->installationService->testRedisConnection($validated);

        return response()->json($result);
    }

    /**
     * Step 5: Admin & Organization setup
     */
    public function admin(): Response|RedirectResponse
    {
        // Must complete cache first
        if (! $this->installationService->isStepComplete('cache')) {
            return $this->redirectToCurrentStep();
        }

        // If admin is already complete (installed), redirect to complete
        if ($this->installationService->isStepComplete('admin')) {
            return redirect()->route('install.complete');
        }

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
