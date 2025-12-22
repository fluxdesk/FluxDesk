<?php

namespace App\Console\Commands;

use App\Services\SlaBreachReminderService;
use Illuminate\Console\Command;

class CheckSlaBreachesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sla:check-breaches';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for approaching SLA deadlines and send reminder notifications';

    /**
     * Execute the console command.
     */
    public function handle(SlaBreachReminderService $service): int
    {
        $this->info('Checking for approaching SLA deadlines...');

        $service->checkAndSendReminders();

        $this->info('SLA breach check completed.');

        return self::SUCCESS;
    }
}
