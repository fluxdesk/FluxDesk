<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * For OAuth providers, the email_address is retrieved from the provider
     * after successful authentication, so it needs to be nullable initially.
     */
    public function up(): void
    {
        // SQLite doesn't support modifying columns well, so we need to drop the
        // unique constraint first, then modify the column
        Schema::table('email_channels', function (Blueprint $table) {
            $table->dropUnique(['email_address']);
        });

        Schema::table('email_channels', function (Blueprint $table) {
            $table->string('email_address')->nullable()->change();
            $table->unique('email_address');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('email_channels', function (Blueprint $table) {
            $table->dropUnique(['email_address']);
        });

        Schema::table('email_channels', function (Blueprint $table) {
            $table->string('email_address')->nullable(false)->change();
            $table->unique('email_address');
        });
    }
};
