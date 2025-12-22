<?php

namespace App\Enums;

/**
 * Email send status for messages.
 *
 * Tracks the delivery status of outgoing emails for messages.
 */
enum EmailStatus: string
{
    case Pending = 'pending';
    case Sent = 'sent';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Sent => 'Sent',
            self::Failed => 'Failed',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Pending => 'Email is queued and waiting to be sent',
            self::Sent => 'Email was successfully delivered',
            self::Failed => 'Email delivery failed',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Pending => 'yellow',
            self::Sent => 'green',
            self::Failed => 'red',
        };
    }
}
