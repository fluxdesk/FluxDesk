<?php

namespace App\Enums;

enum MessagingStatus: string
{
    case Pending = 'pending';
    case Sent = 'sent';
    case Delivered = 'delivered';
    case Read = 'read';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Sent => 'Sent',
            self::Delivered => 'Delivered',
            self::Read => 'Read',
            self::Failed => 'Failed',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::Pending => 'clock',
            self::Sent => 'check',
            self::Delivered => 'check-check',
            self::Read => 'eye',
            self::Failed => 'x-circle',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Pending => 'text-yellow-500',
            self::Sent => 'text-blue-500',
            self::Delivered => 'text-green-500',
            self::Read => 'text-green-600',
            self::Failed => 'text-red-500',
        };
    }

    public function isSuccessful(): bool
    {
        return in_array($this, [self::Sent, self::Delivered, self::Read]);
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Read, self::Failed]);
    }
}
