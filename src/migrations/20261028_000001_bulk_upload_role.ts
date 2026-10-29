import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Role entered on a bulk resume upload (copied to each candidate's jobTitle).
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(`
    ALTER TABLE "candidate_resume_import_batches" ADD COLUMN IF NOT EXISTS "role" varchar;
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_batches_role_idx"
      ON "candidate_resume_import_batches" USING btree ("role");
  `))
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql.raw(`
    DROP INDEX IF EXISTS "candidate_resume_import_batches_role_idx";
    ALTER TABLE "candidate_resume_import_batches" DROP COLUMN IF EXISTS "role";
  `))
}
