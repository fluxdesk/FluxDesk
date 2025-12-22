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
        Schema::table('email_channels', function (Blueprint $table) {
            $table->timestamp('import_emails_since')->nullable()->after('sync_interval_minutes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('email_channels', function (Blueprint $table) {
            $table->dropColumn('import_emails_since');
        });
    }
};
