<?php

namespace App\Console\Commands;

use App\Models\Message;
use App\Services\HtmlSanitizer;
use Illuminate\Console\Command;

class SanitizeExistingMessagesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'messages:sanitize
                            {--dry-run : Show what would be done without making changes}
                            {--force : Skip confirmation prompt}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sanitize HTML content in existing messages and move original to raw_content';

    /**
     * Execute the console command.
     */
    public function handle(HtmlSanitizer $sanitizer): int
    {
        $isDryRun = $this->option('dry-run');

        // Find messages with HTML content that haven't been processed yet
        $query = Message::whereNotNull('body_html')
            ->whereNull('raw_content')
            ->where('body_html', '!=', '');

        $count = $query->count();

        if ($count === 0) {
            $this->info('No messages need sanitization.');

            return self::SUCCESS;
        }

        $this->info("Found {$count} messages with HTML content to sanitize.");

        if ($isDryRun) {
            $this->warn('Dry run mode - no changes will be made.');
            $this->showSample($query->limit(3)->get(), $sanitizer);

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Do you want to proceed?')) {
            $this->info('Operation cancelled.');

            return self::SUCCESS;
        }

        $progressBar = $this->output->createProgressBar($count);
        $progressBar->start();

        $processed = 0;
        $errors = 0;

        $query->chunkById(100, function ($messages) use ($sanitizer, $progressBar, &$processed, &$errors) {
            foreach ($messages as $message) {
                try {
                    $originalHtml = $message->body_html;
                    $sanitizedHtml = $sanitizer->sanitize($originalHtml);

                    $message->update([
                        'raw_content' => $originalHtml,
                        'body_html' => $sanitizedHtml,
                    ]);

                    $processed++;
                } catch (\Throwable $e) {
                    $errors++;
                    $this->newLine();
                    $this->error("Error processing message {$message->id}: {$e->getMessage()}");
                }

                $progressBar->advance();
            }
        });

        $progressBar->finish();
        $this->newLine(2);

        $this->info("Processed: {$processed} messages");

        if ($errors > 0) {
            $this->warn("Errors: {$errors} messages");
        }

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Show sample of what would be sanitized.
     */
    private function showSample($messages, HtmlSanitizer $sanitizer): void
    {
        foreach ($messages as $message) {
            $this->newLine();
            $this->info("Message ID: {$message->id}");
            $this->line('Original HTML (first 200 chars):');
            $this->line(substr($message->body_html, 0, 200).'...');
            $this->newLine();
            $this->line('Sanitized HTML (first 200 chars):');
            $sanitized = $sanitizer->sanitize($message->body_html);
            $this->line(substr($sanitized, 0, 200).'...');
            $this->newLine();
            $this->line(str_repeat('-', 50));
        }
    }
}
