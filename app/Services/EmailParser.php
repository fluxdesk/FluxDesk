<?php

namespace App\Services;

use App\Enums\MessageType;
use App\Enums\RecipientType;
use App\Enums\TicketChannel;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\EmailChannel;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\Priority;
use App\Models\Status;
use App\Models\Ticket;
use App\Services\Email\EmailThreadingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Email Parser Service.
 *
 * Handles parsing incoming emails and creating/updating tickets:
 * - Creates tickets from new emails
 * - Threads replies to existing tickets using Message-ID references
 * - Extracts and cleans email body content
 * - Detects urgent emails and sets priority
 * - Sanitizes HTML content for safe display
 */
class EmailParser
{
    public function __construct(
        private EmailThreadingService $threadingService,
        private OrganizationContext $organizationContext,
        private HtmlSanitizer $htmlSanitizer,
    ) {}

    /**
     * Parse an incoming email and create/update ticket.
     *
     * @param  array{
     *     id: string,
     *     internet_message_id: string,
     *     conversation_id: string|null,
     *     thread_id: string|null,
     *     from_email: string,
     *     from_name: string|null,
     *     subject: string,
     *     body_text: string|null,
     *     body_html: string|null,
     *     received_at: \Carbon\Carbon,
     *     in_reply_to: string|null,
     *     references: array<string>,
     *     importance: string|null,
     *     headers: array<string, string>,
     *     attachments: array<int, array{name: string, content_type: string, size: int, content: string}>
     * }  $emailData  Normalized email data from provider
     * @param  EmailChannel  $channel  The email channel that received the email
     * @return Ticket The created or updated ticket
     */
    public function parse(array $emailData, EmailChannel $channel): Ticket
    {
        return DB::transaction(function () use ($emailData, $channel) {
            $organizationId = $channel->organization_id;

            // Check if message already exists (prevent duplicates)
            if ($this->messageExists($emailData['internet_message_id'], $organizationId)) {
                return $this->findTicketByMessageId($emailData['internet_message_id'], $organizationId);
            }

            // Find or create the contact
            $contact = $this->findOrCreateContact(
                $emailData['from_email'],
                $emailData['from_name'],
                $organizationId
            );

            // Build headers array for threading search
            $headers = [
                'conversation_id' => $emailData['conversation_id'] ?? $emailData['thread_id'] ?? null,
                'in_reply_to' => $emailData['in_reply_to'],
                'references' => $emailData['references'],
                'subject' => $emailData['subject'],
                'ticket_id' => $this->extractTicketId($emailData['headers']),
            ];

            // Try to find existing ticket
            $ticket = $this->threadingService->findTicketByHeaders($headers, $organizationId);

            // Log threading decision
            Log::debug('Email threading', [
                'found_ticket' => $ticket?->id,
                'thread_id' => $headers['conversation_id'],
                'in_reply_to' => $headers['in_reply_to'],
                'refs' => count($headers['references'] ?? []),
            ]);

            if ($ticket) {
                // Add reply to existing ticket
                $message = $this->addReplyToTicket($ticket, $emailData, $contact);

                // Re-open ticket if it was closed
                $this->reopenTicketIfClosed($ticket);
            } else {
                // Create new ticket
                $ticket = $this->createTicket($emailData, $channel, $contact);
            }

            // Update thread ID if provided (provider-specific)
            $this->updateThreadId($ticket, $emailData);

            return $ticket;
        });
    }

    /**
     * Check if a message with this Message-ID already exists.
     */
    private function messageExists(string $messageId, int $organizationId): bool
    {
        return Message::whereHas('ticket', function ($query) use ($organizationId) {
            $query->where('organization_id', $organizationId);
        })
            ->where('email_message_id', $messageId)
            ->exists();
    }

    /**
     * Find a ticket by Message-ID.
     */
    private function findTicketByMessageId(string $messageId, int $organizationId): ?Ticket
    {
        return Ticket::where('organization_id', $organizationId)
            ->whereHas('messages', function ($query) use ($messageId) {
                $query->where('email_message_id', $messageId);
            })
            ->first();
    }

