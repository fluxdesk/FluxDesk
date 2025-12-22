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
        Schema::create('ticket_folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete(); // null = shared folder
            $table->string('name');
            $table->string('slug');
            $table->string('color')->default('#6b7280');
            $table->string('icon')->nullable(); // lucide icon name
            $table->boolean('is_system')->default(false);
            $table->string('system_type')->nullable(); // inbox, solved, spam, deleted, archived
            $table->foreignId('auto_status_id')->nullable()->constrained('statuses')->nullOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['organization_id', 'slug']);
            $table->index(['organization_id', 'user_id']);
            $table->index('system_type');
        });

        // Add folder_id to tickets
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('folder_id')->nullable()->after('channel')->constrained('ticket_folders')->nullOnDelete();
        });

        // Add user_id to tags for personal tags
        Schema::table('tags', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('organization_id')->constrained()->cascadeOnDelete();
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('folder_id');
        });

        Schema::table('tags', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });

        Schema::dropIfExists('ticket_folders');
    }
};
