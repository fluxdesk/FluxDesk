<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\error;
use function Laravel\Prompts\info;
use function Laravel\Prompts\intro;
use function Laravel\Prompts\note;
use function Laravel\Prompts\outro;
use function Laravel\Prompts\password;
use function Laravel\Prompts\select;
use function Laravel\Prompts\spin;
use function Laravel\Prompts\text;
use function Laravel\Prompts\warning;

class InstallCommand extends Command
{
    protected $signature = 'fluxdesk:install
                            {--force : Force installation even if already installed}';

    protected $description = 'Interactive installation wizard for FluxDesk';

    protected array $envVariables = [];

    public function __construct(
        protected DatabaseManager $database
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        intro('FluxDesk Installation');

        // Check if already installed
        if (file_exists(base_path('.env')) && ! $this->option('force')) {
            $existingEnv = file_get_contents(base_path('.env'));
            if (str_contains($existingEnv, 'APP_INSTALLED=true')) {
                warning('FluxDesk is already installed.');

                if (! confirm('Do you want to run the installer again?', false)) {
                    return 0;
                }
            }
        }

        // Ask if .env is already configured manually
        $manualEnv = confirm(
            label: 'Have you already configured the .env file manually?',
            default: false,
            hint: 'If yes, we\'ll skip environment setup and just run migrations'
        );

        if ($manualEnv) {
            return $this->runManualEnvInstall();
        }

        return $this->runGuidedInstall();
    }

    /**
     * Run installation when .env is already configured manually.
     */
    protected function runManualEnvInstall(): int
    {
        // Copy .env.example if .env doesn't exist
        if (! file_exists(base_path('.env'))) {
            error('.env file not found. Please create one first or run guided setup.');

            return 1;
        }

        info('Using existing .env configuration.');

        // Test database connection
        if (! $this->testExistingDatabaseConnection()) {
            return 1;
        }

        // Run migrations
        if (! $this->runMigrations()) {
            return 1;
        }

        // Create admin user
        $this->createAdminUser();

        // Mark as installed
        $this->envVariables['APP_INSTALLED'] = 'true';
        $this->writeEnvironmentFile();

        // Build frontend assets
        $this->buildAssets();

        outro('Installation complete!');

        note('Start the development server with: composer run dev');
        note('Or for production, configure your web server to point to the public directory.');

        return 0;
    }

    /**
     * Run guided installation with full environment configuration.
     */
    protected function runGuidedInstall(): int
    {
        // Copy .env.example if .env doesn't exist
        if (! file_exists(base_path('.env'))) {
            copy(base_path('.env.example'), base_path('.env'));
            info('Created .env file from template.');
        }

        // Generate application key if not set
        $this->generateAppKey();

        // Configure application
        $this->configureApplication();

        // Configure database
        if (! $this->configureDatabase()) {
            return 1;
        }

        // Run migrations
        if (! $this->runMigrations()) {
            return 1;
        }

        // Configure mail
        $this->configureMail();

        // Configure cache, session, and queue
        $this->configureServices();

        // Create admin user
        $this->createAdminUser();

        // Mark as installed
        $this->envVariables['APP_INSTALLED'] = 'true';

        // Write all environment variables
        $this->writeEnvironmentFile();

        // Build frontend assets
        $this->buildAssets();

        outro('Installation complete!');

        note('Start the development server with: composer run dev');
        note('Or for production, configure your web server to point to the public directory.');

        return 0;
    }

    /**
     * Test database connection using existing .env configuration.
     */
    protected function testExistingDatabaseConnection(): bool
    {
        $result = spin(function () {
            try {
                $this->database->connection()->getPdo();

                return true;
            } catch (\Exception $e) {
                return $e->getMessage();
            }
        }, 'Testing database connection...');

        if ($result !== true) {
            error('Database connection failed: '.$result);
            warning('Please check your .env database configuration and try again.');

            return false;
        }

        info('Database connection successful.');

        return true;
    }

