<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Integrations\IntegrationManager;
use App\Jobs\ProcessMessagingWebhookJob;
use App\Models\MessagingChannel;
use App\Models\OrganizationIntegration;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class MessagingWebhookController extends Controller
{
    public function __construct(
        private readonly IntegrationManager $integrationManager
    ) {}

    /**
     * Handle Meta webhook verification (Instagram, Facebook).
     *
     * This is called by Meta when setting up or verifying a webhook subscription.
     */
    public function verifyMeta(Request $request): Response
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        Log::info('Meta webhook verification request', [
            'mode' => $mode,
            'has_token' => ! empty($token),
            'has_challenge' => ! empty($challenge),
        ]);

        if ($mode !== 'subscribe') {
            return response('Invalid mode', 403);
        }

        if (! $token || ! $challenge) {
            return response('Missing token or challenge', 400);
        }

        // Find an organization integration that matches this verify token
        $integration = OrganizationIntegration::query()
            ->where('integration', 'meta')
            ->where('is_active', true)
            ->get()
            ->first(function (OrganizationIntegration $integration) use ($token) {
                $credentials = $integration->credentials ?? [];
                $verifyToken = $credentials['webhook_verify_token'] ?? '';

                return hash_equals($verifyToken, $token);
            });

        if (! $integration) {
            Log::warning('Meta webhook verification failed - no matching token', [
                'token_prefix' => substr($token, 0, 8).'...',
            ]);

            return response('Invalid verify token', 403);
        }

        Log::info('Meta webhook verification successful', [
            'organization_id' => $integration->organization_id,
        ]);

        return response($challenge, 200);
    }

    /**
     * Handle Meta webhook events (Instagram, Facebook).
     *
     * Messages are processed asynchronously via a job.
     */
    public function handleMeta(Request $request): Response
    {
        $payload = $request->all();
        $signature = $request->header('X-Hub-Signature-256', '');

        Log::info('Meta webhook received', [
            'object' => $payload['object'] ?? 'unknown',
            'entry_count' => count($payload['entry'] ?? []),
            'has_signature' => ! empty($signature),
        ]);

        // Get the raw content for signature verification
        $rawContent = $request->getContent();

        // Determine which page(s) this event is for
        $pageIds = collect($payload['entry'] ?? [])
            ->pluck('id')
            ->unique()
            ->values()
            ->all();

        if (empty($pageIds)) {
            return response('OK', 200);
        }

        // Find matching messaging channels
        $channels = MessagingChannel::query()
            ->whereIn('external_id', $pageIds)
            ->where('is_active', true)
            ->with('organization')
            ->get();

        if ($channels->isEmpty()) {
            Log::debug('No active channels found for webhook', [
                'page_ids' => $pageIds,
            ]);

            return response('OK', 200);
        }

        // Validate signature for each channel's organization
        $validChannel = null;
        foreach ($channels as $channel) {
            $orgIntegration = $channel->organization->integration('meta');
            if (! $orgIntegration) {
                continue;
            }

            if ($this->validateMetaSignature($rawContent, $signature, $orgIntegration)) {
                $validChannel = $channel;
                break;
            }
        }

        if (! $validChannel) {
            Log::warning('Meta webhook signature validation failed', [
                'page_ids' => $pageIds,
            ]);

            // Still return 200 to prevent Meta from retrying
            return response('Invalid signature', 200);
        }

        // Dispatch job for async processing
        ProcessMessagingWebhookJob::dispatch('meta', $payload, $validChannel->id);

        return response('OK', 200);
    }

    /**
     * Validate Meta webhook signature.
     */
    private function validateMetaSignature(
        string $payload,
        string $signature,
        OrganizationIntegration $integration
    ): bool {
        if (empty($signature)) {
            return false;
        }

        $credentials = $integration->credentials ?? [];
        $appSecret = $credentials['app_secret'] ?? '';

        if (empty($appSecret)) {
            return false;
        }

        $expectedSignature = 'sha256='.hash_hmac('sha256', $payload, $appSecret);

        return hash_equals($expectedSignature, $signature);
    }
}
