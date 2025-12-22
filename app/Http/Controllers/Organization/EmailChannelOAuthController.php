<?php

namespace App\Http\Controllers\Organization;

use App\Enums\EmailProvider;
use App\Http\Controllers\Controller;
use App\Models\EmailChannel;
use App\Services\Email\EmailProviderFactory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

/**
 * Handles OAuth authentication flow for email channels.
 *
 * Manages the redirect to OAuth provider and callback handling
 * for Microsoft 365 and Google Workspace email integrations.
 */
class EmailChannelOAuthController extends Controller
{
    public function __construct(
        private EmailProviderFactory $providerFactory,
    ) {}

    /**
     * Start the OAuth authorization flow.
     */
    public function redirect(EmailChannel $emailChannel): RedirectResponse|\Illuminate\Http\Response
    {
        if (! $emailChannel->usesOAuth()) {
            return redirect()->route('organization.email-channels.index')
                ->with('error', 'This email channel does not use OAuth authentication.');
        }

        // Generate a state token with channel ID for callback verification
        $state = base64_encode(json_encode([
            'channel_id' => $emailChannel->id,
            'organization_id' => $emailChannel->organization_id,
            'csrf' => csrf_token(),
        ]));

        // Store state in session for verification
        session(['oauth_state' => $state]);

        try {
            $provider = $this->providerFactory->make($emailChannel);
            $authUrl = $provider->getAuthorizationUrl($state);

            // Use Inertia::location for full page redirect to external OAuth URL
            return Inertia::location($authUrl);
        } catch (\Exception $e) {
            Log::error('Failed to generate OAuth authorization URL', [
                'channel_id' => $emailChannel->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->route('organization.email-channels.index')
                ->with('error', 'Failed to start authentication: '.$e->getMessage());
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

            return redirect()->route('organization.email-channels.index')
                ->with('error', 'Authentication failed: '.$error);
        }

        // Verify authorization code is present
        $code = $request->input('code');
        if (! $code) {
            return redirect()->route('organization.email-channels.index')
                ->with('error', 'No authorization code received.');
        }

        // Verify state to prevent CSRF attacks
        $state = $request->input('state');
        $storedState = session('oauth_state');

        if (! $state || $state !== $storedState) {
            Log::warning('OAuth state mismatch', [
                'received' => $state,
                'expected' => $storedState,
            ]);

            return redirect()->route('organization.email-channels.index')
                ->with('error', 'Invalid state parameter. Please try again.');
        }

        // Decode state to get channel ID
        try {
            $stateData = json_decode(base64_decode($state), true);
            $channelId = $stateData['channel_id'] ?? null;
        } catch (\Exception $e) {
            return redirect()->route('organization.email-channels.index')
                ->with('error', 'Invalid state data.');
        }

        if (! $channelId) {
            return redirect()->route('organization.email-channels.index')
                ->with('error', 'No channel ID in state.');
        }

        // Find the email channel
        $emailChannel = EmailChannel::find($channelId);
        if (! $emailChannel) {
            return redirect()->route('organization.email-channels.index')
                ->with('error', 'Email channel not found.');
        }

        // Verify the provider matches
        $expectedProvider = match ($provider) {
            'microsoft365' => EmailProvider::Microsoft365,
            'google' => EmailProvider::Google,
            default => null,
        };

        if ($emailChannel->provider !== $expectedProvider) {
            return redirect()->route('organization.email-channels.index')
                ->with('error', 'Provider mismatch.');
        }

        // Clear the state from session
        session()->forget('oauth_state');

        // Exchange authorization code for tokens
        try {
            $providerService = $this->providerFactory->make($emailChannel);
            $providerService->handleCallback($code, $emailChannel);

            Log::info('OAuth authentication successful for email channel', [
                'channel_id' => $emailChannel->id,
                'email' => $emailChannel->email_address,
            ]);

            // Redirect to configuration page to select folder and post-import actions
            return redirect()->route('organization.email-channels.configure', $emailChannel)
                ->with('success', "Connected as {$emailChannel->email_address}. Please configure your import settings.");
        } catch (\Exception $e) {
            Log::error('OAuth callback failed', [
                'channel_id' => $emailChannel->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->route('organization.email-channels.index')
                ->with('error', 'Failed to complete authentication: '.$e->getMessage());
        }
    }
}
