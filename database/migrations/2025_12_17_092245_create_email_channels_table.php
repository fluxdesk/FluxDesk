<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // e.g., "Support Email"
            $table->string('email_address')->unique(); // support@company.com
            $table->enum('provider', ['microsoft365', 'google', 'smtp'])->default('smtp');

            // OAuth credentials (encrypted)
            $table->text('oauth_token')->nullable();
            $table->text('oauth_refresh_token')->nullable();
            $table->timestamp('oauth_token_expires_at')->nullable();

            // SMTP credentials (encrypted) - fallback for non-OAuth
            $table->string('smtp_host')->nullable();
            $table->integer('smtp_port')->nullable();
            $table->string('smtp_username')->nullable();
            $table->text('smtp_password')->nullable();
            $table->string('smtp_encryption')->nullable(); // tls, ssl, null

            // IMAP for incoming (if using SMTP)
            $table->string('imap_host')->nullable();
            $table->integer('imap_port')->nullable();
            $table->string('imap_username')->nullable();
            $table->text('imap_password')->nullable();
            $table->string('imap_encryption')->nullable();

            // Channel settings
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->timestamp('last_sync_at')->nullable();
            $table->text('last_sync_error')->nullable();

            $table->timestamps();

            $table->index(['organization_id', 'is_active']);
            $table->index(['organization_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_channels');
    }
};
