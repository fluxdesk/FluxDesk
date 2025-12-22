<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // Store the Graph API message ID of our first sent notification
            // This is used to thread all subsequent notifications in the same conversation
            $table->string('email_sent_message_id')->nullable()->after('email_thread_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn('email_sent_message_id');
        });
    }
};