    protected function generateAppKey(): void
    {
        $key = config('app.key');

        if (empty($key) || $key === 'base64:') {
            spin(
                fn () => $this->callSilently('key:generate'),
                'Generating application key...'
            );
            info('Application key generated.');
        }
    }

    protected function configureApplication(): void
    {
        note('Application Configuration');

        $this->envVariables['APP_NAME'] = text(
            label: 'Application name',
            default: config('app.name', 'FluxDesk'),
            required: true
        );

        $this->envVariables['APP_URL'] = text(
            label: 'Application URL',
            placeholder: 'https://support.example.com',
            default: config('app.url', 'http://localhost'),
            required: true,
            hint: 'The URL where the application will be accessible'
        );

        $this->envVariables['APP_ENV'] = select(
            label: 'Environment',
            options: [
                'local' => 'Local (development)',
                'production' => 'Production',
            ],
            default: 'local'
        );

        $this->envVariables['APP_DEBUG'] = $this->envVariables['APP_ENV'] === 'local' ? 'true' : 'false';
    }

    protected function configureDatabase(): bool
    {
        note('Database Configuration');

        $driver = select(
            label: 'Database type',
            options: [
                'sqlite' => 'SQLite (recommended for small deployments)',
                'mysql' => 'MySQL / MariaDB',
                'pgsql' => 'PostgreSQL',
            ],
            default: 'sqlite'
        );

        $this->envVariables['DB_CONNECTION'] = $driver;

        if ($driver === 'sqlite') {
            $dbPath = database_path('database.sqlite');
            if (! file_exists($dbPath)) {
                touch($dbPath);
                info('Created SQLite database file.');
            }

            return true;
        }

        // For MySQL/PostgreSQL
        $this->envVariables['DB_HOST'] = text(
            label: 'Database host',
            default: '127.0.0.1',
            required: true,
            hint: 'Use 127.0.0.1 instead of localhost for reliability'
        );

        $this->envVariables['DB_PORT'] = text(
            label: 'Database port',
            default: $driver === 'mysql' ? '3306' : '5432',
            required: true
        );

        $this->envVariables['DB_DATABASE'] = text(
            label: 'Database name',
            default: 'fluxdesk',
            required: true
        );

        $this->envVariables['DB_USERNAME'] = text(
            label: 'Database username',
            required: true
        );

        $this->envVariables['DB_PASSWORD'] = password(
            label: 'Database password',
            required: false,
            hint: 'Leave empty if no password'
        );

        // Test connection
        return $this->testDatabaseConnection();
    }

    protected function testDatabaseConnection(): bool
    {
        $result = spin(function () {
            try {
                $driver = $this->envVariables['DB_CONNECTION'];

                config()->set('database.connections._install_test', [
                    'driver' => $driver,
                    'host' => $this->envVariables['DB_HOST'],
                    'port' => $this->envVariables['DB_PORT'],
                    'database' => $this->envVariables['DB_DATABASE'],
                    'username' => $this->envVariables['DB_USERNAME'],
                    'password' => $this->envVariables['DB_PASSWORD'] ?: '',
                    'charset' => $driver === 'mysql' ? 'utf8mb4' : 'utf8',
                    'collation' => $driver === 'mysql' ? 'utf8mb4_unicode_ci' : null,
                    'prefix' => '',
                    'strict' => true,
                ]);

                $this->database->connection('_install_test')->getPdo();

                return true;
            } catch (\Exception $e) {
                return $e->getMessage();
            }
        }, 'Testing database connection...');

        if ($result !== true) {
            error('Database connection failed: '.$result);

            if (confirm('Try again with different credentials?', true)) {
                return $this->configureDatabase();
            }

            return false;
        }

        info('Database connection successful.');

        return true;
    }

