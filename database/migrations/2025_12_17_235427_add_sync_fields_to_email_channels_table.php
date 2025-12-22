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
            $table->unsignedInteger('sync_interval_minutes')->default(5)->after('is_default');
            $table->string('fetch_folder')->nullable()->after('sync_interval_minutes');
            $table->boolean('auto_reply_enabled')->default(false)->after('fetch_folder');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('email_channels', function (Blueprint $table) {
            $table->dropColumn(['sync_interval_minutes', 'fetch_folder', 'auto_reply_enabled']);
        });
    }
};
