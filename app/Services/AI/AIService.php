<?php

namespace App\Services\AI;

use App\Models\Organization;
use App\Models\OrganizationAISettings;
use App\Models\Ticket;
use App\Models\User;
use App\Services\AI\Contracts\AIProviderInterface;
use RuntimeException;

/**
 * High-level AI service for ticket-related operations.
 */
class AIService
{
    public function __construct(
        protected AIManager $manager,
        protected UsageTracker $usageTracker,
    ) {}

    /**
     * Generate suggested replies for a ticket.
     *
     * @return array<string>
     */
    public function suggestReplies(
        Ticket $ticket,
        int $count = 3,
        ?User $user = null,
    ): array {
        $organization = $ticket->organization;
        $settings = $this->getSettings($organization);
        $provider = $this->manager->forSettings($settings);

        $dataIncluded = [];
        $messages = $this->buildTicketContext($ticket, $settings, $dataIncluded);
        $messages[] = [
            'role' => 'user',
            'content' => $this->buildSuggestPrompt($ticket, $count, $settings),
        ];

        $response = $provider->chat($messages, [
            'model' => $settings->default_model ?? 'gpt-4o-mini',
            'temperature' => 0.7,
        ]);

        $this->usageTracker->log(
            $organization,
            $provider,
            $response,
            'suggest_reply',
            $user,
            $ticket,
            $dataIncluded
        );

        return $this->parseSuggestions($response->content, $count);
    }

    /**
     * Refactor/improve existing reply text.
     */
    public function refactorReply(
        string $text,
        Organization $organization,
        ?string $instructions = null,
        ?User $user = null,
        ?Ticket $ticket = null,
    ): string {
        $settings = $this->getSettings($organization);
        $provider = $this->manager->forSettings($settings);

        $messages = $this->buildSystemContext($settings);
        $messages[] = [
            'role' => 'user',
            'content' => $this->buildRefactorPrompt($text, $instructions, $settings),
        ];

        $response = $provider->chat($messages, [
            'model' => $settings->default_model ?? 'gpt-4o-mini',
            'temperature' => 0.3,
        ]);

        $this->usageTracker->log(
            $organization,
            $provider,
            $response,
            'refactor',
            $user,
            $ticket
        );

        return trim($response->content);
    }

    /**
     * Detect the language of text.
     */
    public function detectLanguage(string $text, Organization $organization): string
    {
        $settings = $this->getSettings($organization);
        $provider = $this->manager->forSettings($settings);

        $messages = [
            [
                'role' => 'system',
                'content' => 'You are a language detection assistant. Respond with only the ISO 639-1 two-letter language code (e.g., "en", "nl", "de", "fr").',
            ],
            [
                'role' => 'user',
                'content' => "Detect the language of this text and respond with only the ISO 639-1 code:\n\n{$text}",
            ],
        ];

        $response = $provider->chat($messages, [
            'model' => 'gpt-4o-mini',
            'temperature' => 0,
            'max_tokens' => 10,
        ]);

        $this->usageTracker->log(
            $organization,
            $provider,
            $response,
            'detect_language'
        );

        return strtolower(trim($response->content));
    }

    /**
     * Get the active provider for an organization.
     */
    public function getProvider(Organization $organization): AIProviderInterface
    {
        return $this->manager->forOrganization($organization);
    }

    /**
     * Check if AI is configured for an organization.
     */
    public function isConfigured(Organization $organization): bool
    {
        $settings = $organization->aiSettings;

        return $settings !== null && $settings->isConfigured();
    }

    /**
     * Get AI settings for an organization.
     */
    protected function getSettings(Organization $organization): OrganizationAISettings
    {
        $settings = $organization->aiSettings;

        if (! $settings) {
            throw new RuntimeException('AI settings not configured for this organization');
        }

        if (! $settings->isConfigured()) {
            throw new RuntimeException('AI provider not configured or inactive');
        }

        return $settings;
    }

    /**
     * Build system context messages from settings.
     *
     * @return array<array{role: string, content: string}>
     */
    protected function buildSystemContext(OrganizationAISettings $settings): array
    {
        $systemPrompt = 'You are a professional customer support assistant. ';

        if ($settings->company_context) {
            $systemPrompt .= "Company context: {$settings->company_context}\n\n";
        }

        if ($settings->system_instructions) {
            $systemPrompt .= "Instructions: {$settings->system_instructions}\n\n";
        }

        $language = $this->getLanguageName($settings->default_language);
        $systemPrompt .= "Respond in {$language} unless instructed otherwise.";

        return [
            ['role' => 'system', 'content' => $systemPrompt],
        ];
    }

