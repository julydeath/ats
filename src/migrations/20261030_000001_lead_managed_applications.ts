import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Lead-managed applications: a lead (or admin) can create an application
// without a recruiter, so the recruiter link becomes optional.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(`
    ALTER TABLE "applications" ALTER COLUMN "recruiter_id" DROP NOT NULL;
    ALTER TABLE "application_stage_history" ALTER COLUMN "recruiter_id" DROP NOT NULL;
  `))
}

// Fails if lead-managed applications exist; assign them a recruiter first.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql.raw(`
    ALTER TABLE "application_stage_history" ALTER COLUMN "recruiter_id" SET NOT NULL;
    ALTER TABLE "applications" ALTER COLUMN "recruiter_id" SET NOT NULL;
  `))
}
