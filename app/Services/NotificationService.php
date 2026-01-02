<?php

namespace App\Services;

use App\Enums\MessageType;
use App\Enums\RecipientType;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Ticket;
use App\Models\User;
use App\Notifications\Tickets\InternalNoteNotification;
use App\Notifications\Tickets\MentionNotification;
use App\Notifications\Tickets\NewAgentReplyNotification;
use App\Notifications\Tickets\NewContactReplyNotification;
use App\Notifications\Tickets\NewTicketNotification;
use App\Notifications\Tickets\SlaBreachWarningNotification;
use App\Notifications\Tickets\TicketAssignedNotification;
use App\Notifications\Tickets\TicketReceivedNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Service for managing and dispatching ticket-related notifications.
 *
 * This service handles the logic of determining who should receive
 * notifications and dispatching them accordingly.
 *
 * @see \App\Observers\MessageObserver
 */
class NotificationService
{
    public function __construct(
        private MagicLinkService $magicLinkService,
    ) {}

    /**
     * Check if system emails are disabled for the given ticket's organization.
     *
     * When system emails are disabled (e.g., during migration), all outgoing
     * emails should be suppressed to prevent duplicates or unwanted notifications.
     */
    private function areSystemEmailsDisabled(Ticket $ticket): bool
    {
        $ticket->loadMissing('organization.settings');

        return ! ($ticket->organization->settings->system_emails_enabled ?? true);
    }

    /**
     * Notify about a new ticket being created.
     *
     * - Contact: Receives confirmation (if not from email import)
     * - Org members: Receive new ticket alert (based on preferences)
     */
    public function notifyTicketCreated(Ticket $ticket): void
    {
        if ($this->areSystemEmailsDisabled($ticket)) {
            Log::debug('NotificationService: Skipping ticket created notification - system emails disabled', [
                'ticket_id' => $ticket->id,
            ]);

            return;
        }

        $ticket->loadMissing(['contact', 'organization.users', 'priority']);

        // Notify organization members
        $this->notifyOrganizationMembers($ticket, 'notify_new_ticket', function (User $user) use ($ticket) {
            return new NewTicketNotification($ticket);
        });

        // Notify the contact (if ticket wasn't imported from email)
        if (! $ticket->email_message_id && $ticket->contact) {
            $this->notifyContact($ticket);
        }
    }

    /**
     * Notify about a new message on a ticket.
     *
     * Determines the notification type based on who sent the message
     * and dispatches appropriate notifications.
     */
    public function notifyNewMessage(Message $message): void
    {
        // Skip agent replies that came from email import (we sent them, no need to notify)
        // But DO notify about contact replies from email (employees need to know customer responded)
        if ($message->email_message_id && ! $message->is_from_contact) {
            return;
        }

        $message->loadMissing(['ticket.contact', 'ticket.organization.users', 'user', 'contact']);
        $ticket = $message->ticket;

        if ($ticket && $this->areSystemEmailsDisabled($ticket)) {
            Log::debug('NotificationService: Skipping new message notification - system emails disabled', [
                'message_id' => $message->id,
                'ticket_id' => $ticket->id,
            ]);

            return;
        }

        if (! $ticket) {
            Log::warning('Cannot send message notification: no ticket found', [
                'message_id' => $message->id,
            ]);

            return;
        }

        // Skip if this is the first message on a new ticket
        // (TicketReceivedNotification already notifies the contact, NewTicketNotification notifies employees)
        if ($this->isFirstMessageOnTicket($message, $ticket)) {
            return;
        }

        match ($message->type) {
            MessageType::Reply => $this->handleReplyNotification($message, $ticket),
            MessageType::Note => $this->handleInternalNoteNotification($message, $ticket),
            default => null,
        };
    }

    /**
     * Check if this message is the first message on the ticket.
     */
    private function isFirstMessageOnTicket(Message $message, Ticket $ticket): bool
    {
        $firstMessage = $ticket->messages()->orderBy('created_at')->first();

        return $firstMessage && $firstMessage->id === $message->id;
    }

    /**
     * Handle notifications for reply messages.
     */
    private function handleReplyNotification(Message $message, Ticket $ticket): void
    {
        if ($message->is_from_contact) {
            // Contact/CC replied - notify organization members
            $this->notifyOrganizationMembers($ticket, 'notify_contact_reply', function (User $user) use ($ticket, $message) {
                return new NewContactReplyNotification($ticket, $message);
            });
        } else {
            // Agent replied - notify contact and CC recipients
            $this->notifyContactAndCc($ticket, $message);
        }
    }

