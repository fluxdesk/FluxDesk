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
        Schema::table('messages', function (Blueprint $table) {
            $table->string('email_status')->nullable()->after('email_references');
            $table->text('email_error')->nullable()->after('email_status');
            $table->timestamp('email_sent_at')->nullable()->after('email_error');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['email_status', 'email_error', 'email_sent_at']);
        });
    }
};
