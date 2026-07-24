import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "candidate_resumes" ALTER COLUMN "source_job_id" DROP NOT NULL;
    ALTER TABLE "candidates" ALTER COLUMN "source_job_id" DROP NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "candidate_resumes" ALTER COLUMN "source_job_id" SET NOT NULL;
    ALTER TABLE "candidates" ALTER COLUMN "source_job_id" SET NOT NULL;
  `)
}