    /**
     * Create a new ticket from an email.
     */
    private function createTicket(array $emailData, EmailChannel $channel, Contact $contact): Ticket
    {
        $organizationId = $channel->organization_id;

        // Get default status
        $defaultStatus = Status::where('organization_id', $organizationId)
            ->where('is_default', true)
            ->first();

        // Determine priority (check for urgent)
        $priority = $this->parseImportance($emailData, $organizationId);

        if (! $priority) {
            $priority = Priority::where('organization_id', $organizationId)
                ->where('is_default', true)
                ->first();
        }

        // Create ticket
        $threadId = $emailData['conversation_id'] ?? $emailData['thread_id'];
        $threadIndex = $emailData['thread_index'] ?? null;

        Log::debug('Creating ticket with thread_id', [
            'thread_id' => $threadId,
            'thread_index' => $threadIndex ? 'present' : null,
            'original_msg_id' => $emailData['id'] ?? null,
        ]);

        $ticket = Ticket::create([
            'organization_id' => $organizationId,
            'subject' => $this->cleanSubject($emailData['subject']),
            'contact_id' => $contact->id,
            'status_id' => $defaultStatus?->id,
            'priority_id' => $priority?->id,
            'department_id' => $channel->department_id,
            'channel' => TicketChannel::Email,
            'email_channel_id' => $channel->id,
            'email_thread_id' => $threadId,
            'email_thread_index' => $threadIndex, // Outlook threading
            'email_original_message_id' => $emailData['id'] ?? null,
        ]);

        // Create the initial message
        $this->createMessage($ticket, $emailData, $contact);

        return $ticket;
    }

    /**
     * Add a reply message to an existing ticket.
     */
    private function addReplyToTicket(Ticket $ticket, array $emailData, Contact $contact): Message
    {
        return $this->createMessage($ticket, $emailData, $contact);
    }

    /**
     * Create a message from email data.
     */
    private function createMessage(Ticket $ticket, array $emailData, Contact $contact): Message
    {
        $body = $this->extractBody($emailData);
        $rawHtml = $emailData['body_html'];

        // Prepare attachments (save files to storage, get metadata for later)
        $attachmentData = $this->prepareAttachments($emailData['attachments'] ?? [], $ticket);

        // Create message first
        $message = Message::create([
            'ticket_id' => $ticket->id,
            'contact_id' => $contact->id,
            'type' => MessageType::Reply,
            'body' => $body,
            'body_html' => null, // Will be updated after attachments are created
            'raw_content' => $rawHtml,
            'is_from_contact' => true,
            'email_message_id' => $emailData['internet_message_id'],
            'email_provider_id' => $emailData['id'] ?? null,
            'email_in_reply_to' => $emailData['in_reply_to'],
            'email_references' => implode(' ', $emailData['references']),
        ]);

        // Now create attachments with the message_id
        $attachmentMap = $this->createAttachments($attachmentData, $message);

        // Process HTML: replace CID references, strip quoted content, then sanitize
        $processedHtml = $rawHtml ? $this->replaceCidReferences($rawHtml, $attachmentMap) : null;
        $cleanedHtml = $processedHtml ? $this->stripQuotedHtml($processedHtml) : null;
        $sanitizedHtml = $cleanedHtml ? $this->htmlSanitizer->sanitize($cleanedHtml) : null;

        // Update message with sanitized HTML
        if ($sanitizedHtml) {
            $message->update(['body_html' => $sanitizedHtml]);
        }

        // Save recipients
        $this->saveRecipients($message, $emailData, $ticket->organization_id);

        return $message;
    }

