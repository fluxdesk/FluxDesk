# FluxDesk Upgrade Guide

This guide explains how FluxDesk handles version management, checking for updates, and performing upgrades.

## GUI Upgrade (Recommended)

FluxDesk now includes a graphical upgrade interface that handles the entire upgrade process automatically.

### How to Use

1. When a new version is available, super admins will see a notification modal
2. Click "Nu upgraden" to go to the upgrade page
3. Click "Upgrade starten" to begin the automated upgrade

### What the GUI Upgrade Does

The automated upgrade performs these steps:
1. Enables maintenance mode (with secret bypass for admins)
2. Fetches latest tags from GitHub (`git fetch --all --tags`)
3. Downloads new files (`git pull --ff-only` or checkout to latest tag)
4. Installs PHP dependencies (`composer install --no-dev --optimize-autoloader`)
5. Installs Node.js dependencies (`npm install`)
6. Builds frontend assets (`npm run build`)
7. Runs database migrations
8. Clears and rebuilds all caches
9. Updates version cache
10. Disables maintenance mode

### Maintenance Mode During Upgrade

During the upgrade, the application is in maintenance mode. The upgrade routes are accessible via a secret bypass cookie, so you can continue to monitor the upgrade progress.

## Version Management

FluxDesk uses **git tags** for version management instead of hardcoded version numbers. This means:

- The current version is determined by the latest git tag on your installation
- The remote/latest version is fetched from GitHub releases
- No manual version updates are needed in configuration files

### How Version Detection Works

1. **Current Version**: Retrieved using `git describe --tags --abbrev=0`
2. **Latest Version**: Fetched from the GitHub API (`/repos/{owner}/{repo}/releases/latest`)
3. **Caching**: Both versions are cached to reduce API calls and git operations
   - Current version: cached for 24 hours
   - Latest version: cached for 1 hour

### Fallback Mechanism

If git tags are not available (e.g., in a non-git deployment), FluxDesk will:

1. Look for a `.version` file in the project root
2. Return "unknown" if no version information is found

## Checking for Updates

### Via Command Line

```bash
# Display current version
php artisan fluxdesk:version

# Check for updates
php artisan fluxdesk:version --check

# Force refresh version cache and check
php artisan fluxdesk:version --refresh
```

### Via Web Interface

Navigate to the upgrade page in your FluxDesk admin panel to see version status and available updates.

### Automatic Update Notifications

Super admin users will automatically see a modal notification when a new version is available. This modal:

- Appears immediately upon login when an update is available
- Shows current version vs. latest version comparison
- Links directly to the GitHub release notes
- Can be dismissed with "Remind me later" (dismissal persists in browser localStorage)
- Will reappear when a newer version becomes available

To reset the dismissal (useful for testing):

```javascript
// In browser developer console
localStorage.removeItem('fluxdesk_update_dismissed');
```

Then refresh the page to see the modal again.

## Performing an Upgrade

### Step 1: Backup Your Data

Before upgrading, always backup your database and any custom configurations:

```bash
# Backup database (example for MySQL)
mysqldump -u user -p fluxdesk > backup.sql

# Or for SQLite
cp database/database.sqlite database/database.sqlite.backup
```

### Step 2: Pull Latest Changes

```bash
# Navigate to your FluxDesk installation
cd /path/to/fluxdesk

# Fetch latest changes
git fetch --all --tags

# Checkout the latest release tag
git checkout $(git describe --tags $(git rev-list --tags --max-count=1))

# Or checkout a specific version
git checkout v1.0.2
```

### Step 3: Install Dependencies

```bash
# Install PHP dependencies
composer install --no-dev --optimize-autoloader

# Install Node dependencies and build assets
npm install
npm run build
```

### Step 4: Run Upgrade Command

```bash
php artisan fluxdesk:upgrade
```

This command will:
1. Clear the version cache
2. Run database migrations
3. Clear application caches
4. Rebuild route cache
5. Rebuild view cache
6. Rebuild config cache

### Step 5: Verify the Upgrade

```bash
php artisan fluxdesk:version --check
```

## Creating a New Release (For Maintainers)

### Tagging a Release

```bash
# Create an annotated tag
git tag -a v1.0.2 -m "Release v1.0.2: Description of changes"

# Push the tag to remote
git push origin v1.0.2
```

### Semantic Versioning

FluxDesk follows semantic versioning (SemVer):

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features, backwards compatible
- **PATCH** (0.0.x): Bug fixes, backwards compatible

## Troubleshooting

### Version Shows as "unknown"

This typically means git tags are not available. Solutions:

1. Ensure you're in a git repository: `git status`
2. Fetch tags from remote: `git fetch --tags`
3. Create a `.version` file in the project root with the version number

### Cache Issues

If the version information seems stale:

```bash
# Clear version cache via command
php artisan fluxdesk:version --refresh

# Or clear manually using tinker
php artisan tinker
>>> app(App\Services\VersionCheckService::class)->flushVersionCache();
```

### GitHub API Rate Limiting

If you're getting errors fetching the latest version, you may be rate-limited by GitHub. The application caches results to minimize API calls. Wait an hour or use a GitHub token for higher limits.

## Testing Locally

### Testing Version Detection

```bash
# Check current git tag
git describe --tags --abbrev=0

# Create a test tag
git tag -a v1.0.99 -m "Test version"

# Clear cache and verify
php artisan fluxdesk:version --refresh

# Clean up test tag
git tag -d v1.0.99
```

### Testing Upgrade Process

```bash
# Simulate the upgrade without making actual changes
php artisan migrate --pretend

# Run the full upgrade in a development environment
php artisan fluxdesk:upgrade

# Verify all caches are working
php artisan route:list
php artisan config:show app
```

### Testing Version Comparison

```php
// In tinker
$service = app(\App\Services\VersionCheckService::class);

// Get current version from git
$service->flushVersionCache();
echo $service->getCurrentVersion();

// Get latest from GitHub
echo $service->getLatestVersion()['version'];

// Check if outdated
var_dump($service->isOutOfDate());

// Get full status
print_r($service->getVersionStatus());
```

### Testing the Update Modal

To test the update notification modal locally:

1. **Create a fake outdated version:**
   ```bash
   # Create a tag with a lower version than what's on GitHub
   git tag -a v0.0.1 -m "Test old version"

   # Clear the cache
   php artisan fluxdesk:version --refresh
   ```

2. **Login as a super admin** and you should see the modal appear

3. **Test dismissal:**
   - Click "Remind me later" - modal should close
   - Refresh the page - modal should NOT appear
   - Open browser console and run: `localStorage.removeItem('fluxdesk_update_dismissed')`
   - Refresh - modal should appear again

4. **Clean up:**
   ```bash
   # Remove the test tag
   git tag -d v0.0.1

   # Restore correct version
   php artisan fluxdesk:version --refresh
   ```

## API Reference

### VersionCheckService Methods

| Method | Description |
|--------|-------------|
| `getCurrentVersion()` | Get current version from git tag |
| `getLatestVersion()` | Get latest version info from GitHub |
| `isOutOfDate()` | Check if current < latest |
| `getVersionStatus()` | Get full version comparison data |
| `getFullStatus()` | Version status + PHP version |
| `flushVersionCache()` | Clear all version caches |
| `flushCurrentVersionCache()` | Clear only current version cache |
| `flushLatestVersionCache()` | Clear only latest version cache |
| `refreshVersionData()` | Flush cache and return fresh data |
| `getPhpVersion()` | Get current PHP version |
| `getGitHubRepo()` | Get configured GitHub repository |
