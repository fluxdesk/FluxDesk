<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds email_provider_id to store the provider's internal message ID
     * (e.g., Microsoft Graph API message ID like "AAMkAGI2...").
     * This is needed to use the /reply endpoint for proper email threading.
     */
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('email_provider_id')->nullable()->after('email_message_id')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('email_provider_id');
        });
    }
};
