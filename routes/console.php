<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Tasks
|--------------------------------------------------------------------------
|
| Here you may define all of your scheduled tasks. These tasks will be
| executed at the intervals you define.
|
*/

// Sync emails from all active email channels every minute
// The command itself determines which channels need syncing based on their interval
Schedule::command('email:sync')->everyMinute()->withoutOverlapping();

// Check for approaching SLA deadlines and send reminders every 5 minutes
Schedule::command('sla:check-breaches')->everyFiveMinutes()->withoutOverlapping();

// Calculate weekly average reply times every Sunday at midnight
Schedule::command('sla:calculate-averages')->weeklyOn(0, '00:00');
