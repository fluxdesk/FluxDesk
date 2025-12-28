<?php

use App\Models\Company;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * This migration converts from single domain to multiple domains.
     * It's a no-op if the domains column already exists (fresh installs).
     */
    public function up(): void
    {
        // Skip if domains column already exists (fresh install)
        if (Schema::hasColumn('companies', 'domains')) {
            return;
        }

        // Skip if domain column doesn't exist (shouldn't happen, but be safe)
        if (! Schema::hasColumn('companies', 'domain')) {
            return;
        }

        // Add organization_id index if it doesn't exist
        Schema::table('companies', function (Blueprint $table) {
            $table->index('organization_id', 'companies_organization_id_index');
        });

        // Drop the unique constraint on organization_id + domain
        Schema::table('companies', function (Blueprint $table) {
            $table->dropUnique('companies_organization_id_domain_unique');
        });

        // Add the new domains JSON column
        Schema::table('companies', function (Blueprint $table) {
            $table->json('domains')->nullable()->after('sla_id');
        });

        // Migrate existing domain data to domains array
        Company::withTrashed()->whereNotNull('domain')->each(function (Company $company) {
            DB::table('companies')
                ->where('id', $company->id)
                ->update(['domains' => json_encode([$company->getRawOriginal('domain')])]);
        });

        // Drop the old domain column
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('domain');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Skip if domain column already exists (already rolled back)
        if (Schema::hasColumn('companies', 'domain')) {
            return;
        }

        // Skip if domains column doesn't exist (nothing to rollback)
        if (! Schema::hasColumn('companies', 'domains')) {
            return;
        }

        Schema::table('companies', function (Blueprint $table) {
            $table->string('domain')->nullable()->after('sla_id');
        });

        // Migrate first domain back to domain field
        Company::withTrashed()->whereNotNull('domains')->each(function (Company $company) {
            $domains = json_decode($company->getRawOriginal('domains'), true);
            if (is_array($domains) && count($domains) > 0) {
                DB::table('companies')
                    ->where('id', $company->id)
                    ->update(['domain' => $domains[0]]);
            }
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('domains');
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->unique(['organization_id', 'domain'], 'companies_organization_id_domain_unique');
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->dropIndex('companies_organization_id_index');
        });
    }
};
