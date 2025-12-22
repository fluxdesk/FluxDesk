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
        Schema::table('organization_settings', function (Blueprint $table) {
            $table->boolean('share_sla_times_with_contacts')->default(false)->after('business_hours');
            $table->boolean('share_average_reply_time')->default(false)->after('share_sla_times_with_contacts');
            $table->json('sla_reminder_intervals')->nullable()->after('share_average_reply_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organization_settings', function (Blueprint $table) {
            $table->dropColumn([
                'share_sla_times_with_contacts',
                'share_average_reply_time',
                'sla_reminder_intervals',
            ]);
        });
    }
};
