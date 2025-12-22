<?php

namespace App\Channels;

use App\Models\EmailChannel;
use App\Models\EmailChannelLog;
use App\Models\Ticket;
use App\Services\Email\EmailProviderFactory;
use App\Services\Email\EmailThreadingService;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;

/**
 * Custom notification channel that sends emails through the ticket's email channel.
 *
 * All notifications for a ticket are threaded under the customer's original email
 * using the Microsoft Graph /reply endpoint for proper visual threading.
 */
class TicketEmailChannel
{
    public function __construct(
        private EmailProviderFactory $providerFactory,
        private EmailThreadingService $threadingService,
    ) {}

    public function send(mixed $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toTicketEmail')) {
            return;
        }

        $data = $notification->toTicketEmail($notifiable);
        if (! $data) {
            return;
        }

        $ticket = $this->getTicket($notification);
        if (! $ticket) {
            Log::warning('TicketEmailChannel: Cannot send notification - no ticket found', [
                'notification_class' => get_class($notification),
                'notifiable_type' => get_class($notifiable),
                'notifiable_id' => $notifiable->id ?? null,
            ]);

            return;
        }

        // Check if system emails are disabled for this organization
        $ticket->loadMissing('organization.settings');
        if (! ($ticket->organization->settings->system_emails_enabled ?? true)) {
            Log::info('TicketEmailChannel: Skipping notification - system emails disabled', [
                'notification_class' => get_class($notification),
                'ticket_id' => $ticket->id,
                'organization_id' => $ticket->organization_id,
            ]);

            return;
        }

        $emailChannel = $this->resolveEmailChannel($ticket);
        if (! $emailChannel) {
            Log::warning('TicketEmailChannel: Cannot send notification - no active email channel found', [
                'notification_class' => get_class($notification),
                'ticket_id' => $ticket->id,
                'organization_id' => $ticket->organization_id,
                'ticket_email_channel_id' => $ticket->email_channel_id,
            ]);

            return;
        }

        $recipientEmail = $this->getRecipientEmail($notifiable, $data);
        if (! $recipientEmail) {
            Log::warning('TicketEmailChannel: Cannot send notification - no recipient email', [
                'notification_class' => get_class($notification),
                'ticket_id' => $ticket->id,
                'notifiable_type' => get_class($notifiable),
                'notifiable_id' => $notifiable->id ?? null,
            ]);

            return;
        }

        try {
            $html = $this->renderEmail($data, $ticket, $notifiable);
            $subject = $this->ensureTicketInSubject($data['subject'], $ticket);

            // Only thread under customer's original email if explicitly requested
            // Employee notifications (NewTicketNotification, NewContactReplyNotification) should be NEW emails
            $shouldThread = $data['should_thread'] ?? false;
            $originalMessageId = $shouldThread ? $ticket->email_original_message_id : null;

            // Generate threading headers for Gmail RFC 2822 threading and Outlook
            $threadHeaders = $shouldThread
                ? $this->threadingService->generateNotificationHeaders($ticket, $emailChannel)
                : ['message_id' => null, 'in_reply_to' => null, 'references' => null, 'thread_topic' => null, 'thread_index' => null];

            $provider = $this->providerFactory->make($emailChannel);
            $provider->sendNotification($emailChannel, [
                'to_email' => $recipientEmail,
                'to_name' => $this->getRecipientName($notifiable, $data),
                'subject' => $subject,
                'html' => $html,
                'cc' => $data['cc'] ?? [],
                'reply_to' => $emailChannel->email_address,
                'original_message_id' => $originalMessageId,
                'thread_id' => $shouldThread ? $ticket->email_thread_id : null,
                'message_id' => $threadHeaders['message_id'],
                'in_reply_to' => $threadHeaders['in_reply_to'],
                'references' => $threadHeaders['references'],
                // Outlook-specific threading headers
                'thread_topic' => $threadHeaders['thread_topic'] ?? null,
                'thread_index' => $threadHeaders['thread_index'] ?? null,
                'headers' => [
                    'ticket_number' => $ticket->ticket_number,
                ],
            ]);

            // Log successful send
            EmailChannelLog::logSend(
                emailChannelId: $emailChannel->id,
                status: 'success',
                subject: $subject,
                recipient: $recipientEmail,
                ticketId: $ticket->id,
            );
        } catch (\Exception $e) {
            Log::error('Failed to send ticket notification: '.$e->getMessage());

            // Log failed send
            if (isset($emailChannel)) {
                EmailChannelLog::logSend(
                    emailChannelId: $emailChannel->id,
                    status: 'failed',
                    subject: $subject ?? $data['subject'] ?? null,
                    recipient: $recipientEmail ?? null,
                    ticketId: $ticket?->id,
                    error: $e->getMessage(),
                );
            }
        }
    }

    private function ensureTicketInSubject(string $subject, Ticket $ticket): string
    {
        if (! str_contains($subject, $ticket->ticket_number)) {
            return "[{$ticket->ticket_number}] {$subject}";
        }

        return $subject;
    }

    private function getTicket(Notification $notification): ?Ticket
    {
        if (property_exists($notification, 'ticket')) {
            return $notification->ticket;
        }

        if (property_exists($notification, 'message') && $notification->message?->ticket) {
            return $notification->message->ticket;
        }

        return null;
    }

    private function resolveEmailChannel(Ticket $ticket): ?EmailChannel
    {
        if ($ticket->email_channel_id) {
            $channel = $ticket->emailChannel;
            if ($channel && $channel->is_active) {
                return $channel;
            }
        }

        return EmailChannel::where('organization_id', $ticket->organization_id)
            ->active()
            ->default()
            ->first()
            ?? EmailChannel::where('organization_id', $ticket->organization_id)
                ->active()
                ->first();
    }

    private function getRecipientEmail(mixed $notifiable, array $data): ?string
    {
        if (! empty($data['to_email'])) {
            return $data['to_email'];
        }

        if (method_exists($notifiable, 'routeNotificationForMail')) {
            return $notifiable->routeNotificationForMail();
        }

        return $notifiable->email ?? null;
    }

    private function getRecipientName(mixed $notifiable, array $data): ?string
    {
        if (! empty($data['to_name'])) {
            return $data['to_name'];
        }

        return $notifiable->name ?? null;
    }

    private function renderEmail(array $data, Ticket $ticket, mixed $notifiable): string
    {
        $organization = $ticket->organization;

        $viewData = array_merge($data['data'] ?? [], [
            'ticket' => $ticket,
            'organization' => $organization,
            'notifiable' => $notifiable,
            'primaryColor' => $organization->settings['primary_color'] ?? '#3b82f6',
            'emailLogoPath' => $organization->settings['email_logo_path'] ?? null,
        ]);

        return View::make($data['view'], $viewData)->render();
    }
}
