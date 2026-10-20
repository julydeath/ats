import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Adds the `createdBy` relationship that was added to the Clients collection
// (commit 525e08f) without a matching migration. Guarded so it is safe to run
// against databases where the column was already created via schema push.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "created_by_id" integer;

    DO $$ BEGIN
      ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_id_users_id_fk"
        FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS "clients_created_by_idx" ON "clients" USING btree ("created_by_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "clients_created_by_idx";
    ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_created_by_id_users_id_fk";
    ALTER TABLE "clients" DROP COLUMN IF EXISTS "created_by_id";
  `)
}
