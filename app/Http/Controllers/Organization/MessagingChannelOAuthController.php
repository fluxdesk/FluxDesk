<?php

namespace App\Http\Controllers\Organization;

use App\Enums\MessagingProvider;
use App\Http\Controllers\Controller;
use App\Models\MessagingChannel;
use App\Services\Messaging\MessagingProviderFactory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

/**
 * Handles OAuth authentication flow for messaging channels.
 *
 * Manages the redirect to OAuth provider and callback handling
 * for Instagram/Meta messaging integrations.
 */
class MessagingChannelOAuthController extends Controller
{
    public function __construct(
        private MessagingProviderFactory $providerFactory,
    ) {}

    /**
     * Start the OAuth authorization flow.
     */
    public function redirect(MessagingChannel $messagingChannel): RedirectResponse|\Illuminate\Http\Response
    {
        if (! $messagingChannel->provider->requiresOAuth()) {
            return redirect()->route('organization.messaging-channels.index')
                ->with('error', 'This messaging channel does not use OAuth authentication.');
        }

        // Check if the organization has the integration configured and active
        $integrationId = $messagingChannel->provider->integrationIdentifier();
        if ($integrationId) {
            $orgIntegration = $messagingChannel->organization->integration($integrationId);

            if (! $orgIntegration || ! $orgIntegration->is_active) {
                return redirect()->route('organization.integrations.index')
                    ->with('error', 'Please configure the Meta integration before connecting a messaging channel.');
            }
        }

        // Generate a state token with channel ID for callback verification
        $state = base64_encode(json_encode([
            'channel_id' => $messagingChannel->id,
            'organization_id' => $messagingChannel->organization_id,
            'csrf' => csrf_token(),
        ]));

        // Store state in session for verification
        session(['messaging_oauth_state' => $state]);

        try {
            $provider = $this->providerFactory->make($messagingChannel);
            $authUrl = $provider->getAuthorizationUrl($state);

            // Use Inertia::location for full page redirect to external OAuth URL
            return Inertia::location($authUrl);
        } catch (\Exception $e) {
            Log::error('Failed to generate messaging OAuth authorization URL', [
                'channel_id' => $messagingChannel->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->route('organization.messaging-channels.index')
                ->with('error', 'Failed to start authentication. Please try again.');
        }
    }

    /**
     * Handle the OAuth callback from the provider.
     */
    public function callback(Request $request, string $provider): RedirectResponse
    {
        // Check for errors from the OAuth provider
        if ($request->has('error')) {
            $error = $request->input('error_description', $request->input('error'));

            return redirect()->route('organization.messaging-channels.index')
                ->with('error', 'Authentication failed: '.$error);
        }

        // Verify authorization code is present
        $code = $request->input('code');
        if (! $code) {
            return redirect()->route('organization.messaging-channels.index')
                ->with('error', 'No authorization code received.');
        }

        // Verify state to prevent CSRF attacks
        $state = $request->input('state');
        $storedState = session('messaging_oauth_state');

        if (! $state || $state !== $storedState) {
            Log::warning('Messaging OAuth state mismatch detected');

            return redirect()->route('organization.messaging-channels.index')
                ->with('error', 'Invalid state parameter. Please try again.');
        }

        // Decode state to get channel ID
        try {
            $stateData = json_decode(base64_decode($state), true);
            $channelId = $stateData['channel_id'] ?? null;
        } catch (\Exception $e) {
            return redirect()->route('organization.messaging-channels.index')
                ->with('error', 'Invalid state data.');
        }

        if (! $channelId) {
            return redirect()->route('organization.messaging-channels.index')
                ->with('error', 'No channel ID in state.');
        }

        // Find the messaging channel
        $messagingChannel = MessagingChannel::find($channelId);
        if (! $messagingChannel) {
            return redirect()->route('organization.messaging-channels.index')
                ->with('error', 'Messaging channel not found.');
        }

        // Verify the provider matches
        $expectedProvider = match ($provider) {
            'instagram' => MessagingProvider::Instagram,
            'facebook_messenger' => MessagingProvider::FacebookMessenger,
            'whatsapp' => MessagingProvider::WhatsApp,
            default => null,
        };

        if ($expectedProvider && $messagingChannel->provider !== $expectedProvider) {
            return redirect()->route('organization.messaging-channels.index')
                ->with('error', 'Provider mismatch.');
        }

        // Clear the state from session
        session()->forget('messaging_oauth_state');

        // Exchange authorization code for tokens
        try {
            $providerService = $this->providerFactory->make($messagingChannel);
            $providerService->handleCallback($code, $messagingChannel);

            Log::info('OAuth authentication successful for messaging channel', [
                'channel_id' => $messagingChannel->id,
                'provider' => $messagingChannel->provider->value,
            ]);

            // Redirect to configuration page to select account
            return redirect()->route('organization.messaging-channels.configure', $messagingChannel)
                ->with('success', 'Authentication successful. Please select your account to complete setup.');
        } catch (\Exception $e) {
            Log::error('Messaging OAuth callback failed', [
                'channel_id' => $messagingChannel->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->route('organization.messaging-channels.index')
                ->with('error', 'Failed to complete authentication. Please try again.');
        }
    }
}
