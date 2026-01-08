<?php

namespace App\Services\Email;

use App\Models\EmailChannel;
use App\Models\Message;
use App\Models\Ticket;
use Illuminate\Support\Facades\Log;

/**
 * Email threading service.
 *
 * Handles all email threading logic including:
 * - Generating Message-ID, In-Reply-To, and References headers
 * - Finding existing tickets by email headers
 * - Building reference chains for proper threading
 */
class EmailThreadingService
{
    /**
     * Generate all threading headers for an outgoing email.
     *
     * @return array{
     *     message_id: string,
     *     in_reply_to: string|null,
     *     references: string,
     *     ticket_number: string,
     *     subject: string
     * }
     */
    public function generateHeaders(Ticket $ticket, Message $message, EmailChannel $channel): array
    {
        // Generate unique Message-ID using the channel's email domain
        $messageId = $this->generateMessageId($ticket, $message, $channel);

        // Get the original message to reply to
        $originalMessage = $this->getOriginalMessage($ticket);

        // Build the references chain
        $references = $this->buildReferenceChain($ticket);

        // Determine the subject line
        $subject = $this->generateSubject($ticket, $originalMessage);

        return [
            'message_id' => $messageId,
            'in_reply_to' => $originalMessage?->email_message_id,
            'references' => $references,
            'ticket_number' => $ticket->ticket_number,
            'subject' => $subject,
        ];
    }

    /**
     * Generate a unique Message-ID for an outgoing email.
     *
     * Format: ticket-{ticket_id}-msg-{message_id}@{domain}
     */
    public function generateMessageId(Ticket $ticket, Message $message, EmailChannel $channel): string
    {
        $domain = $channel->domain;

        return "ticket-{$ticket->id}-msg-{$message->id}@{$domain}";
    }

    /**
     * Build the References header chain for proper threading.
     *
     * Returns a space-separated list of Message-IDs in angle brackets.
     */
    public function buildReferenceChain(Ticket $ticket): string
    {
        $messageIds = $ticket->messages()
            ->whereNotNull('email_message_id')
            ->reorder()
            ->oldest()
            ->pluck('email_message_id')
            ->unique()
            ->filter()
            ->map(fn ($id) => $this->formatMessageId($id))
            ->all();

        return implode(' ', $messageIds);
    }

    /**
     * Generate threading headers for notifications (no Message model required).
     *
     * Used by TicketEmailChannel to ensure notification emails thread properly.
     *
     * @return array{
     *     message_id: string,
     *     in_reply_to: string|null,
     *     references: string,
     *     ticket_number: string,
     *     thread_topic: string,
     *     thread_index: string
     * }
     */
    public function generateNotificationHeaders(Ticket $ticket, EmailChannel $channel): array
    {
        $latestMessage = $this->getLatestEmailMessage($ticket);
        $references = $this->buildReferenceChain($ticket);

        return [
            'message_id' => $this->generateNotificationMessageId($ticket, $channel),
            'in_reply_to' => $latestMessage?->email_message_id,
            'references' => $references,
            'ticket_number' => $ticket->ticket_number,
            // Outlook-specific threading headers
            'thread_topic' => $this->generateThreadTopic($ticket),
            'thread_index' => $this->getOrExtendThreadIndex($ticket),
        ];
    }

    /**
     * Generate Thread-Topic header for Outlook threading.
     *
     * This is the original subject stripped of Re:/Fwd: prefixes.
     * Must be consistent across all emails in the thread.
     */
    public function generateThreadTopic(Ticket $ticket): string
    {
        return $this->extractBaseSubject($ticket->subject);
    }

    /**
     * Get the Thread-Index for outgoing emails.
     *
     * For Outlook threading, we use the EXACT same Thread-Index as the customer's
     * original email. According to Outlook's threading logic, emails with matching
     * first 22 bytes (176 bits) belong to the same thread.
     *
     * We don't extend the Thread-Index because:
     * 1. The extension format is complex (requires proper time delta calculation)
     * 2. Using the exact same value guarantees the first 22 bytes match
     * 3. Outlook threads on the header portion, not the child blocks
     */
    public function getOrExtendThreadIndex(Ticket $ticket): string
    {
        // If we have the customer's original Thread-Index, use it EXACTLY
        // Don't extend - Outlook threads on matching first 22 bytes
        if (! empty($ticket->email_thread_index)) {
            Log::debug('Outlook threading: using original Thread-Index exactly', [
                'ticket_id' => $ticket->id,
                'thread_index' => $ticket->email_thread_index,
            ]);

            return $ticket->email_thread_index;
        }

        // No original Thread-Index available, generate a new one
        Log::debug('Outlook threading: generating new Thread-Index (no original)', [
            'ticket_id' => $ticket->id,
        ]);

        return $this->generateThreadIndex($ticket);
    }

