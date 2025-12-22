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
        Schema::create('sla_average_reply_times', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('priority_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('average_minutes');
            $table->unsignedInteger('ticket_count');
            $table->date('week_start');
            $table->timestamps();

            $table->unique(['organization_id', 'priority_id', 'week_start'], 'sla_avg_org_priority_week_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sla_average_reply_times');
    }
};