    /**
     * Prepare attachments by saving files to storage and returning metadata.
     *
     * @return array<int, array{filename: string, original_filename: string, mime_type: string, size: int, path: string, content_id: string|null, is_inline: bool}>
     */
    private function prepareAttachments(array $attachments, Ticket $ticket): array
    {
        $prepared = [];

        foreach ($attachments as $attachmentData) {
            if (empty($attachmentData['content'])) {
                continue;
            }

            $filename = Str::uuid().'_'.$attachmentData['name'];
            $path = "attachments/{$ticket->organization_id}/{$ticket->id}/{$filename}";

            // Decode base64 content and store
            $content = base64_decode($attachmentData['content']);
            Storage::put($path, $content);

            $prepared[] = [
                'filename' => $filename,
                'original_filename' => $attachmentData['name'],
                'mime_type' => $attachmentData['content_type'],
                'size' => $attachmentData['size'],
                'path' => $path,
                'content_id' => $attachmentData['content_id'] ?? null,
                'is_inline' => $attachmentData['is_inline'] ?? false,
            ];
        }

        return $prepared;
    }

    /**
     * Create attachment records in the database.
     *
     * @param  array<int, array{filename: string, original_filename: string, mime_type: string, size: int, path: string, content_id: string|null, is_inline: bool}>  $attachmentData
     * @return array<string, Attachment>
     */
    private function createAttachments(array $attachmentData, Message $message): array
    {
        $map = [];

        foreach ($attachmentData as $data) {
            $attachment = Attachment::create([
                'message_id' => $message->id,
                'filename' => $data['filename'],
                'original_filename' => $data['original_filename'],
                'mime_type' => $data['mime_type'],
                'size' => $data['size'],
                'path' => $data['path'],
                'content_id' => $data['content_id'],
                'is_inline' => $data['is_inline'],
            ]);

            // Map by content_id for CID replacement
            if (! empty($data['content_id'])) {
                $map[$data['content_id']] = $attachment;
            } else {
                $map[$attachment->id] = $attachment;
            }
        }

        return $map;
    }

    /**
     * Replace CID references in HTML with attachment URLs.
     */
    private function replaceCidReferences(string $html, array $attachmentMap): string
    {
        foreach ($attachmentMap as $contentId => $attachment) {
            if (! is_string($contentId) || empty($contentId)) {
                continue;
            }

            // Replace cid:content_id with the attachment URL
            $html = str_replace(
                "cid:{$contentId}",
                Storage::url($attachment->path),
                $html
            );
        }

        return $html;
    }

    /**
     * Save message recipients (to, cc, bcc).
     */
    private function saveRecipients(Message $message, array $emailData, int $organizationId): void
    {
        $recipientTypes = [
            'to_recipients' => RecipientType::To,
            'cc_recipients' => RecipientType::Cc,
            'bcc_recipients' => RecipientType::Bcc,
        ];

        foreach ($recipientTypes as $key => $type) {
            foreach ($emailData[$key] ?? [] as $recipient) {
                if (empty($recipient['email'])) {
                    continue;
                }

                // Try to find existing contact
                $contact = Contact::where('organization_id', $organizationId)
                    ->where('email', strtolower($recipient['email']))
                    ->first();

                MessageRecipient::create([
                    'message_id' => $message->id,
                    'type' => $type,
                    'email' => strtolower($recipient['email']),
                    'name' => $recipient['name'],
                    'contact_id' => $contact?->id,
                ]);
            }
        }
    }

    /**
     * Re-open a ticket if it was closed.
     */
    private function reopenTicketIfClosed(Ticket $ticket): void
    {
        if ($ticket->isClosed()) {
            $defaultStatus = Status::where('organization_id', $ticket->organization_id)
                ->where('is_default', true)
                ->first();

            if ($defaultStatus) {
                $ticket->update([
                    'status_id' => $defaultStatus->id,
                    'closed_at' => null,
                    'resolved_at' => null,
                ]);
            }
        }
    }

    /**
     * Update the thread ID and thread index on the ticket if not set.
     */
    private function updateThreadId(Ticket $ticket, array $emailData): void
    {
        $threadId = $emailData['conversation_id'] ?? $emailData['thread_id'];
        $threadIndex = $emailData['thread_index'] ?? null;

        $updates = [];

        if ($threadId && ! $ticket->email_thread_id) {
            $updates['email_thread_id'] = $threadId;
        }

        // Store Thread-Index from Outlook emails for proper threading
        if ($threadIndex && ! $ticket->email_thread_index) {
            $updates['email_thread_index'] = $threadIndex;
        }

        if (! empty($updates)) {
            $ticket->update($updates);
        }
    }

