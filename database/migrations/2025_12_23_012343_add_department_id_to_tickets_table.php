<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Create default departments for organizations that have tickets but no departments
        $organizationIds = DB::table('tickets')
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
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('sla_id')->constrained()->restrictOnDelete();
        });

        // Step 3: Assign existing tickets to the default department of their organization
        DB::table('tickets as t')
            ->whereNull('t.department_id')
            ->update([
                'department_id' => DB::raw('(
                    SELECT d.id FROM departments d
                    WHERE d.organization_id = t.organization_id
                    AND d.is_default = 1
                    LIMIT 1
                )'),
            ]);

        // Step 4: Make department_id NOT NULL
        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('tickets', function (Blueprint $table) {
                $table->foreignId('department_id')->nullable(false)->change();
            });
        }
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
        });
    }
};