    /**
     * Handle notifications for internal notes.
     */
    private function handleInternalNoteNotification(Message $message, Ticket $ticket): void
    {
        $this->notifyOrganizationMembers($ticket, 'notify_internal_note', function (User $user) use ($ticket, $message) {
            return new InternalNoteNotification($ticket, $message);
        });
    }

    /**
     * Notify the ticket contact about ticket creation.
     */
    private function notifyContact(Ticket $ticket): void
    {
        $contact = $ticket->contact;
        if (! $contact) {
            return;
        }

        try {
            $notification = new TicketReceivedNotification($ticket, $this->magicLinkService);
            $contact->notify($notification);
        } catch (\Exception $e) {
            Log::error('Failed to send ticket received notification', [
                'ticket_id' => $ticket->id,
                'contact_id' => $contact->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notify the contact and CC recipients about an agent reply.
     */
    private function notifyContactAndCc(Ticket $ticket, Message $message): void
    {
        $contact = $ticket->contact;
        if (! $contact) {
            return;
        }

        try {
            // Notify main contact (CC recipients are included via CC header in the notification)
            $notification = new NewAgentReplyNotification($ticket, $message, $this->magicLinkService);
            $contact->notify($notification);
        } catch (\Exception $e) {
            Log::error('Failed to send agent reply notification', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notify CC recipients about an agent reply.
     */
    private function notifyCcRecipients(Ticket $ticket, Message $message): void
    {
        // Get CC contacts from the original ticket messages
        $ccContacts = $this->getCcContactsForTicket($ticket);

        foreach ($ccContacts as $ccContact) {
            // Skip if same as main contact
            if ($ccContact->id === $ticket->contact_id) {
                continue;
            }

            try {
                $notification = new NewAgentReplyNotification($ticket, $message, $this->magicLinkService);
                $ccContact->notify($notification);
            } catch (\Exception $e) {
                Log::error('Failed to send notification to CC contact', [
                    'contact_id' => $ccContact->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Get all CC contacts for a ticket.
     *
     * CC recipients are stored on messages - we collect unique contacts
     * from all CC recipients on the ticket's messages.
     *
     * @return \Illuminate\Support\Collection<int, Contact>
     */
    private function getCcContactsForTicket(Ticket $ticket): \Illuminate\Support\Collection
    {
        return Contact::whereIn('id', function ($query) use ($ticket) {
            $query->select('contact_id')
                ->from('message_recipients')
                ->whereIn('message_id', function ($subQuery) use ($ticket) {
                    $subQuery->select('id')
                        ->from('messages')
                        ->where('ticket_id', $ticket->id);
                })
                ->where('type', RecipientType::Cc->value)
                ->whereNotNull('contact_id');
        })->get();
    }

    /**
     * Notify organization members based on their preferences.
     *
     * @param  string  $preferenceSetting  The preference field to check
     * @param  callable  $notificationFactory  Factory function that creates the notification
     */
    private function notifyOrganizationMembers(Ticket $ticket, string $preferenceSetting, callable $notificationFactory): void
    {
        $organization = $ticket->organization;
        if (! $organization) {
            return;
        }

        $organization->loadMissing(['users.notificationPreferences']);

        foreach ($organization->users as $user) {
            // Check user's notification preferences
            if (! $this->shouldNotifyUser($user, $organization->id, $preferenceSetting)) {
                continue;
            }

            try {
                $notification = $notificationFactory($user);
                $user->notify($notification);
            } catch (\Exception $e) {
                Log::error('Failed to send notification to organization member', [
                    'ticket_id' => $ticket->id,
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Check if a user should receive a notification based on their preferences.
     */
    private function shouldNotifyUser(User $user, int $organizationId, string $preferenceSetting): bool
    {
        $preferences = $user->notificationPreferencesFor($organizationId);

        // If no preferences set, default to true (all notifications enabled)
        if (! $preferences) {
            return true;
        }

        return (bool) ($preferences->{$preferenceSetting} ?? true);
    }

    /**
     * Notify users who were mentioned in a message.
     *
     * @param  Collection<int, User>  $mentionedUsers
     */
    public function notifyMentions(Message $message, Collection $mentionedUsers): void
    {
        $message->loadMissing(['ticket.organization', 'user']);
        $ticket = $message->ticket;

        if (! $ticket) {
            return;
        }

        if ($this->areSystemEmailsDisabled($ticket)) {
            Log::debug('NotificationService: Skipping mention notifications - system emails disabled', [
                'message_id' => $message->id,
                'ticket_id' => $ticket->id,
            ]);

            return;
        }

        // The user who wrote the message (mentioner)
        $mentionedBy = $message->user;

        if (! $mentionedBy) {
            return;
        }

        foreach ($mentionedUsers as $user) {
            // Don't notify if user mentioned themselves
            if ($user->id === $mentionedBy->id) {
                Log::debug('NotificationService: Skipping mention notification - user mentioned themselves', [
                    'user_id' => $user->id,
                    'message_id' => $message->id,
                ]);

                continue;
            }

            // Check if user wants mention notifications
            if (! $this->shouldNotifyUser($user, $ticket->organization_id, 'notify_when_mentioned')) {
                Log::debug('NotificationService: Skipping mention notification - user preference disabled', [
                    'user_id' => $user->id,
                    'message_id' => $message->id,
                ]);

                continue;
            }

            try {
                Log::info('NotificationService: Sending mention notification', [
                    'user_id' => $user->id,
                    'message_id' => $message->id,
                    'ticket_id' => $ticket->id,
                    'mentioned_by' => $mentionedBy->name,
                ]);
                $notification = new MentionNotification($ticket, $message, $mentionedBy);
                $user->notify($notification);
            } catch (\Exception $e) {
                Log::error('Failed to send mention notification', [
                    'message_id' => $message->id,
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Notify a user when a ticket is assigned to them.
     */
    public function notifyTicketAssigned(Ticket $ticket, ?User $assignedBy = null): void
    {
        if ($this->areSystemEmailsDisabled($ticket)) {
            Log::debug('NotificationService: Skipping assignment notification - system emails disabled', [
                'ticket_id' => $ticket->id,
            ]);

            return;
        }

        $ticket->loadMissing(['assignee', 'organization']);

        $assignee = $ticket->assignee;

        if (! $assignee) {
            return;
        }

        // Don't notify if user assigned ticket to themselves
        if ($assignedBy && $assignee->id === $assignedBy->id) {
            Log::debug('NotificationService: Skipping assignment notification - user assigned to themselves', [
                'user_id' => $assignee->id,
                'ticket_id' => $ticket->id,
            ]);

            return;
        }

        // Check if user wants assignment notifications
        if (! $this->shouldNotifyUser($assignee, $ticket->organization_id, 'notify_ticket_assigned')) {
            Log::debug('NotificationService: Skipping assignment notification - user preference disabled', [
                'user_id' => $assignee->id,
                'ticket_id' => $ticket->id,
            ]);

            return;
        }

        try {
            Log::info('NotificationService: Sending assignment notification', [
                'assignee_id' => $assignee->id,
                'ticket_id' => $ticket->id,
                'assigned_by' => $assignedBy?->name ?? 'System',
            ]);
            $notification = new TicketAssignedNotification($ticket, $assignedBy);
            $assignee->notify($notification);
        } catch (\Exception $e) {
            Log::error('Failed to send ticket assigned notification', [
                'ticket_id' => $ticket->id,
                'assignee_id' => $assignee->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notify about an approaching SLA breach.
     *
     * If the ticket has an assignee, only notify that assignee.
     * Otherwise, notify all organization members with SLA breach warning preference enabled.
     *
     * @param  string  $type  Either 'first_response' or 'resolution'
     */
    public function notifySlaBreachWarning(Ticket $ticket, string $type, int $minutesRemaining): void
    {
        if ($this->areSystemEmailsDisabled($ticket)) {
            Log::debug('NotificationService: Skipping SLA breach warning - system emails disabled', [
                'ticket_id' => $ticket->id,
                'type' => $type,
            ]);

            return;
        }

        $ticket->loadMissing(['assignee', 'organization.users']);

        $assignee = $ticket->assignee;

        // If ticket has an assignee, only notify them
        if ($assignee) {
            if (! $this->shouldNotifyUser($assignee, $ticket->organization_id, 'notify_sla_breach_warning')) {
                Log::debug('NotificationService: Skipping SLA breach warning - assignee preference disabled', [
                    'user_id' => $assignee->id,
                    'ticket_id' => $ticket->id,
                    'type' => $type,
                ]);

                return;
            }

            try {
                Log::info('NotificationService: Sending SLA breach warning to assignee', [
                    'assignee_id' => $assignee->id,
                    'ticket_id' => $ticket->id,
                    'type' => $type,
                    'minutes_remaining' => $minutesRemaining,
                ]);
                $notification = new SlaBreachWarningNotification($ticket, $type, $minutesRemaining);
                $assignee->notify($notification);
            } catch (\Exception $e) {
                Log::error('Failed to send SLA breach warning notification', [
                    'ticket_id' => $ticket->id,
                    'user_id' => $assignee->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return;
        }

        // No assignee - notify all organization members with preference enabled
        $this->notifyOrganizationMembers($ticket, 'notify_sla_breach_warning', function (User $user) use ($ticket, $type, $minutesRemaining) {
            return new SlaBreachWarningNotification($ticket, $type, $minutesRemaining);
        });
    }
}