    protected function runMigrations(): bool
    {
        $result = spin(function () {
            try {
                // Write env vars first so migrations use correct connection
                $this->writeEnvironmentFile();

                // Clear config cache
                $this->callSilently('config:clear');

                // Run migrations
                $this->callSilently('migrate', ['--force' => true]);

                return true;
            } catch (\Exception $e) {
                return $e->getMessage();
            }
        }, 'Running database migrations...');

        if ($result !== true) {
            error('Migration failed: '.$result);

            return false;
        }

        info('Database migrations completed.');

        return true;
    }

    protected function configureMail(): void
    {
        note('Mail Configuration');

        $mailer = select(
            label: 'Mail driver',
            options: [
                'log' => 'Log (development only - emails written to log)',
                'smtp' => 'SMTP Server',
                'sendmail' => 'Sendmail',
            ],
            default: 'log'
        );

        $this->envVariables['MAIL_MAILER'] = $mailer;

        if ($mailer === 'smtp') {
            $this->envVariables['MAIL_HOST'] = text(
                label: 'SMTP host',
                default: 'smtp.mailgun.org',
                required: true
            );

            $this->envVariables['MAIL_PORT'] = text(
                label: 'SMTP port',
                default: '587',
                required: true
            );

            $this->envVariables['MAIL_USERNAME'] = text(
                label: 'SMTP username',
                required: false
            );

            $this->envVariables['MAIL_PASSWORD'] = password(
                label: 'SMTP password',
                required: false
            );

            $encryption = select(
                label: 'Encryption',
                options: [
                    'tls' => 'TLS (recommended)',
                    'ssl' => 'SSL',
                    'null' => 'None',
                ],
                default: 'tls'
            );

            $this->envVariables['MAIL_ENCRYPTION'] = $encryption === 'null' ? 'null' : $encryption;
        }

        $this->envVariables['MAIL_FROM_ADDRESS'] = text(
            label: 'From email address',
            default: 'support@'.parse_url($this->envVariables['APP_URL'], PHP_URL_HOST),
            required: true,
            hint: 'Email address that outgoing emails will be sent from'
        );

        $this->envVariables['MAIL_FROM_NAME'] = text(
            label: 'From name',
            default: $this->envVariables['APP_NAME'],
            required: true
        );

        if ($mailer === 'log') {
            warning('Using log driver. Emails will be written to storage/logs/laravel.log');
        }
    }

    protected function configureServices(): void
    {
        note('Cache, Sessions & Queue');

        info('These settings affect performance and background job processing.');

        $this->envVariables['CACHE_STORE'] = select(
            label: 'Cache store',
            options: [
                'database' => 'Database (recommended - works out of the box)',
                'file' => 'File System (simple but slower)',
                'redis' => 'Redis (high performance, requires Redis server)',
            ],
            default: 'database'
        );

        $this->envVariables['SESSION_DRIVER'] = select(
            label: 'Session driver',
            options: [
                'database' => 'Database (recommended)',
                'file' => 'File System',
                'redis' => 'Redis (high performance)',
            ],
            default: 'database'
        );

        $this->envVariables['QUEUE_CONNECTION'] = select(
            label: 'Queue driver',
            options: [
                'database' => 'Database (recommended - required for email sync)',
                'redis' => 'Redis (best for high volume)',
                'sync' => 'Synchronous (jobs run immediately, blocks requests)',
            ],
            default: 'database',
            hint: 'Queue is used for email sync, notifications, and background jobs'
        );

        if ($this->envVariables['QUEUE_CONNECTION'] === 'sync') {
            warning('Sync mode processes jobs immediately which blocks requests.');
            warning('For production with email sync, use Database or Redis instead.');
            info('You can change this later in your .env file (QUEUE_CONNECTION).');
        } else {
            info('Remember to run a queue worker in production: php artisan queue:work');
        }

        // Check if any service uses Redis
        $usesRedis = in_array('redis', [
            $this->envVariables['CACHE_STORE'],
            $this->envVariables['SESSION_DRIVER'],
            $this->envVariables['QUEUE_CONNECTION'],
        ]);

        if ($usesRedis) {
            $this->configureRedis();
        }
    }

