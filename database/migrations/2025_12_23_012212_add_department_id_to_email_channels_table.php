<?php

use App\Models\Organization;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Create default departments for organizations that have email channels but no departments
        $organizationIds = DB::table('email_channels')
            ->distinct()
            ->pluck('organization_id');

        foreach ($organizationIds as $organizationId) {
            $departmentExists = DB::table('departments')
                ->where('organization_id', $organizationId)
                ->exists();

            if (! $departmentExists) {
                DB::table('departments')->insert([
                    'organization_id' => $organizationId,
                    'name' => 'Algemeen',
                    'slug' => 'algemeen',
                    'description' => null,
                    'color' => '#6b7280',
                    'is_default' => true,
                    'sort_order' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Step 2: Add nullable department_id column
        Schema::table('email_channels', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('organization_id')->constrained()->cascadeOnDelete();
        });

        // Step 3: Assign existing email channels to the default department of their organization
        DB::table('email_channels as ec')
            ->whereNull('ec.department_id')
            ->update([
                'department_id' => DB::raw('(
                    SELECT d.id FROM departments d
                    WHERE d.organization_id = ec.organization_id
                    AND d.is_default = 1
                    LIMIT 1
                )'),
            ]);

        // Step 4: Make department_id NOT NULL
        // Note: This is handled in a separate statement for SQLite compatibility
        // For MySQL/PostgreSQL, we can alter the column
        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('email_channels', function (Blueprint $table) {
                $table->foreignId('department_id')->nullable(false)->change();
            });
        }
    }

    public function down(): void
    {
        Schema::table('email_channels', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
        });
    }
};
