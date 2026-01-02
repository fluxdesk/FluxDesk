<?php

namespace App\Enums;

enum TicketChannel: string
{
    case Web = 'web';
    case Email = 'email';
    case Api = 'api';
    case Instagram = 'instagram';
    case FacebookMessenger = 'facebook_messenger';
    case WhatsApp = 'whatsapp';
    case WeChat = 'wechat';
    case Livechat = 'livechat';

    public function label(): string
    {
        return match ($this) {
            self::Web => 'Web',
            self::Email => 'Email',
            self::Api => 'API',
            self::Instagram => 'Instagram',
            self::FacebookMessenger => 'Messenger',
            self::WhatsApp => 'WhatsApp',
            self::WeChat => 'WeChat',
            self::Livechat => 'Live Chat',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::Web => 'globe',
            self::Email => 'mail',
            self::Api => 'code',
            self::Instagram => 'instagram',
            self::FacebookMessenger => 'facebook',
            self::WhatsApp => 'whatsapp',
            self::WeChat => 'wechat',
            self::Livechat => 'message-circle',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Web => '#6B7280',
            self::Email => '#3B82F6',
            self::Api => '#8B5CF6',
            self::Instagram => '#E4405F',
            self::FacebookMessenger => '#0084FF',
            self::WhatsApp => '#25D366',
            self::WeChat => '#07C160',
            self::Livechat => '#6366F1',
        };
    }

    public function isMessagingChannel(): bool
    {
        return in_array($this, [
            self::Instagram,
            self::FacebookMessenger,
            self::WhatsApp,
            self::WeChat,
            self::Livechat,
        ]);
    }

    public function isEmailChannel(): bool
    {
        return $this === self::Email;
    }

    /**
     * Get the messaging provider enum for this channel, if applicable.
     */
    public function toMessagingProvider(): ?MessagingProvider
    {
        return match ($this) {
            self::Instagram => MessagingProvider::Instagram,
            self::FacebookMessenger => MessagingProvider::FacebookMessenger,
            self::WhatsApp => MessagingProvider::WhatsApp,
            self::WeChat => MessagingProvider::WeChat,
            self::Livechat => MessagingProvider::Livechat,
            default => null,
        };
    }
}