    /**
     * Extend an existing Thread-Index by adding a 5-byte child block.
     *
     * According to Microsoft specs, each reply adds a 5-byte timestamp
     * delta to the original Thread-Index.
     */
    private function extendThreadIndex(string $originalThreadIndex): string
    {
        // Decode the original Thread-Index
        $originalBinary = base64_decode($originalThreadIndex);

        // Generate a 5-byte child block (timestamp delta)
        // Format: 4-byte timestamp difference + 1-byte random for uniqueness
        $time = time();
        $childTimestamp = pack('N', $time); // 4 bytes, big-endian
        $randomByte = chr(random_int(0, 255)); // 1 byte for uniqueness

        // Append the child block to the original
        $extended = $originalBinary.$childTimestamp.$randomByte;

        return base64_encode($extended);
    }

    /**
     * Generate Thread-Index header for Outlook threading.
     *
     * Format: Base64-encoded binary string containing:
     * - 6 bytes: FILETIME timestamp (first 6 significant bytes)
     * - 16 bytes: GUID (must be consistent for all emails in the thread)
     *
     * The GUID is derived from the ticket ID to ensure all notifications
     * for the same ticket share the same thread.
     */
    public function generateThreadIndex(Ticket $ticket): string
    {
        // Convert current time to FILETIME format (100-nanosecond intervals since 1601)
        $time = time();
        $filetime = ($time * 10000000) + 116444736000000000;

        // Convert to hex and pad to 16 characters (8 bytes)
        $ftHex = str_pad(base_convert((string) $filetime, 10, 16), 16, '0', STR_PAD_LEFT);

        // Generate a consistent GUID based on ticket ID
        // This ensures all emails for the same ticket share the same thread
        $guid = md5('ticket-thread-'.$ticket->id);

        // Combine first 6 bytes (12 hex chars) of timestamp with GUID
        $threadHex = substr($ftHex, 0, 12).$guid;

        // Convert to binary and base64 encode
        return base64_encode(hex2bin($threadHex));
    }

    /**
     * Generate a unique Message-ID for notification emails.
     *
     * Format: ticket-{ticket_id}-notif-{timestamp}@{domain}
     */
    public function generateNotificationMessageId(Ticket $ticket, EmailChannel $channel): string
    {
        $domain = $channel->domain;

        return "ticket-{$ticket->id}-notif-".time()."@{$domain}";
    }

    /**
     * Find an existing ticket by email headers.
     *
     * Searches in this order (highest to lowest reliability):
     * 1. X-Ticket-ID custom header (most reliable - our own header)
     * 2. Conversation ID / Thread ID (Microsoft 365 thread tracking)
     * 3. In-Reply-To header
     * 4. References header
     * 5. Subject line ticket number pattern [TKT-XXXXXXXX]
     *
     * Subject matching is used as a safe fallback because Microsoft 365/Graph API
     * doesn't allow setting custom Message-ID headers, so In-Reply-To matching
     * often fails when using Office 365 email channels.
     */
    public function findTicketByHeaders(array $headers, int $organizationId): ?Ticket
    {
        // 1. Check X-Ticket-ID header (our custom header - MOST RELIABLE)
        $ticketId = $headers['ticket_id'] ?? $headers['ticket_reference'] ?? null;
        if (! empty($ticketId)) {
            $ticket = Ticket::where('organization_id', $organizationId)
                ->where('ticket_number', $ticketId)
                ->first();

            if ($ticket) {
                Log::debug('Thread match: X-Ticket-ID', ['ticket' => $ticket->id]);

                return $ticket;
            }
        }

        // 2. Check conversation_id/thread_id (Microsoft 365 / Gmail thread tracking)
        if (! empty($headers['conversation_id'])) {
            $ticket = Ticket::where('organization_id', $organizationId)
                ->where('email_thread_id', $headers['conversation_id'])
                ->first();

            if ($ticket) {
                Log::debug('Thread match: thread_id', ['ticket' => $ticket->id, 'thread_id' => $headers['conversation_id']]);

                return $ticket;
            }
        }

        // 3. Check In-Reply-To header
        if (! empty($headers['in_reply_to'])) {
            $inReplyTo = $this->cleanMessageId($headers['in_reply_to']);
            $ticket = $this->findTicketByMessageId($inReplyTo, $organizationId);

            if ($ticket) {
                Log::debug('Thread match: In-Reply-To', ['ticket' => $ticket->id, 'in_reply_to' => $inReplyTo]);

                return $ticket;
            }
        }

        // 4. Check References header
        if (! empty($headers['references'])) {
            foreach ($headers['references'] as $reference) {
                $reference = $this->cleanMessageId($reference);
                $ticket = $this->findTicketByMessageId($reference, $organizationId);

                if ($ticket) {
                    Log::debug('Thread match: References', ['ticket' => $ticket->id, 'ref' => $reference]);

                    return $ticket;
                }
            }
        }

        // 5. Check subject line for ticket number pattern [TKT-XXXXXXXX]
        // This is a safe fallback because it only matches our specific ticket number format
        // which is unique per organization. This is necessary because Microsoft 365/Graph API
        // doesn't allow setting custom Message-ID headers, so In-Reply-To matching fails.
        if (! empty($headers['subject'])) {
            $ticket = $this->findTicketBySubject($headers['subject'], $organizationId);

            if ($ticket) {
                Log::debug('Thread match: Subject', ['ticket' => $ticket->id, 'subject' => $headers['subject']]);

                return $ticket;
            }
        }

        return null;
    }

