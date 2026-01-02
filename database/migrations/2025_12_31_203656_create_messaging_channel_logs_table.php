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
        Schema::create('messaging_channel_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('messaging_channel_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // webhook, send, error, auto_reply
            $table->string('status'); // success, failed
            $table->foreignId('ticket_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('message_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('messages_received')->nullable();
            $table->integer('messages_sent')->nullable();
            $table->text('error')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['messaging_channel_id', 'created_at']);
            $table->index(['messaging_channel_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messaging_channel_logs');
    }
};
