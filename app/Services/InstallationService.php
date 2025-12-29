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
     * Check if database is already configured in .env.
     *
     * @return array{driver: string, host?: string, port?: string, database?: string, username?: string, password?: string, configured: bool}|null
     */
    public function getDatabaseConfigFromEnv(): ?array
    {
        $driver = config('database.default');

        if ($driver === 'sqlite') {
            $dbPath = database_path('database.sqlite');

            return [
                'driver' => 'sqlite',
                'database' => $dbPath,
                'configured' => file_exists($dbPath),
            ];
        }

        $host = config("database.connections.{$driver}.host");
        $database = config("database.connections.{$driver}.database");
        $username = config("database.connections.{$driver}.username");

        // Check if essential values are set and not just defaults
        // Forge/Ploi typically sets all these values
        if ($host && $database && $username && $database !== 'laravel') {
            return [
                'driver' => $driver,
                'host' => $host,
                'port' => (string) config("database.connections.{$driver}.port"),
                'database' => $database,
                'username' => $username,
                'password' => config("database.connections.{$driver}.password") ?? '',
                'configured' => true,
            ];
        }

        return null;
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

            // Check if PDO driver is loaded
            $pdoDriver = $driver === 'mysql' ? 'pdo_mysql' : 'pdo_pgsql';
            if (! extension_loaded($pdoDriver)) {
                return [
                    'success' => false,
                    'message' => "PHP extension '{$pdoDriver}' is not installed. Please install it and restart your web server.",
                ];
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
        } catch (\PDOException $e) {
            return ['success' => false, 'message' => $this->formatDatabaseError($e)];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Format PDO exception into a user-friendly message.
     */
    private function formatDatabaseError(\PDOException $e): string
    {
        $message = $e->getMessage();
        $code = $e->getCode();

        // Connection refused
        if (str_contains($message, 'Connection refused') || str_contains($message, 'No connection could be made')) {
            return 'Connection refused. Please check that the database server is running and the host/port are correct.';
        }

        // Access denied (wrong credentials)
        if (str_contains($message, 'Access denied') || $code === 1045) {
            return 'Access denied. Please check your username and password.';
        }

        // Unknown database
        if (str_contains($message, 'Unknown database') || str_contains($message, 'does not exist') || $code === 1049) {
            return 'Database does not exist. Please create the database first or check the database name.';
        }

        // Host not found
        if (str_contains($message, 'getaddrinfo') || str_contains($message, 'Name or service not known') || str_contains($message, 'No such host')) {
            return 'Could not resolve host. Please check that the hostname is correct.';
        }

        // Timeout
        if (str_contains($message, 'timed out') || str_contains($message, 'timeout')) {
            return 'Connection timed out. The database server may be unreachable or behind a firewall.';
        }

        return $message;
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
     * Save mail configuration to .env file.
     */
    public function saveMailConfig(array $config): void
    {
        $mailer = $config['mailer'] ?? 'log';

        $envVars = ['MAIL_MAILER' => $mailer];

        if ($mailer === 'smtp') {
            $envVars['MAIL_HOST'] = $config['host'] ?? '127.0.0.1';
            $envVars['MAIL_PORT'] = $config['port'] ?? '587';
            $envVars['MAIL_USERNAME'] = $config['username'] ?? '';
            $envVars['MAIL_PASSWORD'] = $config['password'] ?? '';
            $envVars['MAIL_ENCRYPTION'] = $config['encryption'] ?? 'tls';
        }

        $envVars['MAIL_FROM_ADDRESS'] = $config['from_address'] ?? 'hello@example.com';
        $envVars['MAIL_FROM_NAME'] = '${APP_NAME}';

        $this->writeEnvVariables($envVars);

        // Clear config cache and update runtime config
        Artisan::call('config:clear');

        config()->set('mail.default', $mailer);
        if ($mailer === 'smtp') {
            config()->set('mail.mailers.smtp.host', $config['host'] ?? '127.0.0.1');
            config()->set('mail.mailers.smtp.port', $config['port'] ?? '587');
            config()->set('mail.mailers.smtp.username', $config['username'] ?? '');
            config()->set('mail.mailers.smtp.password', $config['password'] ?? '');
            config()->set('mail.mailers.smtp.encryption', $config['encryption'] ?? 'tls');
        }
    }

    /**
     * Test mail configuration by sending a test email.
     *
     * @return array{success: bool, message: string}
     */
    public function testMailConnection(array $config): array
    {
        try {
            $mailer = $config['mailer'] ?? 'log';

            if ($mailer === 'log') {
                return ['success' => true, 'message' => 'Log mailer is always available'];
            }

            if ($mailer === 'smtp') {
                $host = $config['host'] ?? '127.0.0.1';
                $port = (int) ($config['port'] ?? 587);
                $encryption = $config['encryption'] ?? 'tls';

                // Determine if we should use TLS
                // "null" or empty means no encryption (for local dev like Mailpit)
                $useTls = $encryption === 'tls';

                // Create the appropriate transport
                if ($encryption === 'ssl') {
                    // SSL on port 465 typically
                    $transport = new \Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport($host, $port, true);
                } elseif ($useTls) {
                    // TLS (STARTTLS) on port 587 typically
                    $transport = new \Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport($host, $port, false);
                } else {
                    // No encryption - for local development (Mailpit, MailHog, etc.)
                    $transport = new \Symfony\Component\Mailer\Transport\Smtp\SmtpTransport($host, $port);
                }

                // Only set credentials if provided
                if (! empty($config['username']) && $transport instanceof \Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport) {
                    $transport->setUsername($config['username']);
                }
                if (! empty($config['password']) && $transport instanceof \Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport) {
                    $transport->setPassword($config['password']);
                }

                // Try to start the transport (this tests the connection)
                $transport->start();
                $transport->stop();
            }

            return ['success' => true, 'message' => 'Mail connection successful'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Save cache configuration to .env file.
     */
    public function saveCacheConfig(array $config): void
    {
        $store = $config['store'] ?? 'database';

        $envVars = [
            'CACHE_STORE' => $store,
            'SESSION_DRIVER' => $config['session_driver'] ?? 'database',
            'QUEUE_CONNECTION' => $config['queue_connection'] ?? 'database',
        ];

        if ($store === 'redis' || $config['session_driver'] === 'redis' || $config['queue_connection'] === 'redis') {
            $envVars['REDIS_HOST'] = $config['redis_host'] ?? '127.0.0.1';
            $envVars['REDIS_PASSWORD'] = $config['redis_password'] ?? 'null';
            $envVars['REDIS_PORT'] = $config['redis_port'] ?? '6379';
        }

        $this->writeEnvVariables($envVars);

        // Clear config cache
        Artisan::call('config:clear');

        // Update runtime config
        config()->set('cache.default', $store);
        config()->set('session.driver', $config['session_driver'] ?? 'database');
        config()->set('queue.default', $config['queue_connection'] ?? 'database');
    }

    /**
     * Test Redis connection.
     *
     * @return array{success: bool, message: string}
     */
    public function testRedisConnection(array $config): array
    {
        try {
            $redis = new \Redis;
            $connected = $redis->connect(
                $config['redis_host'] ?? '127.0.0.1',
                (int) ($config['redis_port'] ?? 6379),
                2.0 // timeout
            );

            if (! $connected) {
                return ['success' => false, 'message' => 'Could not connect to Redis server'];
            }

            $password = $config['redis_password'] ?? null;
            if ($password && $password !== 'null') {
                if (! $redis->auth($password)) {
                    return ['success' => false, 'message' => 'Redis authentication failed'];
                }
            }

            $redis->ping();
            $redis->close();

            return ['success' => true, 'message' => 'Redis connection successful'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Mark a specific installation step as complete.
     */
    public function markStepComplete(string $step): void
    {
        $completedSteps = $this->getCompletedSteps();
        if (! in_array($step, $completedSteps)) {
            $completedSteps[] = $step;
            $this->writeEnvVariables(['INSTALL_COMPLETED_STEPS' => implode(',', $completedSteps)]);
        }
    }

    /**
     * Get list of completed installation steps.
     *
     * @return array<string>
     */
    public function getCompletedSteps(): array
    {
        $steps = env('INSTALL_COMPLETED_STEPS', '');

        return $steps ? explode(',', $steps) : [];
    }

    /**
     * Check if a specific step is complete.
     */
    public function isStepComplete(string $step): bool
    {
        return in_array($step, $this->getCompletedSteps());
    }

    /**
     * Get the current step number based on completed steps.
     */
    public function getCurrentStep(): int
    {
        $completedSteps = $this->getCompletedSteps();

        if (in_array('admin', $completedSteps)) {
            return 6; // Complete
        }
        if (in_array('cache', $completedSteps)) {
            return 5; // Admin
        }
        if (in_array('mail', $completedSteps)) {
            return 4; // Cache
        }
        if (in_array('database', $completedSteps)) {
            return 3; // Mail
        }
        if (in_array('welcome', $completedSteps)) {
            return 2; // Database
        }

        return 1; // Welcome
    }

    /**
     * Mark installation as complete.
     */
    public function markAsInstalled(): void
    {
        $this->markStepComplete('admin');
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

            // Check if key exists (including commented out versions like "# DB_HOST=" or "#DB_HOST=")
            if (preg_match("/^#?\s*{$key}=/m", $envContent)) {
                // Replace existing value (uncomment if commented)
                $envContent = preg_replace(
                    "/^#?\s*{$key}=.*/m",
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
