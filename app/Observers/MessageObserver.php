<?php

namespace App\Observers;

use App\Enums\MessageType;
use App\Jobs\SendMessageNotificationJob;
use App\Models\Message;
use App\Models\Status;
use App\Models\TicketActivity;
use App\Services\MentionService;
use App\Services\NotificationService;
use App\Services\Webhook\WebhookDispatcher;

class MessageObserver
{
    public function created(Message $message): void
    {
        $ticket = $message->ticket;

        // Track first response time for agent replies
        if ($message->isReply() && ! $message->is_from_contact && empty($ticket->first_response_at)) {
            $ticket->first_response_at = now();
            $ticket->saveQuietly();
        }

        // When any reply is added (contact or agent), move ticket back to Inbox and reopen if closed
        if ($message->isReply()) {
            $needsSave = false;

            // Move back to Inbox (clear folder)
            if ($ticket->folder_id !== null) {
                $ticket->folder_id = null;
                $needsSave = true;
            }

            // Reopen if ticket was closed
            if ($ticket->status && $ticket->status->is_closed) {
                $openStatus = Status::withoutGlobalScopes()
                    ->where('organization_id', $ticket->organization_id)
                    ->where('is_default', true)
                    ->first();

                if ($openStatus) {
                    $ticket->status_id = $openStatus->id;
                    $ticket->resolved_at = null;
                    $needsSave = true;
                }
            }

            if ($needsSave) {
                $ticket->saveQuietly();
            }
        }

        // Determine message type for activity log
        $activityType = match ($message->type) {
            MessageType::Reply => $message->is_from_contact ? 'customer_reply' : 'agent_reply',
            MessageType::Note => 'note',
            MessageType::System => 'system',
        };

        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id' => $message->user_id,
            'type' => 'message_added',
            'properties' => [
                'type' => $activityType,
                'message_id' => $message->id,
            ],
        ]);

        // Dispatch notification job (handles email import check internally)
        SendMessageNotificationJob::dispatch($message);

        // Parse mentions and notify mentioned users (only for agent messages)
        if (! $message->is_from_contact && $message->user_id) {
            $mentionService = app(MentionService::class);
            $mentionedUsers = $mentionService->parseMentions($message);

            if ($mentionedUsers->isNotEmpty()) {
                $notificationService = app(NotificationService::class);
                $notificationService->notifyMentions($message, $mentionedUsers);
            }
        }

        // Dispatch webhooks
        $webhookDispatcher = app(WebhookDispatcher::class);
        $webhookDispatcher->messageCreated($message);

        // Dispatch reply received webhook for customer replies
        if ($message->is_from_contact && $message->isReply()) {
            $webhookDispatcher->replyReceived($message);
        }
    }
}
