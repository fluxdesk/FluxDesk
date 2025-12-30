<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Services\AI\AIService;
use App\Services\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AIController extends Controller
{
    public function __construct(
        private AIService $aiService,
        private OrganizationContext $organizationContext,
    ) {}

    /**
     * Generate suggested replies for a ticket.
     */
    public function suggest(Request $request, Ticket $ticket): JsonResponse
    {
        $organization = $this->organizationContext->organization();

        if (! $this->aiService->isConfigured($organization)) {
            return response()->json([
                'error' => 'AI is niet geconfigureerd. Configureer eerst een AI provider in de instellingen.',
            ], 422);
        }

        $settings = $organization->aiSettings;

        if (! $settings->suggested_replies_enabled) {
            return response()->json([
                'error' => 'Suggesties zijn uitgeschakeld in de AI instellingen.',
            ], 422);
        }

        try {
            $suggestions = $this->aiService->suggestReplies(
                $ticket,
                count: 3,
                user: $request->user()
            );

            return response()->json([
                'suggestions' => $suggestions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Kon geen suggesties genereren: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Refactor/improve reply text.
     */
    public function refactor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'text' => ['required', 'string', 'min:10', 'max:10000'],
            'instructions' => ['nullable', 'string', 'max:500'],
            'ticket_id' => ['nullable', 'integer', 'exists:tickets,id'],
        ]);

        $organization = $this->organizationContext->organization();

        if (! $this->aiService->isConfigured($organization)) {
            return response()->json([
                'error' => 'AI is niet geconfigureerd. Configureer eerst een AI provider in de instellingen.',
            ], 422);
        }

        $settings = $organization->aiSettings;

        if (! $settings->reply_refactor_enabled) {
            return response()->json([
                'error' => 'Tekst verbeteren is uitgeschakeld in de AI instellingen.',
            ], 422);
        }

        $ticket = null;
        if (! empty($validated['ticket_id'])) {
            $ticket = Ticket::find($validated['ticket_id']);
        }

        try {
            $refactored = $this->aiService->refactorReply(
                $validated['text'],
                $organization,
                $validated['instructions'] ?? null,
                $request->user(),
                $ticket
            );

            return response()->json([
                'text' => $refactored,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Kon tekst niet verbeteren: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check if AI is configured and available.
     */
    public function status(): JsonResponse
    {
        $organization = $this->organizationContext->organization();
        $settings = $organization->aiSettings;

        return response()->json([
            'configured' => $this->aiService->isConfigured($organization),
            'suggested_replies_enabled' => $settings?->suggested_replies_enabled ?? false,
            'reply_refactor_enabled' => $settings?->reply_refactor_enabled ?? false,
        ]);
    }
}
