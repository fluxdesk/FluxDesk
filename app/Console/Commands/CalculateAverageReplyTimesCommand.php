<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Services\SlaAverageReplyTimeService;
use Illuminate\Console\Command;

class CalculateAverageReplyTimesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sla:calculate-averages';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Calculate weekly average reply times for all organizations';

    /**
     * Execute the console command.
     */
    public function handle(SlaAverageReplyTimeService $service): int
    {
        $this->info('Calculating average reply times...');

        $count = 0;

        Organization::chunk(100, function ($organizations) use ($service, &$count) {
            foreach ($organizations as $organization) {
                $service->calculateWeeklyAverages($organization);
                $count++;
            }
        });

        $this->info("Calculated averages for {$count} organizations.");

        return self::SUCCESS;
    }
}
