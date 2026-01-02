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
            $table->string('messaging_provider_id')->nullable()->after('email_provider_id');
            $table->string('messaging_status')->nullable()->after('email_status'); // pending, sent, delivered, read, failed
            $table->text('messaging_error')->nullable()->after('email_error');
            $table->timestamp('messaging_sent_at')->nullable()->after('email_sent_at');
            $table->timestamp('messaging_delivered_at')->nullable()->after('messaging_sent_at');
            $table->timestamp('messaging_read_at')->nullable()->after('messaging_delivered_at');

            $table->index('messaging_provider_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['messaging_provider_id']);
            $table->dropColumn([
                'messaging_provider_id',
                'messaging_status',
                'messaging_error',
                'messaging_sent_at',
                'messaging_delivered_at',
                'messaging_read_at',
            ]);
        });
    }
};
