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
        Schema::create('organization_ai_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();

            // Provider selection
            $table->string('default_provider')->nullable();
            $table->string('default_model')->nullable();

            // Language settings
            $table->string('default_language', 10)->default('en');
            $table->boolean('detect_ticket_language')->default(true);
            $table->boolean('match_ticket_language')->default(true);

            // Custom instructions
            $table->text('system_instructions')->nullable();
            $table->text('company_context')->nullable();

            // Feature toggles
            $table->boolean('auto_replies_enabled')->default(false);
            $table->boolean('suggested_replies_enabled')->default(true);
            $table->boolean('reply_refactor_enabled')->default(true);

            // Auto-reply configuration
            $table->integer('auto_reply_delay_minutes')->default(5);
            $table->boolean('auto_reply_business_hours_only')->default(true);

            $table->timestamps();

            $table->unique('organization_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_ai_settings');
    }
};