    /**
     * Find an existing ticket by email thread headers.
     *
     * @deprecated Use EmailThreadingService::findTicketByHeaders instead
     */
    public function findTicketByEmailThread(array $emailData, int $organizationId): ?Ticket
    {
        $inReplyTo = $emailData['in_reply_to'] ?? null;
        $references = $emailData['references'] ?? [];

        if (! $inReplyTo && empty($references)) {
            return null;
        }

        // Search for tickets where any message has a matching email_message_id
        $messageIds = array_filter(array_merge([$inReplyTo], $references));

        return Ticket::where('organization_id', $organizationId)
            ->whereHas('messages', function ($query) use ($messageIds) {
                $query->whereIn('email_message_id', $messageIds);
            })
            ->first();
    }

    /**
     * Find or create a contact from email sender information.
     */
    public function findOrCreateContact(string $email, ?string $name, int $organizationId): Contact
    {
        return Contact::firstOrCreate(
            [
                'organization_id' => $organizationId,
                'email' => strtolower($email),
            ],
            [
                'name' => $name ?? $this->extractNameFromEmail($email),
            ]
        );
    }

    /**
     * Extract plain text body from email.
     *
     * Handles HTML to text conversion and removes quoted replies.
     */
    public function extractBody(array $emailData): string
    {
        // Prefer plain text body if available
        if (! empty($emailData['body_text'])) {
            return $this->cleanQuotedContent($emailData['body_text']);
        }

        // Convert HTML to plain text
        if (! empty($emailData['body_html'])) {
            $text = $this->htmlToPlainText($emailData['body_html']);

            return $this->cleanQuotedContent($text);
        }

        return '';
    }

    /**
     * Generate email threading headers for outgoing messages.
     *
     * @return array{In-Reply-To?: string, References?: string}
     */
    public function generateThreadHeaders(Ticket $ticket): array
    {
        $originalMessage = $ticket->messages()
            ->whereNotNull('email_message_id')
            ->oldest()
            ->first();

        if (! $originalMessage) {
            return [];
        }

        $references = collect($ticket->messages()
            ->whereNotNull('email_message_id')
            ->pluck('email_message_id'))
            ->unique()
            ->implode(' ');

        return [
            'In-Reply-To' => $originalMessage->email_message_id,
            'References' => $references,
        ];
    }

    /**
     * Detect urgent emails and return appropriate priority.
     *
     * Checks for:
     * - Microsoft: importance = 'high'
     * - Gmail: X-Priority = 1 or Importance = high headers
     * - Subject keywords: URGENT, DRINGEND, ASAP
     */
    public function parseImportance(array $emailData, int $organizationId): ?Priority
    {
        $isUrgent = false;

        // Check provider importance flag
        if (! empty($emailData['importance']) && strtolower($emailData['importance']) === 'high') {
            $isUrgent = true;
        }

        // Check headers
        $headers = $emailData['headers'] ?? [];
        if (! empty($headers['X-Priority']) && in_array($headers['X-Priority'], ['1', '2'])) {
            $isUrgent = true;
        }
        if (! empty($headers['Importance']) && strtolower($headers['Importance']) === 'high') {
            $isUrgent = true;
        }

        // Check subject for urgent keywords
        $subject = strtoupper($emailData['subject'] ?? '');
        $urgentKeywords = ['URGENT', 'DRINGEND', 'ASAP', 'CRITICAL', 'EMERGENCY', 'SPOED'];

        foreach ($urgentKeywords as $keyword) {
            if (str_contains($subject, $keyword)) {
                $isUrgent = true;
                break;
            }
        }

        if (! $isUrgent) {
            return null;
        }

        // Find urgent/high priority
        $urgentPriority = Priority::where('organization_id', $organizationId)
            ->whereIn('slug', ['urgent', 'high', 'hoog', 'kritiek'])
            ->first();

        if ($urgentPriority) {
            return $urgentPriority;
        }

        // Fall back to highest priority by sort order
        return Priority::where('organization_id', $organizationId)
            ->orderBy('sort_order')
            ->first();
    }

