<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Agent = 'agent';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrator',
            self::Agent => 'Agent',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Admin => 'Full access to organization settings and all tickets',
            self::Agent => 'Can view and manage assigned tickets',
        };
    }
}
