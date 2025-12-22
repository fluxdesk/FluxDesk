<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('email_channel_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_channel_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // sync, send, receive, error
            $table->string('status'); // success, failed, partial
            $table->string('subject')->nullable(); // Email subject for sends
            $table->string('recipient')->nullable(); // Email recipient for sends
            $table->foreignId('ticket_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('message_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('emails_processed')->nullable(); // For syncs: how many emails
            $table->integer('tickets_created')->nullable(); // For syncs: new tickets
            $table->integer('messages_added')->nullable(); // For syncs: replies to existing
            $table->text('error')->nullable(); // Error message if failed
            $table->json('metadata')->nullable(); // Additional details
            $table->timestamps();

            $table->index(['email_channel_id', 'created_at']);
            $table->index(['type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_channel_logs');
    }
};