    /**
     * Extract ticket ID from X-Ticket-ID or X-Ticket-Reference header.
     */
    public function extractTicketId(array $headers): ?string
    {
        return $headers['X-Ticket-ID'] ?? $headers['X-Ticket-Reference'] ?? null;
    }

    /**
     * Generate a unique Message-ID for an outgoing email.
     *
     * @deprecated Use EmailThreadingService::generateMessageId instead
     */
    public function generateMessageId(Message $message, Ticket $ticket): string
    {
        $domain = 'fluxdesk.app';
        if ($ticket->emailChannel) {
            $domain = $ticket->emailChannel->domain;
        }

        return "ticket-{$ticket->id}-msg-{$message->id}@{$domain}";
    }

    /**
     * Convert HTML to plain text.
     */
    private function htmlToPlainText(string $html): string
    {
        // First, strip quoted HTML content before converting
        $html = $this->stripQuotedHtml($html);

        // Remove style and script tags
        $text = preg_replace('/<(style|script)[^>]*>.*?<\/\1>/si', '', $html);

        // Convert line breaks
        $text = preg_replace('/<br\s*\/?>/i', "\n", $text);
        $text = preg_replace('/<\/(p|div|h[1-6]|li|tr)>/i', "\n", $text);

        // Remove remaining HTML tags
        $text = strip_tags($text);

        // Decode HTML entities
        $text = html_entity_decode($text, ENT_QUOTES, 'UTF-8');

        // Normalize whitespace
        $text = preg_replace('/[ \t]+/', ' ', $text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);

        return trim($text);
    }

    /**
     * Strip quoted content from HTML emails.
     *
     * Removes common quote patterns from various email clients:
     * - Outlook Desktop: <div id="divRplyFwdMsg">, <div id="appendonsend">
     * - Outlook Mobile: <div id="mail-editor-reference-message-container">
     * - Gmail: <div class="gmail_quote">
     * - Generic: <blockquote>
     */
    private function stripQuotedHtml(string $html): string
    {
        // Remove Outlook Mobile reference message container (contains all quoted content)
        $html = preg_replace('/<div[^>]*id=["\']?mail-editor-reference-message-container["\']?[^>]*>.*$/si', '', $html);

        // Remove Outlook Desktop reply/forward divs
        $html = preg_replace('/<div[^>]*id=["\']?(divRplyFwdMsg|appendonsend)["\']?[^>]*>.*$/si', '', $html);

        // Remove Gmail quote divs
        $html = preg_replace('/<div[^>]*class=["\'][^"\']*gmail_quote[^"\']*["\'][^>]*>.*$/si', '', $html);

        // Remove elements with Outlook mobile reference message class
        $html = preg_replace('/<[^>]*class=["\'][^"\']*ms-outlook-mobile-reference-message[^"\']*["\'][^>]*>.*$/si', '', $html);

        // Remove blockquotes (common in many clients)
        $html = preg_replace('/<blockquote[^>]*>.*?<\/blockquote>/si', '', $html);

        // Remove Outlook-style separator followed by original message
        $html = preg_replace('/<hr[^>]*>.*$/si', '', $html);

        // Remove divs that contain "Original Message" or "Oorspronkelijk bericht"
        $html = preg_replace('/<div[^>]*>[-\s]*(Original Message|Oorspronkelijk bericht|Forwarded message).*$/si', '', $html);

        return $html;
    }

