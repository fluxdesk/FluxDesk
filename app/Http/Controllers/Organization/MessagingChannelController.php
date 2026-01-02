<?php

namespace App\Http\Controllers\Organization;

use App\Enums\MessagingProvider;
use App\Http\Controllers\Controller;
use App\Integrations\IntegrationManager;
use App\Models\Department;
use App\Models\MessagingChannel;
use App\Services\Messaging\AutoReplyVariableService;
use App\Services\Messaging\MessagingProviderFactory;
use App\Services\OrganizationContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MessagingChannelController extends Controller
{
    public function __construct(
        private OrganizationContext $organizationContext,
        private MessagingProviderFactory $providerFactory,
        private IntegrationManager $integrationManager,
        private AutoReplyVariableService $autoReplyVariableService,
    ) {}

    public function index(): Response
    {
        $organization = $this->organizationContext->organization();
        $channels = MessagingChannel::with('department:id,name,color')->orderBy('name')->get();
        $departments = Department::orderBy('sort_order')->get(['id', 'name', 'color']);

        // Get supported providers from factory with availability based on integration status
        $providers = collect(MessagingProvider::cases())
            ->filter(fn ($provider) => $this->providerFactory->isSupported($provider))
            ->map(function ($provider) use ($organization) {
                $integrationId = $provider->integrationIdentifier();
                $isAvailable = true;
                $hint = null;

                // Check if this provider requires an integration to be configured
                if ($integrationId) {
                    $integration = $organization->integration($integrationId);
                    $isAvailable = $integration?->is_verified && $integration?->is_active;

                    if (! $integration) {
                        $hint = 'Configure the integration in Settings first';
                    } elseif (! $integration->is_verified) {
                        $hint = 'Integration is not verified';
                    } elseif (! $integration->is_active) {
                        $hint = 'Integration is not active';
                    }
                }

                return [
                    'value' => $provider->value,
                    'label' => $provider->label(),
                    'description' => $provider->description(),
                    'icon' => $provider->icon(),
                    'color' => $provider->color(),
                    'available' => $isAvailable,
                    'hint' => $hint,
                    'requires_oauth' => $provider->requiresOAuth(),
                ];
            })
            ->values()
            ->all();

        // Get available auto-reply variables
        $autoReplyVariables = $this->autoReplyVariableService->getAvailableVariables();

        return Inertia::render('organization/messaging-channels', [
            'channels' => $channels,
            'providers' => $providers,
            'departments' => $departments,
            'autoReplyVariables' => $autoReplyVariables,
        ]);
    }

    public function store(Request $request): RedirectResponse|\Illuminate\Http\Response
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'provider' => ['required', 'string', Rule::in(collect(MessagingProvider::cases())->pluck('value'))],
            'department_id' => ['nullable', 'exists:departments,id'],
            'is_default' => ['boolean'],
        ]);

        $provider = MessagingProvider::from($validated['provider']);

        $channel = MessagingChannel::create([
            'organization_id' => $this->organizationContext->id(),
            'name' => $validated['name'],
            'provider' => $provider,
            'department_id' => $validated['department_id'] ?? null,
            'is_default' => $request->boolean('is_default', false),
            'is_active' => false, // Will be activated after OAuth
        ]);

        // If this is set as default, update others
        if ($request->boolean('is_default')) {
            MessagingChannel::where('id', '!=', $channel->id)
                ->update(['is_default' => false]);
        }

        // Redirect to OAuth flow for OAuth providers
        if ($provider->requiresOAuth()) {
            return Inertia::location(route('organization.messaging-channels.oauth.redirect', $channel));
        }

        return back()->with('success', 'Messaging channel created successfully.');
    }

    public function update(Request $request, MessagingChannel $messagingChannel): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'is_default' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        $messagingChannel->update($validated);

        // If this is set as default, update others
        if ($request->boolean('is_default')) {
            MessagingChannel::where('id', '!=', $messagingChannel->id)
                ->update(['is_default' => false]);
        }

        return back()->with('success', 'Messaging channel updated successfully.');
    }

    public function updateAutoReply(Request $request, MessagingChannel $messagingChannel): RedirectResponse
    {
        $validated = $request->validate([
            'auto_reply_enabled' => ['required', 'boolean'],
            'auto_reply_message' => ['nullable', 'string', 'max:2000'],
            'auto_reply_business_hours_only' => ['boolean'],
            'auto_reply_delay_seconds' => ['integer', 'min:0', 'max:3600'],
        ]);

        $messagingChannel->update($validated);

        return back()->with('success', 'Auto-reply settings updated successfully.');
    }

    public function destroy(MessagingChannel $messagingChannel): RedirectResponse
    {
        if ($messagingChannel->is_default) {
            return back()->with('error', 'Cannot delete the default messaging channel.');
        }

        if ($messagingChannel->tickets()->exists()) {
            return back()->with('error', 'Cannot delete a messaging channel that has tickets.');
        }

        $messagingChannel->delete();

        return back()->with('success', 'Messaging channel deleted successfully.');
    }

    public function testConnection(MessagingChannel $messagingChannel): RedirectResponse
    {
        if (! $messagingChannel->access_token) {
            return back()->with('error', 'Messaging channel is not authenticated.');
        }

        try {
            $provider = $this->providerFactory->make($messagingChannel);
            $result = $provider->testConnection($messagingChannel);

            if ($result['success']) {
                return back()->with('success', $result['message']);
            }

            return back()->with('error', "Connection failed: {$result['message']}");
        } catch (\Exception $e) {
            Log::error('Messaging channel connection test failed', [
                'channel_id' => $messagingChannel->id,
                'error' => $e->getMessage(),
            ]);

            return back()->with('error', 'Connection test failed. Please check your settings and try again.');
        }
    }

    public function logs(MessagingChannel $messagingChannel): Response
    {
        $filter = request('filter', 'all');

        $query = $messagingChannel->logs()
            ->with(['ticket:id,ticket_number,subject', 'message:id']);

        // Apply filter
        if ($filter === 'webhook') {
            $query->where('type', 'webhook');
        } elseif ($filter === 'send') {
            $query->where('type', 'send');
        } elseif ($filter === 'auto_reply') {
            $query->where('type', 'auto_reply');
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
            'total' => $messagingChannel->logs()->count(),
            'webhooks' => $messagingChannel->logs()->where('type', 'webhook')->count(),
            'sends' => $messagingChannel->logs()->where('type', 'send')->count(),
            'auto_replies' => $messagingChannel->logs()->where('type', 'auto_reply')->count(),
            'failed' => $messagingChannel->logs()->where('status', 'failed')->count(),
        ];

        return Inertia::render('organization/messaging-channels/logs', [
            'channel' => $messagingChannel,
            'logs' => $logs,
            'stats' => $stats,
            'filter' => $filter,
        ]);
    }

    public function configure(MessagingChannel $messagingChannel): Response|RedirectResponse
    {
        if (! $messagingChannel->access_token) {
            return redirect()->route('organization.messaging-channels.index')
                ->with('error', 'Please complete OAuth authentication first.');
        }

        // Get available accounts (Instagram pages, etc.)
        $accounts = [];
        try {
            $provider = $this->providerFactory->make($messagingChannel);
            $accounts = $provider->getAvailableAccounts($messagingChannel);
        } catch (\Exception $e) {
            Log::error('Failed to get available accounts', [
                'channel_id' => $messagingChannel->id,
                'error' => $e->getMessage(),
            ]);
        }

        $departments = Department::orderBy('sort_order')->get();

        return Inertia::render('organization/messaging-channels/configure', [
            'channel' => $messagingChannel,
            'accounts' => $accounts,
            'departments' => $departments,
        ]);
    }

    public function updateConfiguration(Request $request, MessagingChannel $messagingChannel): RedirectResponse
    {
        $validated = $request->validate([
            'external_id' => ['required', 'string'],
            'external_name' => ['nullable', 'string', 'max:255'],
            'external_username' => ['nullable', 'string', 'max:255'],
            'department_id' => ['nullable', 'exists:departments,id'],
        ]);

        // If we have a page_access_token in the accounts data, use that
        if ($request->has('page_access_token')) {
            $validated['access_token'] = $request->input('page_access_token');
        }

        $messagingChannel->update([
            'external_id' => $validated['external_id'],
            'external_name' => $validated['external_name'] ?? null,
            'external_username' => $validated['external_username'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'access_token' => $validated['access_token'] ?? $messagingChannel->access_token,
            'is_active' => true,
        ]);

        // Subscribe to webhooks
        try {
            $provider = $this->providerFactory->make($messagingChannel);
            $provider->subscribeToWebhooks($messagingChannel);
        } catch (\Exception $e) {
            Log::warning('Failed to subscribe to webhooks', [
                'channel_id' => $messagingChannel->id,
                'error' => $e->getMessage(),
            ]);
        }

        return redirect()->route('organization.messaging-channels.index')
            ->with('success', 'Messaging channel configured and activated successfully.');
    }

    public function previewAutoReply(Request $request): \Illuminate\Http\JsonResponse
    {
        $template = $request->input('template', '');
        $organization = $this->organizationContext->organization();

        $preview = $this->autoReplyVariableService->preview($template, $organization);

        return response()->json(['preview' => $preview]);
    }
}
