<?php

namespace App\Enums;

enum WebhookFormat: string
{
    case Standard = 'standard';
    case Discord = 'discord';
    case Slack = 'slack';

    public function label(): string
    {
        return match ($this) {
            self::Standard => 'Standaard',
            self::Discord => 'Discord',
            self::Slack => 'Slack',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Standard => 'JSON payload met HMAC-SHA256 signature',
            self::Discord => 'Geoptimaliseerd voor Discord webhooks',
            self::Slack => 'Geoptimaliseerd voor Slack webhooks',
        };
    }

    public function usesSignature(): bool
    {
        return match ($this) {
            self::Standard => true,
            self::Discord => false,
            self::Slack => false,
        };
    }

    /**
     * @return array<array{value: string, label: string, description: string}>
     */
    public static function toOptions(): array
    {
        return array_map(
            fn (self $format) => [
                'value' => $format->value,
                'label' => $format->label(),
                'description' => $format->description(),
            ],
            self::cases()
        );
    }
}
