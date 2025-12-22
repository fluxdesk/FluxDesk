<?php

namespace App\Enums;

enum RecipientType: string
{
    case To = 'to';
    case Cc = 'cc';
    case Bcc = 'bcc';
}
