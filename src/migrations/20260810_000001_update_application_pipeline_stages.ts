import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

const newStages = `
  'sourced',
  'screened',
  'internalRejected',
  'submittedToClient',
  'clientRejected',
  'l1Scheduled',
  'l1Rejected',
  'l2Scheduled',
  'l2Rejected',
  'l3Scheduled',
  'l3Rejected',
  'hrDiscussion'
`

const legacyStages = `
  'sourced',
  'screened',
  'submittedToClient',
  'interviewScheduled',
  'interviewCleared',
  'offerReleased',
  'joined',
  'rejected'
`

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "internal_rejected_at" timestamp(3) with time zone;
    ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "client_rejected_at" timestamp(3) with time zone;
    ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "l1_scheduled_at" timestamp(3) with time zone;
    ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "l1_rejected_at" timestamp(3) with time zone;
    ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "l2_scheduled_at" timestamp(3) with time zone;
    ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "l2_rejected_at" timestamp(3) with time zone;
    ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "l3_scheduled_at" timestamp(3) with time zone;
    ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "l3_rejected_at" timestamp(3) with time zone;
    ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "hr_discussion_at" timestamp(3) with time zone;
  `)

  await db.execute(sql.raw(`
    ALTER TYPE "public"."enum_applications_stage" RENAME TO "enum_applications_stage_old";
    CREATE TYPE "public"."enum_applications_stage" AS ENUM(${newStages});
    ALTER TABLE "applications" ALTER COLUMN "stage" DROP DEFAULT;
    ALTER TABLE "applications"
      ALTER COLUMN "stage" TYPE "public"."enum_applications_stage"
      USING (
        CASE
          WHEN "stage"::text = 'interviewScheduled' THEN 'l1Scheduled'
          WHEN "stage"::text = 'interviewCleared' THEN 'l2Scheduled'
          WHEN "stage"::text = 'offerReleased' THEN 'hrDiscussion'
          WHEN "stage"::text = 'joined' THEN 'hrDiscussion'
          WHEN "stage"::text = 'rejected' AND "interview_cleared_at" IS NOT NULL THEN 'l2Rejected'
          WHEN "stage"::text = 'rejected' AND "interview_scheduled_at" IS NOT NULL THEN 'l1Rejected'
          WHEN "stage"::text = 'rejected' AND "submitted_to_client_at" IS NOT NULL THEN 'clientRejected'
          WHEN "stage"::text = 'rejected' THEN 'internalRejected'
          ELSE "stage"::text
        END
      )::"public"."enum_applications_stage";
    ALTER TABLE "applications" ALTER COLUMN "stage" SET DEFAULT 'sourced';
    DROP TYPE "public"."enum_applications_stage_old";
  `))

  await db.execute(sql.raw(`
    ALTER TYPE "public"."enum_application_stage_history_from_stage" RENAME TO "enum_application_stage_history_from_stage_old";
    CREATE TYPE "public"."enum_application_stage_history_from_stage" AS ENUM(${newStages});
    ALTER TABLE "application_stage_history"
      ALTER COLUMN "from_stage" TYPE "public"."enum_application_stage_history_from_stage"
      USING (
        CASE
          WHEN "from_stage" IS NULL THEN NULL
          WHEN "from_stage"::text = 'interviewScheduled' THEN 'l1Scheduled'
          WHEN "from_stage"::text = 'interviewCleared' THEN 'l2Scheduled'
          WHEN "from_stage"::text = 'offerReleased' THEN 'hrDiscussion'
          WHEN "from_stage"::text = 'joined' THEN 'hrDiscussion'
          WHEN "from_stage"::text = 'rejected' THEN 'internalRejected'
          ELSE "from_stage"::text
        END
      )::"public"."enum_application_stage_history_from_stage";
    DROP TYPE "public"."enum_application_stage_history_from_stage_old";
  `))

  await db.execute(sql.raw(`
    ALTER TYPE "public"."enum_application_stage_history_to_stage" RENAME TO "enum_application_stage_history_to_stage_old";
    CREATE TYPE "public"."enum_application_stage_history_to_stage" AS ENUM(${newStages});
    ALTER TABLE "application_stage_history"
      ALTER COLUMN "to_stage" TYPE "public"."enum_application_stage_history_to_stage"
      USING (
        CASE
          WHEN "to_stage"::text = 'interviewScheduled' THEN 'l1Scheduled'
          WHEN "to_stage"::text = 'interviewCleared' THEN 'l2Scheduled'
          WHEN "to_stage"::text = 'offerReleased' THEN 'hrDiscussion'
          WHEN "to_stage"::text = 'joined' THEN 'hrDiscussion'
          WHEN "to_stage"::text = 'rejected' AND "from_stage"::text = 'submittedToClient' THEN 'clientRejected'
          WHEN "to_stage"::text = 'rejected' AND "from_stage"::text = 'l1Scheduled' THEN 'l1Rejected'
          WHEN "to_stage"::text = 'rejected' AND "from_stage"::text = 'l2Scheduled' THEN 'l2Rejected'
          WHEN "to_stage"::text = 'rejected' AND "from_stage"::text = 'l3Scheduled' THEN 'l3Rejected'
          WHEN "to_stage"::text = 'rejected' THEN 'internalRejected'
          ELSE "to_stage"::text
        END
      )::"public"."enum_application_stage_history_to_stage";
    DROP TYPE "public"."enum_application_stage_history_to_stage_old";
  `))

  await db.execute(sql`
    UPDATE "applications"
    SET
      "internal_rejected_at" = COALESCE("internal_rejected_at", "rejected_at", "not_joined_at")
    WHERE "stage" = 'internalRejected';

    UPDATE "applications"
    SET
      "client_rejected_at" = COALESCE("client_rejected_at", "rejected_at", "not_joined_at")
    WHERE "stage" = 'clientRejected';

    UPDATE "applications"
    SET
      "l1_scheduled_at" = COALESCE("l1_scheduled_at", "interview_scheduled_at", "interview_at")
    WHERE "stage" = 'l1Scheduled';

    UPDATE "applications"
    SET
      "l1_rejected_at" = COALESCE("l1_rejected_at", "rejected_at", "not_joined_at")
    WHERE "stage" = 'l1Rejected';

    UPDATE "applications"
    SET
      "l2_scheduled_at" = COALESCE("l2_scheduled_at", "interview_cleared_at", "confirmed_at")
    WHERE "stage" = 'l2Scheduled';

    UPDATE "applications"
    SET
      "l2_rejected_at" = COALESCE("l2_rejected_at", "rejected_at", "not_joined_at")
    WHERE "stage" = 'l2Rejected';

    UPDATE "applications"
    SET
      "l3_scheduled_at" = COALESCE("l3_scheduled_at", "offer_released_at")
    WHERE "stage" = 'l3Scheduled';

    UPDATE "applications"
    SET
      "l3_rejected_at" = COALESCE("l3_rejected_at", "rejected_at", "not_joined_at")
    WHERE "stage" = 'l3Rejected';

    UPDATE "applications"
    SET
      "hr_discussion_at" = COALESCE("hr_discussion_at", "offer_released_at", "joined_at", "placed_at")
    WHERE "stage" = 'hrDiscussion';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql.raw(`
    ALTER TYPE "public"."enum_applications_stage" RENAME TO "enum_applications_stage_new";
    CREATE TYPE "public"."enum_applications_stage" AS ENUM(${legacyStages});
    ALTER TABLE "applications" ALTER COLUMN "stage" DROP DEFAULT;
    ALTER TABLE "applications"
      ALTER COLUMN "stage" TYPE "public"."enum_applications_stage"
      USING (
        CASE
          WHEN "stage"::text IN ('internalRejected', 'clientRejected', 'l1Rejected', 'l2Rejected', 'l3Rejected') THEN 'rejected'
          WHEN "stage"::text = 'l1Scheduled' THEN 'interviewScheduled'
          WHEN "stage"::text IN ('l2Scheduled', 'l3Scheduled') THEN 'interviewCleared'
          WHEN "stage"::text = 'hrDiscussion' THEN 'offerReleased'
          ELSE "stage"::text
        END
      )::"public"."enum_applications_stage";
    ALTER TABLE "applications" ALTER COLUMN "stage" SET DEFAULT 'sourced';
    DROP TYPE "public"."enum_applications_stage_new";
  `))

  await db.execute(sql.raw(`
    ALTER TYPE "public"."enum_application_stage_history_from_stage" RENAME TO "enum_application_stage_history_from_stage_new";
    CREATE TYPE "public"."enum_application_stage_history_from_stage" AS ENUM(${legacyStages});
    ALTER TABLE "application_stage_history"
      ALTER COLUMN "from_stage" TYPE "public"."enum_application_stage_history_from_stage"
      USING (
        CASE
          WHEN "from_stage" IS NULL THEN NULL
          WHEN "from_stage"::text IN ('internalRejected', 'clientRejected', 'l1Rejected', 'l2Rejected', 'l3Rejected') THEN 'rejected'
          WHEN "from_stage"::text = 'l1Scheduled' THEN 'interviewScheduled'
          WHEN "from_stage"::text IN ('l2Scheduled', 'l3Scheduled') THEN 'interviewCleared'
          WHEN "from_stage"::text = 'hrDiscussion' THEN 'offerReleased'
          ELSE "from_stage"::text
        END
      )::"public"."enum_application_stage_history_from_stage";
    DROP TYPE "public"."enum_application_stage_history_from_stage_new";
  `))

  await db.execute(sql.raw(`
    ALTER TYPE "public"."enum_application_stage_history_to_stage" RENAME TO "enum_application_stage_history_to_stage_new";
    CREATE TYPE "public"."enum_application_stage_history_to_stage" AS ENUM(${legacyStages});
    ALTER TABLE "application_stage_history"
      ALTER COLUMN "to_stage" TYPE "public"."enum_application_stage_history_to_stage"
      USING (
        CASE
          WHEN "to_stage"::text IN ('internalRejected', 'clientRejected', 'l1Rejected', 'l2Rejected', 'l3Rejected') THEN 'rejected'
          WHEN "to_stage"::text = 'l1Scheduled' THEN 'interviewScheduled'
          WHEN "to_stage"::text IN ('l2Scheduled', 'l3Scheduled') THEN 'interviewCleared'
          WHEN "to_stage"::text = 'hrDiscussion' THEN 'offerReleased'
          ELSE "to_stage"::text
        END
      )::"public"."enum_application_stage_history_to_stage";
    DROP TYPE "public"."enum_application_stage_history_to_stage_new";
  `))

  await db.execute(sql`
    ALTER TABLE "applications" DROP COLUMN IF EXISTS "internal_rejected_at";
    ALTER TABLE "applications" DROP COLUMN IF EXISTS "client_rejected_at";
    ALTER TABLE "applications" DROP COLUMN IF EXISTS "l1_scheduled_at";
    ALTER TABLE "applications" DROP COLUMN IF EXISTS "l1_rejected_at";
    ALTER TABLE "applications" DROP COLUMN IF EXISTS "l2_scheduled_at";
    ALTER TABLE "applications" DROP COLUMN IF EXISTS "l2_rejected_at";
    ALTER TABLE "applications" DROP COLUMN IF EXISTS "l3_scheduled_at";
    ALTER TABLE "applications" DROP COLUMN IF EXISTS "l3_rejected_at";
    ALTER TABLE "applications" DROP COLUMN IF EXISTS "hr_discussion_at";
  `)
}
