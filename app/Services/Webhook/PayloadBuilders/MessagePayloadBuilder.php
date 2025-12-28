<?php

namespace App\Services\Webhook\PayloadBuilders;

use App\Models\Message;

class MessagePayloadBuilder
{
    public function __construct(
        private TicketPayloadBuilder $ticketPayloadBuilder,
    ) {}

    /**
     * Build payload for message created event.
     *
     * @return array<string, mixed>
     */
    public function forCreated(Message $message): array
    {
        return [
            'message' => $this->buildMessageData($message),
            'ticket' => $this->ticketPayloadBuilder->forCreated($message->ticket)['ticket'],
        ];
    }

    /**
     * Build payload for customer reply received event.
     *
     * @return array<string, mixed>
     */
    public function forReplyReceived(Message $message): array
    {
        return [
            'message' => $this->buildMessageData($message),
            'ticket' => $this->ticketPayloadBuilder->forCreated($message->ticket)['ticket'],
            'contact' => $this->buildContactData($message),
        ];
    }

    /**
     * Build the core message data.
     *
     * @return array<string, mixed>
     */
    private function buildMessageData(Message $message): array
    {
        return [
            'id' => $message->id,
            'type' => $message->type->value,
            'is_from_contact' => $message->is_from_contact,
            'author' => $message->is_from_contact
                ? ($message->contact ? [
                    'type' => 'contact',
                    'id' => $message->contact->id,
                    'name' => $message->contact->name,
                    'email' => $message->contact->email,
                ] : null)
                : ($message->user ? [
                    'type' => 'user',
                    'id' => $message->user->id,
                    'name' => $message->user->name,
                    'email' => $message->user->email,
                ] : null),
            'has_attachments' => $message->attachments()->exists(),
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }

    /**
     * Build the contact data from message.
     *
     * @return array<string, mixed>|null
     */
    private function buildContactData(Message $message): ?array
    {
        $contact = $message->contact;

        if (! $contact) {
            return null;
        }

        return [
            'id' => $contact->id,
            'name' => $contact->name,
            'email' => $contact->email,
        ];
    }
}
