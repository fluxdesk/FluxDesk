<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Fix the tickets table foreign key that incorrectly references email_channels_old
     * instead of email_channels. SQLite requires recreating the table to fix foreign keys.
     */
    public function up(): void
    {
        // Only needed for SQLite
        if (DB::connection()->getDriverName() !== 'sqlite') {
            return;
        }

        DB::statement('PRAGMA foreign_keys=OFF');

        // Create new table with correct foreign key
        DB::statement('
            CREATE TABLE tickets_new (
                "id" integer primary key autoincrement not null,
                "organization_id" integer not null,
                "ticket_number" varchar not null,
                "subject" varchar not null,
                "contact_id" integer not null,
                "status_id" integer not null,
                "priority_id" integer not null,
                "sla_id" integer,
                "assigned_to" integer,
                "channel" varchar not null default (\'web\'),
                "first_response_at" datetime,
                "sla_first_response_due_at" datetime,
                "sla_resolution_due_at" datetime,
                "resolved_at" datetime,
                "closed_at" datetime,
                "created_at" datetime,
                "updated_at" datetime,
                "folder_id" integer,
                "email_channel_id" integer,
                "email_thread_id" varchar,
                foreign key("folder_id") references ticket_folders("id") on delete set null on update no action,
                foreign key("organization_id") references organizations("id") on delete cascade on update no action,
                foreign key("contact_id") references contacts("id") on delete cascade on update no action,
                foreign key("status_id") references statuses("id") on delete restrict on update no action,
                foreign key("priority_id") references priorities("id") on delete restrict on update no action,
                foreign key("sla_id") references slas("id") on delete set null on update no action,
                foreign key("assigned_to") references users("id") on delete set null on update no action,
                foreign key("email_channel_id") references email_channels("id") on delete set null
            )
        ');

        // Copy data from old table
        DB::statement('
            INSERT INTO tickets_new SELECT * FROM tickets
        ');

        // Drop old table
        DB::statement('DROP TABLE tickets');

        // Rename new table
        DB::statement('ALTER TABLE tickets_new RENAME TO tickets');

        // Recreate indexes
        DB::statement('CREATE INDEX "tickets_organization_id_assigned_to_index" on "tickets" ("organization_id", "assigned_to")');
        DB::statement('CREATE INDEX "tickets_organization_id_contact_id_index" on "tickets" ("organization_id", "contact_id")');
        DB::statement('CREATE INDEX "tickets_organization_id_created_at_index" on "tickets" ("organization_id", "created_at")');
        DB::statement('CREATE INDEX "tickets_organization_id_status_id_index" on "tickets" ("organization_id", "status_id")');
        DB::statement('CREATE UNIQUE INDEX "tickets_organization_id_ticket_number_unique" on "tickets" ("organization_id", "ticket_number")');
        DB::statement('CREATE INDEX "tickets_organization_id_email_channel_id_index" on "tickets" ("organization_id", "email_channel_id")');

        DB::statement('PRAGMA foreign_keys=ON');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Not reversible - the old incorrect foreign key should not be restored
    }
};
