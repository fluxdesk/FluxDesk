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
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 20)->default('reply');
            $table->text('body');
            $table->text('body_html')->nullable();
            $table->boolean('is_from_contact')->default(false);
            $table->string('email_message_id')->nullable();
            $table->string('email_in_reply_to')->nullable();
            $table->text('email_references')->nullable();
            $table->timestamps();

            $table->index(['ticket_id', 'created_at']);
            $table->index('email_message_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
