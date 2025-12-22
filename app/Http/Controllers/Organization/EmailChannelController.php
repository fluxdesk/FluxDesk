<?php

namespace App\Http\Controllers\Organization;

use App\Enums\EmailProvider;
use App\Enums\PostImportAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\ConfigureEmailChannelRequest;
use App\Http\Requests\Organization\StoreEmailChannelRequest;
use App\Http\Requests\Organization\UpdateEmailChannelRequest;
use App\Jobs\SyncEmailChannelJob;
use App\Models\EmailChannel;
use App\Services\Email\EmailProviderFactory;
use App\Services\OrganizationContext;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class EmailChannelController extends Controller
{
    public function __construct(
        private OrganizationContext $organizationContext,
        private EmailProviderFactory $providerFactory,
    ) {}

    public function index(): Response
    {
        $organization = $this->organizationContext->organization();
        $channels = EmailChannel::orderBy('name')->get();

        // Get supported providers from factory
        $providers = collect(EmailProvider::cases())
            ->filter(fn ($provider) => $this->providerFactory->isSupported($provider))
            ->map(fn ($provider) => [
                'value' => $provider->value,
                'label' => $provider->label(),
            ])
            ->values()
            ->all();

        return Inertia::render('organization/email-channels', [
            'channels' => $channels,
            'providers' => $providers,
            'systemEmailChannelId' => $organization->settings->system_email_channel_id,
            'systemEmailsEnabled' => $organization->settings->system_emails_enabled ?? true,
        ]);
    }

    public function store(StoreEmailChannelRequest $request): RedirectResponse|\Illuminate\Http\Response
    {
        $channel = EmailChannel::create([
            'organization_id' => $this->organizationContext->id(),
            'name' => $request->name,
            'provider' => $request->provider,
            'is_default' => $request->boolean('is_default', false),
            'is_active' => false, // Will be activated after configuration
            'auto_reply_enabled' => $request->boolean('auto_reply_enabled', false),
        ]);

        // If this is set as default, update others
        if ($request->boolean('is_default')) {
            EmailChannel::where('id', '!=', $channel->id)
                ->update(['is_default' => false]);
        }

        // Redirect to OAuth flow for OAuth providers
        $provider = EmailProvider::from($request->provider);
        if (in_array($provider, [EmailProvider::Microsoft365, EmailProvider::Google])) {
            // Use Inertia::location for full page redirect to OAuth
            return Inertia::location(route('organization.email-channels.oauth.redirect', $channel));
        }

        return back()->with('success', 'Email channel created successfully.');
    }

    public function update(UpdateEmailChannelRequest $request, EmailChannel $emailChannel): RedirectResponse
    {
        $emailChannel->update($request->validated());

        // If this is set as default, update others
        if ($request->boolean('is_default')) {
            EmailChannel::where('id', '!=', $emailChannel->id)
                ->update(['is_default' => false]);
        }

        return back()->with('success', 'Email channel updated successfully.');
    }

    public function destroy(EmailChannel $emailChannel): RedirectResponse
    {
        if ($emailChannel->is_default) {
            return back()->with('error', 'Cannot delete the default email channel.');
        }

        if ($emailChannel->tickets()->exists()) {
            return back()->with('error', 'Cannot delete an email channel that has tickets.');
        }

        $emailChannel->delete();

        return back()->with('success', 'Email channel deleted successfully.');
    }

    public function testConnection(EmailChannel $emailChannel): RedirectResponse
    {
        if (! $emailChannel->oauth_token) {
            return back()->with('error', 'Email channel is not authenticated.');
        }

        try {
            $provider = $this->providerFactory->make($emailChannel);
            $result = $provider->testConnection($emailChannel);

            if ($result['success']) {
                return back()->with('success', "Connection successful. Connected as: {$result['email']}");
            }

            return back()->with('error', "Connection failed: {$result['error']}");
        } catch (\Exception $e) {
            return back()->with('error', "Connection test failed: {$e->getMessage()}");
        }
    }

    public function syncNow(EmailChannel $emailChannel): RedirectResponse
    {
        if (! $emailChannel->is_active) {
            return back()->with('error', 'Cannot sync inactive email channel.');
        }

        if (! $emailChannel->oauth_token) {
            return back()->with('error', 'Email channel is not authenticated.');
        }

        SyncEmailChannelJob::dispatch($emailChannel);

        return back()->with('success', 'Email sync job dispatched. Check back shortly for new messages.');
    }

    public function configure(EmailChannel $emailChannel): Response|RedirectResponse
    {
        if (! $emailChannel->oauth_token) {
            return redirect()->route('organization.email-channels.index')
                ->with('error', 'Please complete OAuth authentication first.');
        }

        // Get mail folders from the email provider
        $mailFolders = [];
        try {
            $provider = $this->providerFactory->make($emailChannel);
            $mailFolders = $provider->getMailFolders($emailChannel);
        } catch (\Exception $e) {
            // We'll show the page anyway, folders will be loaded via AJAX
        }

        $postImportActions = collect(PostImportAction::cases())
            ->map(fn ($action) => [
                'value' => $action->value,
                'label' => $action->label(),
                'description' => $action->description(),
            ])
            ->values()
            ->all();

        return Inertia::render('organization/email-channels/configure', [
            'channel' => $emailChannel,
            'mailFolders' => $mailFolders,
            'postImportActions' => $postImportActions,
            'defaultImportSince' => now()->toDateString(),
        ]);
    }

    public function updateConfiguration(ConfigureEmailChannelRequest $request, EmailChannel $emailChannel): RedirectResponse
    {
        // Determine the import_emails_since value based on user's choice
        // If import_old_emails is true and a date is provided, use that date
        // If import_old_emails is false, use "now" to only import new emails
        $importEmailsSince = null;
        if (! $request->boolean('import_old_emails')) {
            // User wants only new emails - set cutoff to now
            $importEmailsSince = now();
        } elseif ($request->filled('import_emails_since')) {
            // User wants to import from a specific date
            $importEmailsSince = Carbon::parse($request->input('import_emails_since'))->startOfDay();
        }
        // If import_old_emails is true but no date, leave null (import all available)

        $emailChannel->update([
            'fetch_folder' => $request->fetch_folder,
            'post_import_action' => $request->post_import_action,
            'post_import_folder' => $request->post_import_action === PostImportAction::MoveToFolder->value
                ? $request->post_import_folder
                : null,
            'sync_interval_minutes' => $request->input('sync_interval_minutes', 5),
            'import_emails_since' => $importEmailsSince,
            'is_active' => true,
        ]);

        return redirect()->route('organization.email-channels.index')
            ->with('success', 'Email channel configured and activated successfully.');
    }

    public function getFolders(EmailChannel $emailChannel)
    {
        if (! $emailChannel->oauth_token) {
            return response()->json(['error' => 'Not authenticated'], 400);
        }

        try {
            $provider = $this->providerFactory->make($emailChannel);
            $folders = $provider->getMailFolders($emailChannel);

            return response()->json(['folders' => $folders]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function logs(EmailChannel $emailChannel): Response
    {
        $filter = request('filter', 'all');

        $query = $emailChannel->logs()
            ->with(['ticket:id,ticket_number,subject', 'message:id']);

        // Apply filter
        if ($filter === 'sync') {
            $query->where('type', 'sync');
        } elseif ($filter === 'send') {
            $query->where('type', 'send');
        } elseif ($filter === 'failed') {
            $query->where('status', 'failed');
        }

        $logs = $query->paginate(50);

        // Add computed attributes
        $logs->getCollection()->transform(function ($log) {
            return array_merge($log->toArray(), [
                'description' => $log->description,
                'status_color' => $log->status_color,
                'type_label' => $log->type_label,
            ]);
        });

        // Get stats
        $stats = [
            'total' => $emailChannel->logs()->count(),
            'syncs' => $emailChannel->logs()->where('type', 'sync')->count(),
            'sends' => $emailChannel->logs()->where('type', 'send')->count(),
            'failed' => $emailChannel->logs()->where('status', 'failed')->count(),
        ];

        return Inertia::render('organization/email-channels/logs', [
            'channel' => $emailChannel,
            'logs' => $logs,
            'stats' => $stats,
            'filter' => $filter,
        ]);
    }

    public function updateSystemEmail(): RedirectResponse
    {
        $validated = request()->validate([
            'system_email_channel_id' => ['nullable', 'string'],
        ]);

        // Convert "default" to null, otherwise validate it exists
        $channelId = $validated['system_email_channel_id'];
        if ($channelId === 'default' || $channelId === null || $channelId === '') {
            $channelId = null;
        } else {
            // Validate the channel exists
            if (! EmailChannel::where('id', $channelId)->exists()) {
                return back()->with('error', 'Geselecteerd e-mailkanaal bestaat niet.');
            }
        }

        $this->organizationContext->organization()->settings->update([
            'system_email_channel_id' => $channelId,
        ]);

        return back()->with('success', 'Systeem e-mail instellingen opgeslagen.');
    }

    /**
     * Toggle system emails enabled/disabled.
     *
     * When disabled, no outgoing emails will be sent for tickets.
     * This is useful during migrations to prevent duplicate notifications.
     */
    public function updateSystemEmailsEnabled(): RedirectResponse
    {
        $validated = request()->validate([
            'system_emails_enabled' => ['required', 'boolean'],
        ]);

        $this->organizationContext->organization()->settings->update([
            'system_emails_enabled' => $validated['system_emails_enabled'],
        ]);

        $message = $validated['system_emails_enabled']
            ? 'Systeem e-mails zijn ingeschakeld.'
            : 'Systeem e-mails zijn uitgeschakeld.';

        return back()->with('success', $message);
    }
}