    /**
     * Find a ticket by email Message-ID.
     */
    public function findTicketByMessageId(string $messageId, int $organizationId): ?Ticket
    {
        return Ticket::where('organization_id', $organizationId)
            ->whereHas('messages', function ($query) use ($messageId) {
                $query->where('email_message_id', $messageId);
            })
            ->first();
    }

    /**
     * Find a ticket by subject line containing a ticket number.
     *
     * Looks for patterns like [TKT-26G9GFQX] or TKT-26G9GFQX in the subject.
     * Supports alphanumeric ticket numbers (not just digits).
     */
    public function findTicketBySubject(string $subject, int $organizationId): ?Ticket
    {
        // Match ticket number patterns: [PREFIX-ALPHANUMERIC] or PREFIX-ALPHANUMERIC
        // Examples: [TKT-26G9GFQX], TKT-001234, TICKET-ABC123
        if (preg_match('/\[?([A-Z]{2,10}[-_][A-Z0-9]{4,12})\]?/i', $subject, $matches)) {
            $ticketNumber = strtoupper($matches[1]);

            return Ticket::where('organization_id', $organizationId)
                ->where('ticket_number', $ticketNumber)
                ->first();
        }

        return null;
    }

    /**
     * Generate the subject line for a reply.
     *
     * Ensures "Re: " prefix and includes ticket number in brackets.
     */
    public function generateSubject(Ticket $ticket, ?Message $originalMessage): string
    {
        // Get the base subject from the original message or ticket subject
        $baseSubject = $originalMessage
            ? $this->extractBaseSubject($originalMessage->ticket->subject ?? $ticket->subject)
            : $ticket->subject;

        // Ensure ticket number is in subject for fallback matching
        $ticketRef = "[{$ticket->ticket_number}]";

        if (! str_contains($baseSubject, $ticket->ticket_number)) {
            $baseSubject = "{$ticketRef} {$baseSubject}";
        }

        // Add Re: prefix if not already present
        if (! preg_match('/^Re:\s*/i', $baseSubject)) {
            $baseSubject = "Re: {$baseSubject}";
        }

        return $baseSubject;
    }

    /**
     * Get the original message from a ticket (the first one with email_message_id).
     */
    private function getOriginalMessage(Ticket $ticket): ?Message
    {
        return $ticket->messages()
            ->whereNotNull('email_message_id')
            ->reorder()
            ->oldest()
            ->first();
    }

    /**
     * Get the most recent message with email_message_id for In-Reply-To.
     */
    public function getLatestEmailMessage(Ticket $ticket): ?Message
    {
        // Use reorder() to clear the default ASC ordering from the relationship
        // before applying latest() (DESC), otherwise ASC takes precedence
        return $ticket->messages()
            ->whereNotNull('email_message_id')
            ->reorder()
            ->latest()
            ->first();
    }

    /**
     * Format a Message-ID with angle brackets if not present.
     */
    private function formatMessageId(string $messageId): string
    {
        $messageId = $this->cleanMessageId($messageId);

        return "<{$messageId}>";
    }

    /**
     * Clean a Message-ID by removing angle brackets and whitespace.
     */
    private function cleanMessageId(string $messageId): string
    {
        return trim($messageId, '<> ');
    }

    /**
     * Extract the base subject by removing Re:/Fwd: prefixes.
     */
    private function extractBaseSubject(string $subject): string
    {
        // Remove multiple Re:/Fwd: prefixes and normalize
        return preg_replace('/^(Re:\s*|Fwd:\s*)+/i', '', $subject);
    }
}
