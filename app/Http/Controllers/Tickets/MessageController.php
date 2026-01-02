<?php

namespace App\Http\Controllers\Tickets;

use App\Enums\MessageType;
use App\Enums\MessagingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tickets\StoreMessageRequest;
use App\Jobs\SendMessagingReplyJob;
use App\Models\Attachment;
use App\Models\Message;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;
use League\CommonMark\CommonMarkConverter;
use League\CommonMark\Extension\Strikethrough\StrikethroughExtension;

class MessageController extends Controller
{
    public function store(StoreMessageRequest $request, Ticket $ticket): RedirectResponse
    {
        $type = $request->input('type', MessageType::Reply->value);

        // Determine if this is a messaging channel reply
        $isMessagingReply = $type === MessageType::Reply->value && $ticket->isFromMessaging();

        $message = Message::create([
            'ticket_id' => $ticket->id,
            'user_id' => auth()->id(),
            'type' => $type,
            'body' => $request->body,
            'body_html' => $this->renderMarkdown($request->body),
            'is_from_contact' => false,
            'ai_assisted' => $request->boolean('ai_assisted'),
            // Set pending status for messaging replies
            'messaging_status' => $isMessagingReply ? MessagingStatus::Pending : null,
        ]);

        // Process attachments if provided
        if ($request->has('attachments')) {
            $this->processAttachments($request->validated('attachments'), $message);
        }

        // Auto-assign ticket to the first person who replies (if not already assigned)
        if ($type === MessageType::Reply->value && $ticket->assigned_to === null) {
            $ticket->update([
                'assigned_to' => auth()->id(),
            ]);
        }

        // Dispatch reply job for messaging channels only
        // Email replies are handled by NewAgentReplyNotification via MessageObserver
        if ($type === MessageType::Reply->value && $ticket->isFromMessaging()) {
            SendMessagingReplyJob::dispatch($message, $ticket);
        }

        return back()->with('success', 'Message sent successfully.');
    }

    /**
     * Create Attachment records for uploaded files.
     */
    private function processAttachments(array $attachments, Message $message): void
    {
        foreach ($attachments as $attachmentData) {
            Attachment::create([
                'message_id' => $message->id,
                'filename' => $attachmentData['filename'],
                'original_filename' => $attachmentData['original_filename'],
                'mime_type' => $attachmentData['mime_type'],
                'size' => $attachmentData['size'],
                'path' => $attachmentData['path'],
                'content_id' => $attachmentData['content_id'] ?? null,
                'is_inline' => $attachmentData['is_inline'] ?? false,
            ]);
        }
    }

    /**
     * Render markdown to HTML for display.
     */
    private function renderMarkdown(string $markdown): string
    {
        $converter = new CommonMarkConverter([
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
        ]);

        $converter->getEnvironment()->addExtension(new StrikethroughExtension);

        return $converter->convert($markdown)->getContent();
    }
}