    /**
     * Remove quoted reply content from email body.
     *
     * Handles various email client formats:
     * - Outlook: "From: ... Sent: ... To: ... Subject: ..."
     * - Gmail: "On [date] [person] wrote:"
     * - Standard: Lines starting with >
     * - Dutch: "Van: ... Verzonden: ..."
     */
    private function cleanQuotedContent(string $text): string
    {
        $lines = explode("\n", $text);
        $cleanLines = [];
        $foundQuoteStart = false;

        foreach ($lines as $index => $line) {
            $trimmedLine = trim($line);

            // Skip empty lines at the start
            if (empty($trimmedLine) && empty($cleanLines)) {
                continue;
            }

            // Skip quoted lines (starting with >)
            if (preg_match('/^>/', $trimmedLine)) {
                continue;
            }

            // Stop at common reply/forward indicators
            // Outlook format: "From: Name <email>" or "Van: Name <email>"
            if (preg_match('/^(From|Van|De|Von):\s*.+(<.+@.+>|@)/i', $trimmedLine)) {
                break;
            }

            // Gmail format: "On [date] [name] wrote:" or "Op [date] schreef [name]:"
            if (preg_match('/^(On|Op)\s+.+(wrote|schreef|geschreven):/i', $trimmedLine)) {
                break;
            }

            // Outlook date header: "Date: ..." or "Datum: ..."
            if (preg_match('/^(Date|Datum|Sent|Verzonden):\s+\w+,?\s+\d+/i', $trimmedLine)) {
                // Look back to see if previous non-empty line was "From:"
                for ($i = $index - 1; $i >= 0; $i--) {
                    $prevLine = trim($lines[$i]);
                    if (! empty($prevLine)) {
                        if (preg_match('/^(From|Van):/i', $prevLine)) {
                            // Remove the From: line we already added
                            array_pop($cleanLines);
                        }
                        break;
                    }
                }
                break;
            }

            // Stop at separator lines (---, ___, ===)
            if (preg_match('/^[-_=]{3,}\s*$/', $trimmedLine)) {
                break;
            }

            // Stop at "Original Message" indicators
            if (preg_match('/^-+\s*(Original Message|Oorspronkelijk bericht|Forwarded message)/i', $trimmedLine)) {
                break;
            }

            // Stop at signature-like content followed by quote (Met vriendelijke groet before From:)
            // Check if this looks like a signature block followed by quoted content
            if (preg_match('/^(Met vriendelijke groet|Kind regards|Best regards|Regards|Groet|Mvg)/i', $trimmedLine)) {
                // Look ahead to see if there's a quote coming
                $hasQuoteAhead = false;
                for ($i = $index + 1; $i < min($index + 10, count($lines)); $i++) {
                    if (preg_match('/^(From|Van):\s*.+@/i', trim($lines[$i]))) {
                        $hasQuoteAhead = true;
                        break;
                    }
                }
                if ($hasQuoteAhead) {
                    // Include this line but stop after signature block
                    $cleanLines[] = $line;
                    // Collect remaining signature lines until quote
                    for ($i = $index + 1; $i < count($lines); $i++) {
                        $nextTrimmed = trim($lines[$i]);
                        if (preg_match('/^(From|Van):\s*.+@/i', $nextTrimmed)) {
                            break;
                        }
                        if (empty($nextTrimmed)) {
                            continue;
                        }
                        // Stop if it looks like header info
                        if (preg_match('/^(E:|T:|A:|Tel:|Email:|Phone:|Address:)/i', $nextTrimmed)) {
                            break;
                        }
                        $cleanLines[] = $lines[$i];
                    }
                    break;
                }
            }

            $cleanLines[] = $line;
        }

        // Clean up trailing empty lines
        while (! empty($cleanLines) && trim(end($cleanLines)) === '') {
            array_pop($cleanLines);
        }

        return trim(implode("\n", $cleanLines));
    }

    /**
     * Clean subject line by removing excessive Re:/Fwd: prefixes.
     */
    private function cleanSubject(string $subject): string
    {
        // Remove multiple Re:/Fwd: prefixes and normalize
        $clean = preg_replace('/^(Re:\s*|Fwd:\s*)+/i', '', $subject);

        // Trim and limit length
        return Str::limit(trim($clean), 255, '');
    }

    /**
     * Extract a display name from an email address.
     */
    private function extractNameFromEmail(string $email): string
    {
        $localPart = explode('@', $email)[0];

        // Convert dots and underscores to spaces, then title case
        $name = str_replace(['.', '_', '-'], ' ', $localPart);

        return Str::title($name);
    }
}
