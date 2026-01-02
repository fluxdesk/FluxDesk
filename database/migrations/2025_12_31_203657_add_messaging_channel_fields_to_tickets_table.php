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
            if (! Schema::hasColumn('tickets', 'messaging_channel_id')) {
                $table->foreignId('messaging_channel_id')
                    ->nullable()
                    ->after('email_channel_id')
                    ->constrained()
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('tickets', 'messaging_conversation_id')) {
                $table->string('messaging_conversation_id')->nullable()->after('messaging_channel_id');
            }
            if (! Schema::hasColumn('tickets', 'messaging_participant_id')) {
                $table->string('messaging_participant_id')->nullable()->after('messaging_conversation_id');
            }
        });

        // Add indexes - wrap in try-catch in case they already exist
        try {
            Schema::table('tickets', function (Blueprint $table) {
                $table->index(['organization_id', 'messaging_channel_id']);
            });
        } catch (\Throwable) {
            // Index already exists
        }

        try {
            Schema::table('tickets', function (Blueprint $table) {
                $table->index(['messaging_channel_id', 'messaging_conversation_id']);
            });
        } catch (\Throwable) {
            // Index already exists
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop foreign key if exists
        try {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropForeign(['messaging_channel_id']);
            });
        } catch (\Throwable) {
            // Foreign key doesn't exist
        }

        // Drop indexes if they exist
        try {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropIndex(['organization_id', 'messaging_channel_id']);
            });
        } catch (\Throwable) {
            // Index doesn't exist
        }

        try {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropIndex(['messaging_channel_id', 'messaging_conversation_id']);
            });
        } catch (\Throwable) {
            // Index doesn't exist
        }

        // Drop columns
        Schema::table('tickets', function (Blueprint $table) {
            $columns = ['messaging_channel_id', 'messaging_conversation_id', 'messaging_participant_id'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('tickets', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
