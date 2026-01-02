<?php

namespace App\Enums;

enum MessagingProvider: string
{
    case Instagram = 'instagram';
    case FacebookMessenger = 'facebook_messenger';
    case WhatsApp = 'whatsapp';
    case WeChat = 'wechat';
    case Livechat = 'livechat';

    public function label(): string
    {
        return match ($this) {
            self::Instagram => 'Instagram DM',
            self::FacebookMessenger => 'Facebook Messenger',
            self::WhatsApp => 'WhatsApp',
            self::WeChat => 'WeChat',
            self::Livechat => 'Live Chat',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Instagram => 'Receive and respond to Instagram Direct Messages',
            self::FacebookMessenger => 'Receive and respond to Facebook Messenger conversations',
            self::WhatsApp => 'Receive and respond to WhatsApp messages via WhatsApp Business API',
            self::WeChat => 'Receive and respond to WeChat messages',
            self::Livechat => 'Embedded live chat widget for your website',
        };
    }

    public function icon(): string
    {
        return match ($this) {
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
            self::Instagram => '#E4405F',
            self::FacebookMessenger => '#0084FF',
            self::WhatsApp => '#25D366',
            self::WeChat => '#07C160',
            self::Livechat => '#6366F1',
        };
    }

    public function supportsWebhooks(): bool
    {
        return match ($this) {
            self::Instagram, self::FacebookMessenger, self::WhatsApp => true,
            self::WeChat, self::Livechat => false,
        };
    }

    public function requiresOAuth(): bool
    {
        return match ($this) {
            self::Instagram, self::FacebookMessenger => true,
            self::WhatsApp, self::WeChat, self::Livechat => false,
        };
    }

    public function integrationIdentifier(): ?string
    {
        return match ($this) {
            self::Instagram, self::FacebookMessenger => 'meta',
            self::WhatsApp => 'whatsapp',
            self::WeChat => 'wechat',
            self::Livechat => null,
        };
    }

    /**
     * Get the ticket channel enum value for this messaging provider.
     */
    public function toTicketChannel(): TicketChannel
    {
        return match ($this) {
            self::Instagram => TicketChannel::Instagram,
            self::FacebookMessenger => TicketChannel::FacebookMessenger,
            self::WhatsApp => TicketChannel::WhatsApp,
            self::WeChat => TicketChannel::WeChat,
            self::Livechat => TicketChannel::Livechat,
        };
    }
}
