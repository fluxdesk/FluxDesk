<?php

namespace App\Enums;

enum TicketChannel: string
{
    case Web = 'web';
    case Email = 'email';
    case Api = 'api';

    public function label(): string
    {
        return match ($this) {
            self::Web => 'Web',
            self::Email => 'Email',
            self::Api => 'API',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::Web => 'globe',
            self::Email => 'mail',
            self::Api => 'code',
        };
    }
}
