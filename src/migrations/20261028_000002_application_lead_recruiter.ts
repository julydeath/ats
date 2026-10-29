import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Lead recruiter on each application (who owns its review).
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(`
    ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "lead_recruiter_id" integer;

    DO $$ BEGIN
      ALTER TABLE "applications" ADD CONSTRAINT "applications_lead_recruiter_id_users_id_fk"
        FOREIGN KEY ("lead_recruiter_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS "applications_lead_recruiter_idx"
      ON "applications" USING btree ("lead_recruiter_id");
    CREATE INDEX IF NOT EXISTS "leadRecruiter_stage_idx"
      ON "applications" USING btree ("lead_recruiter_id", "stage");
  `))
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql.raw(`
    DROP INDEX IF EXISTS "leadRecruiter_stage_idx";
    DROP INDEX IF EXISTS "applications_lead_recruiter_idx";
    ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "applications_lead_recruiter_id_users_id_fk";
    ALTER TABLE "applications" DROP COLUMN IF EXISTS "lead_recruiter_id";
  `))
}