    protected function configureRedis(): void
    {
        note('Redis Configuration');

        $this->envVariables['REDIS_HOST'] = text(
            label: 'Redis host',
            default: '127.0.0.1',
            required: true
        );

        $this->envVariables['REDIS_PORT'] = text(
            label: 'Redis port',
            default: '6379',
            required: true
        );

        $password = password(
            label: 'Redis password',
            required: false,
            hint: 'Leave empty if no password'
        );

        $this->envVariables['REDIS_PASSWORD'] = $password ?: 'null';

        // Test Redis connection
        $this->testRedisConnection();
    }

    protected function testRedisConnection(): bool
    {
        $result = spin(function () {
            try {
                $redis = new \Redis;
                $connected = $redis->connect(
                    $this->envVariables['REDIS_HOST'],
                    (int) $this->envVariables['REDIS_PORT'],
                    2.0
                );

                if (! $connected) {
                    return 'Could not connect to Redis server';
                }

                $password = $this->envVariables['REDIS_PASSWORD'];
                if ($password && $password !== 'null') {
                    if (! $redis->auth($password)) {
                        return 'Redis authentication failed';
                    }
                }

                $redis->ping();
                $redis->close();

                return true;
            } catch (\Exception $e) {
                return $e->getMessage();
            }
        }, 'Testing Redis connection...');

        if ($result !== true) {
            error('Redis connection failed: '.$result);

            if (confirm('Try again with different settings?', true)) {
                return $this->configureRedis();
            }

            warning('Continuing without Redis. You may need to configure it later.');

            return false;
        }

        info('Redis connection successful.');

        return true;
    }

    protected function createAdminUser(): void
    {
        note('Administrator Account');

        $name = text(
            label: 'Admin name',
            required: true
        );

        $email = text(
            label: 'Admin email',
            required: true,
            validate: fn (string $value) => filter_var($value, FILTER_VALIDATE_EMAIL)
                ? null
                : 'Please enter a valid email address'
        );

        $password = password(
            label: 'Admin password',
            required: true,
            validate: fn (string $value) => strlen($value) >= 8
                ? null
                : 'Password must be at least 8 characters'
        );

        $organizationName = text(
            label: 'Organization name',
            default: $this->envVariables['APP_NAME'],
            required: true,
            hint: 'Your company or team name'
        );

        spin(function () use ($name, $email, $password, $organizationName) {
            // Create user
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'is_super_admin' => true,
                'email_verified_at' => now(),
            ]);

            // Create organization
            $organization = Organization::create([
                'name' => $organizationName,
                'slug' => Str::slug($organizationName),
            ]);

            // Attach user as admin
            $user->organizations()->attach($organization->id, [
                'role' => UserRole::Admin->value,
                'is_default' => true,
            ]);
        }, 'Creating administrator account...');

        info('Administrator account created.');
    }

    protected function writeEnvironmentFile(): void
    {
        $envPath = base_path('.env');
        $envContent = file_get_contents($envPath);

        foreach ($this->envVariables as $key => $value) {
            // Escape special characters in value
            $escapedValue = $value;
            if (preg_match('/\s|[#"]/', $value)) {
                $escapedValue = '"'.addslashes($value).'"';
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

    protected function buildAssets(): void
    {
        if (! confirm('Build frontend assets now?', true)) {
            warning('Skipped frontend build. Run "npm install && npm run build" manually.');

            return;
        }

        spin(function () {
            exec('npm install 2>&1', $output, $exitCode);
            if ($exitCode !== 0) {
                throw new \Exception('npm install failed');
            }

            exec('npm run build 2>&1', $output, $exitCode);
            if ($exitCode !== 0) {
                throw new \Exception('npm build failed');
            }
        }, 'Building frontend assets (this may take a minute)...');

        info('Frontend assets built successfully.');
    }
}
