import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Quick bulk resume intake:
// - "indeed" candidate source
// - platform (source) + duplicate count on import batches
// - "duplicate" import item status and dismissedAt for the uploads tray
// - candidates.skills_search, a pipe-delimited lowercase copy of skills used
//   for "has all of these skills" search, backfilled from existing skills
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(`
    ALTER TYPE "public"."enum_candidates_source" ADD VALUE IF NOT EXISTS 'indeed' AFTER 'linkedin';
    ALTER TYPE "public"."enum_candidate_resume_import_items_status" ADD VALUE IF NOT EXISTS 'duplicate' AFTER 'candidateCreated';

    DO $$ BEGIN
      CREATE TYPE "public"."enum_candidate_resume_import_batches_source" AS ENUM(
        'naukri',
        'linkedin',
        'indeed',
        'reference',
        'careerPortal',
        'walkIn',
        'consultancy',
        'database',
        'other'
      );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "candidate_resume_import_batches"
      ADD COLUMN IF NOT EXISTS "source" "enum_candidate_resume_import_batches_source",
      ADD COLUMN IF NOT EXISTS "source_details" varchar,
      ADD COLUMN IF NOT EXISTS "duplicate_count" numeric DEFAULT 0;
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_batches_source_idx"
      ON "candidate_resume_import_batches" USING btree ("source");

    ALTER TABLE "candidate_resume_import_items"
      ADD COLUMN IF NOT EXISTS "dismissed_at" timestamp(3) with time zone;
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_dismissed_at_idx"
      ON "candidate_resume_import_items" USING btree ("dismissed_at");

    ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "skills_search" varchar;
    CREATE INDEX IF NOT EXISTS "candidates_skills_search_idx"
      ON "candidates" USING btree ("skills_search");

    UPDATE "candidates" AS c
    SET "skills_search" = s.search
    FROM (
      SELECT
        "parent_id",
        '|' || string_agg(DISTINCT lower(trim("text")), '|') || '|' AS search
      FROM "candidates_texts"
      WHERE "path" IN ('skills', 'primarySkills')
        AND "text" IS NOT NULL
        AND trim("text") <> ''
      GROUP BY "parent_id"
    ) AS s
    WHERE c."id" = s."parent_id" AND c."skills_search" IS NULL;
  `))
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Enum values added with ADD VALUE cannot be dropped without recreating the
  // type, so "indeed" and "duplicate" are left in place.
  await db.execute(sql.raw(`
    DROP INDEX IF EXISTS "candidates_skills_search_idx";
    ALTER TABLE "candidates" DROP COLUMN IF EXISTS "skills_search";

    DROP INDEX IF EXISTS "candidate_resume_import_items_dismissed_at_idx";
    ALTER TABLE "candidate_resume_import_items" DROP COLUMN IF EXISTS "dismissed_at";

    DROP INDEX IF EXISTS "candidate_resume_import_batches_source_idx";
    ALTER TABLE "candidate_resume_import_batches"
      DROP COLUMN IF EXISTS "source",
      DROP COLUMN IF EXISTS "source_details",
      DROP COLUMN IF EXISTS "duplicate_count";
    DROP TYPE IF EXISTS "public"."enum_candidate_resume_import_batches_source";
  `))
}