    /**
     * Build ticket context for AI with privacy controls.
     *
     * @param  array<string>  $dataIncluded  Reference to track what data was included
     * @return array<array{role: string, content: string}>
     */
    protected function buildTicketContext(Ticket $ticket, OrganizationAISettings $settings, array &$dataIncluded = []): array
    {
        $messages = $this->buildSystemContext($settings);

        // Add ticket information
        $ticketContext = "## Ticket Information\n";

        // Subject (privacy-controlled)
        if ($settings->include_ticket_subject ?? true) {
            $ticketContext .= "Subject: {$ticket->subject}\n";
            $dataIncluded[] = 'ticket_subject';
        } else {
            $ticketContext .= "Subject: [REDACTED]\n";
        }

        // Customer name (privacy-controlled)
        if ($ticket->contact) {
            if ($settings->include_customer_name ?? true) {
                $ticketContext .= "Customer: {$ticket->contact->display_name}\n";
                $dataIncluded[] = 'customer_name';
            } else {
                $ticketContext .= "Customer: [Customer]\n";
            }
        }

        // Department (privacy-controlled)
        if ($ticket->department && ($settings->include_department_name ?? true)) {
            $ticketContext .= "Department: {$ticket->department->name}\n";
            $dataIncluded[] = 'department_name';
        }

        // Message history (privacy-controlled)
        if ($settings->include_message_history ?? true) {
            $ticketContext .= "\n## Conversation History\n";
            $dataIncluded[] = 'message_history';

            $limit = $settings->message_history_limit ?? 10;
            $ticketMessages = $ticket->messages()
                ->with(['user', 'contact'])
                ->orderBy('created_at')
                ->limit($limit)
                ->get();

            $includeAgentName = $settings->include_agent_name ?? true;
            $includeCustomerName = $settings->include_customer_name ?? true;

            if ($includeAgentName) {
                $dataIncluded[] = 'agent_name';
            }

            foreach ($ticketMessages as $message) {
                if ($message->is_from_contact) {
                    $author = $includeCustomerName
                        ? ($message->contact?->display_name ?? 'Customer')
                        : '[Customer]';
                } else {
                    $author = $includeAgentName
                        ? ($message->user?->name ?? 'Agent')
                        : '[Agent]';
                }

                $body = strip_tags($message->body ?? $message->body_html ?? '');
                $body = mb_substr($body, 0, 1000); // Limit message length

                $ticketContext .= "\n**{$author}:**\n{$body}\n";
            }
        }

        $messages[] = ['role' => 'user', 'content' => $ticketContext];

        return $messages;
    }

    /**
     * Build the suggest replies prompt.
     */
    protected function buildSuggestPrompt(Ticket $ticket, int $count, OrganizationAISettings $settings): string
    {
        $language = $this->getLanguageName($settings->default_language);

        $prompt = "Based on the conversation above, generate {$count} different professional reply suggestions that an agent could send to the customer.\n\n";
        $prompt .= "Requirements:\n";
        $prompt .= "- Each reply should be a complete, ready-to-send message\n";
        $prompt .= "- Vary the tone: one can be more formal, one more friendly, etc.\n";
        $prompt .= "- Address the customer's concerns directly\n";
        $prompt .= "- Keep replies concise but helpful\n";
        $prompt .= "- Write in {$language}\n\n";
        $prompt .= "Format your response as a numbered list:\n";
        $prompt .= "1. [First reply]\n";
        $prompt .= "2. [Second reply]\n";

        if ($count > 2) {
            $prompt .= "3. [Third reply]\n";
        }

        return $prompt;
    }

    /**
     * Build the refactor prompt.
     */
    protected function buildRefactorPrompt(string $text, ?string $instructions, OrganizationAISettings $settings): string
    {
        $language = $this->getLanguageName($settings->default_language);

        $prompt = "Improve the following customer support reply while maintaining its meaning and intent.\n\n";
        $prompt .= "Original text:\n{$text}\n\n";
        $prompt .= "Requirements:\n";
        $prompt .= "- Make it more professional and clear\n";
        $prompt .= "- Fix any grammar or spelling issues\n";
        $prompt .= "- Keep the same language ({$language})\n";

        if ($instructions) {
            $prompt .= "- Additional instructions: {$instructions}\n";
        }

        $prompt .= "\nRespond with only the improved text, no explanations.";

        return $prompt;
    }

    /**
     * Parse suggestions from AI response.
     *
     * @return array<string>
     */
    protected function parseSuggestions(string $content, int $expectedCount): array
    {
        $suggestions = [];
        $lines = explode("\n", $content);
        $currentSuggestion = '';

        foreach ($lines as $line) {
            // Check if this is a new numbered item
            if (preg_match('/^\d+\.\s*(.*)/', $line, $matches)) {
                // Save previous suggestion if exists
                if (trim($currentSuggestion)) {
                    $suggestions[] = trim($currentSuggestion);
                }
                $currentSuggestion = $matches[1];
            } else {
                // Continue building current suggestion
                $currentSuggestion .= "\n".$line;
            }
        }

        // Don't forget the last suggestion
        if (trim($currentSuggestion)) {
            $suggestions[] = trim($currentSuggestion);
        }

        // Return up to expected count
        return array_slice($suggestions, 0, $expectedCount);
    }

    /**
     * Get language name from ISO code.
     */
    protected function getLanguageName(string $code): string
    {
        $languages = [
            'en' => 'English',
            'nl' => 'Dutch',
            'de' => 'German',
            'fr' => 'French',
            'es' => 'Spanish',
            'it' => 'Italian',
            'pt' => 'Portuguese',
            'pl' => 'Polish',
            'ru' => 'Russian',
            'ja' => 'Japanese',
            'zh' => 'Chinese',
            'ko' => 'Korean',
        ];

        return $languages[$code] ?? 'English';
    }
}
