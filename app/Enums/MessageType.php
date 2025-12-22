<?php

namespace App\Enums;

enum MessageType: string
{
    case Reply = 'reply';
    case Note = 'note';
    case System = 'system';

    public function label(): string
    {
        return match ($this) {
            self::Reply => 'Reply',
            self::Note => 'Internal Note',
            self::System => 'System',
        };
    }

    public function isVisibleToContact(): bool
    {
        return match ($this) {
            self::Reply => true,
            self::Note => false,
            self::System => false,
        };
    }
}
