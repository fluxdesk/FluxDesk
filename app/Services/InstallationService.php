<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class InstallationService
{
    public function __construct(
        protected DatabaseManager $database
    ) {}

    /**
     * Check system requirements and return status.
     *
     * @return array<string, array{met: bool, required: string, current: string|bool}>
     */
    public function checkRequirements(): array
    {
        return [
            'php_version' => [
                'met' => version_compare(PHP_VERSION, '8.2.0', '>='),
                'required' => '8.2.0',
                'current' => PHP_VERSION,
            ],
            'pdo' => [
                'met' => extension_loaded('pdo'),
                'required' => 'Required',
                'current' => extension_loaded('pdo'),
            ],
            'mbstring' => [
                'met' => extension_loaded('mbstring'),
                'required' => 'Required',
                'current' => extension_loaded('mbstring'),
            ],
            'openssl' => [
                'met' => extension_loaded('openssl'),
                'required' => 'Required',
                'current' => extension_loaded('openssl'),
            ],
            'tokenizer' => [
                'met' => extension_loaded('tokenizer'),
                'required' => 'Required',
                'current' => extension_loaded('tokenizer'),
            ],
            'json' => [
                'met' => extension_loaded('json'),
                'required' => 'Required',
                'current' => extension_loaded('json'),
            ],
            'curl' => [
                'met' => extension_loaded('curl'),
                'required' => 'Required',
                'current' => extension_loaded('curl'),
            ],
            'fileinfo' => [
                'met' => extension_loaded('fileinfo'),
                'required' => 'Required',
                'current' => extension_loaded('fileinfo'),
            ],
            'storage_writable' => [
                'met' => is_writable(storage_path()),
                'required' => 'Writable',
                'current' => is_writable(storage_path()),
            ],
            'env_writable' => [
                'met' => is_writable(base_path()) || (file_exists(base_path('.env')) && is_writable(base_path('.env'))),
                'required' => 'Writable',
                'current' => is_writable(base_path()) || (file_exists(base_path('.env')) && is_writable(base_path('.env'))),
            ],
        ];
    }

    /**
     * Check if all requirements are met.
     */
    public function requirementsMet(): bool
    {
        foreach ($this->checkRequirements() as $requirement) {
            if (! $requirement['met']) {
                return false;
            }
        }

        return true;
    }

    /**
     * Ensure .env file exists.
     */
    public function ensureEnvFile(): void
    {
        if (! file_exists(base_path('.env'))) {
            copy(base_path('.env.example'), base_path('.env'));
        }
    }

    /**
     * Generate application key if not set.
     */
    public function generateAppKey(): void
    {
        $key = config('app.key');

        if (empty($key) || $key === 'base64:') {
            Artisan::call('key:generate', ['--force' => true]);
        }
    }

    /**
     * Test database connection with given credentials.
     *
     * @return array{success: bool, message: string}
     */
    public function testDatabaseConnection(array $config): array
    {
        try {
            $driver = $config['driver'] ?? 'sqlite';

            if ($driver === 'sqlite') {
                $dbPath = database_path('database.sqlite');
                if (! file_exists($dbPath)) {
                    touch($dbPath);
                }

                return ['success' => true, 'message' => 'SQLite connection successful'];
            }

            $connectionConfig = [
                'driver' => $driver,
                'host' => $config['host'] ?? '127.0.0.1',
                'port' => $config['port'] ?? ($driver === 'mysql' ? '3306' : '5432'),
                'database' => $config['database'] ?? 'fluxdesk',
                'username' => $config['username'] ?? '',
                'password' => $config['password'] ?? '',
                'charset' => $driver === 'mysql' ? 'utf8mb4' : 'utf8',
                'collation' => $driver === 'mysql' ? 'utf8mb4_unicode_ci' : null,
                'prefix' => '',
                'strict' => true,
            ];

            config()->set('database.connections._install_test', $connectionConfig);
            $this->database->connection('_install_test')->getPdo();
            $this->database->purge('_install_test');

            return ['success' => true, 'message' => 'Database connection successful'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Save database configuration to .env file.
     */
    public function saveDatabaseConfig(array $config): void
    {
        $driver = $config['driver'] ?? 'sqlite';

        $envVars = ['DB_CONNECTION' => $driver];

        if ($driver !== 'sqlite') {
            $envVars['DB_HOST'] = $config['host'] ?? '127.0.0.1';
            $envVars['DB_PORT'] = $config['port'] ?? ($driver === 'mysql' ? '3306' : '5432');
            $envVars['DB_DATABASE'] = $config['database'] ?? 'fluxdesk';
            $envVars['DB_USERNAME'] = $config['username'] ?? '';
            $envVars['DB_PASSWORD'] = $config['password'] ?? '';
        }

        $this->writeEnvVariables($envVars);

        // Clear config cache
        Artisan::call('config:clear');

        // Update runtime config so migrations use the new connection
        config()->set('database.default', $driver);

        if ($driver !== 'sqlite') {
            config()->set("database.connections.{$driver}.host", $config['host'] ?? '127.0.0.1');
            config()->set("database.connections.{$driver}.port", $config['port'] ?? ($driver === 'mysql' ? '3306' : '5432'));
            config()->set("database.connections.{$driver}.database", $config['database'] ?? 'fluxdesk');
            config()->set("database.connections.{$driver}.username", $config['username'] ?? '');
            config()->set("database.connections.{$driver}.password", $config['password'] ?? '');
        }

        // Purge any existing connections so they reconnect with new config
        $this->database->purge();
    }

    /**
     * Run database migrations.
     *
     * @return array{success: bool, message: string}
     */
    public function runMigrations(): array
    {
        try {
            Artisan::call('migrate', ['--force' => true]);

            return ['success' => true, 'message' => 'Migrations completed successfully'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Get list of pending migrations.
     *
     * @return array<int, string>
     */
    public function getPendingMigrations(): array
    {
        $migrator = app('migrator');
        $paths = $migrator->paths();
        $paths[] = database_path('migrations');

        $files = [];
        foreach ($paths as $path) {
            if (is_dir($path)) {
                $files = array_merge($files, glob($path.'/*.php') ?: []);
            }
        }

        return array_map(fn ($file) => basename($file, '.php'), $files);
    }

    /**
     * Run migrations with progress callback for streaming.
     *
     * @param  callable(string $type, string $message): void  $callback
     * @return array{success: bool, message: string}
     */
    public function runMigrationsWithProgress(callable $callback): array
    {
        try {
            $callback('info', 'Checking migration status...');

            $migrations = $this->getPendingMigrations();
            $callback('info', 'Found '.count($migrations).' migration files');

            $callback('command', 'php artisan migrate --force');
            $callback('info', '');

            // Capture output from migrate command
            $exitCode = Artisan::call('migrate', ['--force' => true]);
            $output = Artisan::output();

            // Parse and stream the output line by line
            $lines = explode("\n", trim($output));
            foreach ($lines as $line) {
                if (empty(trim($line))) {
                    continue;
                }

                // Detect migration lines
                if (str_contains($line, 'Running migrations') || str_contains($line, 'Nothing to migrate')) {
                    $callback('info', $line);
                } elseif (preg_match('/(\d{4}_\d{2}_\d{2}_\d+_.+)/', $line, $matches)) {
                    $callback('migration', $line);
                } elseif (str_contains($line, 'DONE') || str_contains($line, 'done')) {
                    $callback('success', $line);
                } else {
                    $callback('output', $line);
                }

                // Small delay for visual effect
                usleep(50000); // 50ms
            }

            if ($exitCode !== 0) {
                $callback('error', 'Migration failed with exit code: '.$exitCode);

                return ['success' => false, 'message' => 'Migration failed'];
            }

            $callback('success', '');
            $callback('success', 'All migrations completed successfully!');

            return ['success' => true, 'message' => 'Migrations completed successfully'];
        } catch (\Exception $e) {
            $callback('error', 'Error: '.$e->getMessage());

            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Create the admin user and organization.
     *
     * @return array{success: bool, message: string, user?: User, organization?: Organization}
     */
    public function createAdminAndOrganization(array $data): array
    {
        try {
            // Create user
            $user = User::create([
                'name' => $data['admin_name'],
                'email' => $data['admin_email'],
                'password' => Hash::make($data['admin_password']),
                'is_super_admin' => true,
                'email_verified_at' => now(),
            ]);

            // Create organization
            $organization = Organization::create([
                'name' => $data['organization_name'],
                'slug' => Str::slug($data['organization_name']),
                'is_system_default' => true, // First org is system default
            ]);

            // Attach user as admin
            $user->organizations()->attach($organization->id, [
                'role' => UserRole::Admin->value,
                'is_default' => true,
            ]);

            return [
                'success' => true,
                'message' => 'Admin and organization created successfully',
                'user' => $user,
                'organization' => $organization,
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Save application configuration.
     */
    public function saveAppConfig(array $config): void
    {
        $envVars = [];

        if (isset($config['app_name'])) {
            $envVars['APP_NAME'] = $config['app_name'];
        }

        if (isset($config['app_url'])) {
            $envVars['APP_URL'] = $config['app_url'];
        }

        if (isset($config['app_env'])) {
            $envVars['APP_ENV'] = $config['app_env'];
            $envVars['APP_DEBUG'] = $config['app_env'] === 'local' ? 'true' : 'false';
        }

        if (! empty($envVars)) {
            $this->writeEnvVariables($envVars);
        }
    }

    /**
     * Mark installation as complete.
     */
    public function markAsInstalled(): void
    {
        $this->writeEnvVariables(['APP_INSTALLED' => 'true']);
        Artisan::call('config:clear');
    }

    /**
     * Write environment variables to .env file.
     *
     * @param  array<string, string>  $variables
     */
    public function writeEnvVariables(array $variables): void
    {
        $envPath = base_path('.env');

        if (! file_exists($envPath)) {
            $this->ensureEnvFile();
        }

        $envContent = file_get_contents($envPath);

        foreach ($variables as $key => $value) {
            // Escape special characters in value
            $escapedValue = $value;
            if (preg_match('/\s|[#"]/', (string) $value)) {
                $escapedValue = '"'.addslashes((string) $value).'"';
            }

            // Check if key exists
            if (preg_match("/^{$key}=/m", $envContent)) {
                // Replace existing value
                $envContent = preg_replace(
                    "/^{$key}=.*/m",
                    "{$key}={$escapedValue}",
                    $envContent
                );
            } else {
                // Add new key
                $envContent .= "\n{$key}={$escapedValue}";
            }
        }

        file_put_contents($envPath, $envContent);
    }

    /**
     * Check if a user with the given email already exists.
     */
    public function userExists(string $email): bool
    {
        return User::where('email', $email)->exists();
    }

    /**
     * Check if an organization with the given slug already exists.
     */
    public function organizationExists(string $name): bool
    {
        return Organization::where('slug', Str::slug($name))->exists();
    }
}
