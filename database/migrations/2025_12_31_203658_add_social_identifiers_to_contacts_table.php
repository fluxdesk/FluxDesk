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
        Schema::table('contacts', function (Blueprint $table) {
            $table->string('instagram_id')->nullable()->after('phone');
            $table->string('instagram_username')->nullable()->after('instagram_id');
            $table->string('facebook_id')->nullable()->after('instagram_username');
            $table->string('whatsapp_phone')->nullable()->after('facebook_id');
            $table->string('wechat_id')->nullable()->after('whatsapp_phone');
            $table->string('avatar_url')->nullable()->after('wechat_id');

            $table->index(['organization_id', 'instagram_id']);
            $table->index(['organization_id', 'facebook_id']);
            $table->index(['organization_id', 'whatsapp_phone']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropIndex(['organization_id', 'instagram_id']);
            $table->dropIndex(['organization_id', 'facebook_id']);
            $table->dropIndex(['organization_id', 'whatsapp_phone']);
            $table->dropColumn([
                'instagram_id',
                'instagram_username',
                'facebook_id',
                'whatsapp_phone',
                'wechat_id',
                'avatar_url',
            ]);
        });
    }
};
