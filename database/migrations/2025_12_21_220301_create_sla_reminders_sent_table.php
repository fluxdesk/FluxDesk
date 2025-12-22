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
        Schema::create('sla_reminders_sent', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['first_response', 'resolution']);
            $table->unsignedInteger('minutes_before');
            $table->timestamp('sent_at');

            $table->unique(['ticket_id', 'type', 'minutes_before']);
            $table->index(['ticket_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sla_reminders_sent');
    }
};
