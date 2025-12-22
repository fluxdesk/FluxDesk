<?php

namespace App\Enums;

enum PostImportAction: string
{
    case Nothing = 'nothing';
    case Delete = 'delete';
    case Archive = 'archive';
    case MoveToFolder = 'move_to_folder';

    public function label(): string
    {
        return match ($this) {
            self::Nothing => 'Do nothing',
            self::Delete => 'Delete email',
            self::Archive => 'Archive email',
            self::MoveToFolder => 'Move to folder',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Nothing => 'Leave emails in the inbox after importing',
            self::Delete => 'Permanently delete emails after importing',
            self::Archive => 'Archive emails after importing',
            self::MoveToFolder => 'Move emails to a specific folder after importing',
        };
    }
}
