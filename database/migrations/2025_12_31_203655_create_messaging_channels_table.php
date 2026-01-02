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
        Schema::create('messaging_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('provider'); // instagram, whatsapp, facebook_messenger, wechat, livechat
            $table->string('external_id')->nullable(); // Instagram page ID, WhatsApp business ID, etc.
            $table->string('external_name')->nullable(); // Account/page display name
            $table->string('external_username')->nullable(); // @username for Instagram, phone for WhatsApp

            // OAuth/API credentials (encrypted)
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();

            // Provider-specific configuration (JSON, encrypted)
            $table->text('configuration')->nullable();

            // Auto-reply settings
            $table->boolean('auto_reply_enabled')->default(false);
            $table->text('auto_reply_message')->nullable();
            $table->boolean('auto_reply_business_hours_only')->default(false);
            $table->integer('auto_reply_delay_seconds')->default(0);

            // Channel settings
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->timestamp('last_sync_at')->nullable();
            $table->text('last_sync_error')->nullable();

            $table->timestamps();

            $table->unique(['organization_id', 'provider', 'external_id']);
            $table->index(['organization_id', 'is_active']);
            $table->index(['organization_id', 'provider']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messaging_channels');
    }
};
