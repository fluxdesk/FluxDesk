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
        Schema::table('organization_ai_settings', function (Blueprint $table) {
            // Privacy - Data fields to include/exclude
            $table->boolean('include_customer_name')->default(true);
            $table->boolean('include_agent_name')->default(true);
            $table->boolean('include_ticket_subject')->default(true);
            $table->boolean('include_message_history')->default(true);
            $table->boolean('include_department_name')->default(true);
            $table->integer('message_history_limit')->default(10);

            // Privacy - Disclosure settings
            $table->boolean('disclosure_enabled')->default(false);
            $table->boolean('disclosure_in_email')->default(true);
            $table->boolean('disclosure_in_portal')->default(true);
            $table->text('disclosure_text')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organization_ai_settings', function (Blueprint $table) {
            $table->dropColumn([
                'include_customer_name',
                'include_agent_name',
                'include_ticket_subject',
                'include_message_history',
                'include_department_name',
                'message_history_limit',
                'disclosure_enabled',
                'disclosure_in_email',
                'disclosure_in_portal',
                'disclosure_text',
            ]);
        });
    }
};
