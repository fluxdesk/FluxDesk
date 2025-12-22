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
            $table->string('post_import_action')->default('nothing')->after('auto_reply_enabled');
            $table->string('post_import_folder')->nullable()->after('post_import_action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('email_channels', function (Blueprint $table) {
            $table->dropColumn(['post_import_action', 'post_import_folder']);
        });
    }
};
