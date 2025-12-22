<?php

namespace App\Enums;

enum EmailProvider: string
{
    case Microsoft365 = 'microsoft365';
    case Google = 'google';
    case Smtp = 'smtp';

    public function label(): string
    {
        return match ($this) {
            self::Microsoft365 => 'Microsoft 365',
            self::Google => 'Google Workspace',
            self::Smtp => 'SMTP/IMAP',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Microsoft365 => 'Connect using Microsoft 365 OAuth',
            self::Google => 'Connect using Google Workspace OAuth',
            self::Smtp => 'Connect using traditional SMTP/IMAP',
        };
    }
}
