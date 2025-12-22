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
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('email_channel_id')
                ->nullable()
                ->after('channel')
                ->constrained('email_channels')
                ->nullOnDelete();
            $table->string('email_thread_id')->nullable()->after('email_channel_id');
            $table->index(['organization_id', 'email_channel_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['email_channel_id']);
            $table->dropIndex(['organization_id', 'email_channel_id']);
            $table->dropColumn(['email_channel_id', 'email_thread_id']);
        });
    }
};
