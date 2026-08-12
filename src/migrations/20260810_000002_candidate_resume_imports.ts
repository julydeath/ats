import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_candidate_resume_import_batches_status" AS ENUM(
        'queued',
        'processing',
        'readyForReview',
        'completed',
        'completedWithErrors',
        'failed'
      );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_candidate_resume_import_items_status" AS ENUM(
        'queued',
        'processing',
        'needsReview',
        'candidateCreated',
        'failed'
      );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "candidate_resume_import_batches" (
      "id" serial PRIMARY KEY NOT NULL,
      "batch_code" varchar,
      "status" "enum_candidate_resume_import_batches_status" DEFAULT 'queued' NOT NULL,
      "source_job_id" integer,
      "uploaded_by_id" integer,
      "total_count" numeric DEFAULT 0,
      "queued_count" numeric DEFAULT 0,
      "processing_count" numeric DEFAULT 0,
      "parsed_count" numeric DEFAULT 0,
      "failed_count" numeric DEFAULT 0,
      "created_count" numeric DEFAULT 0,
      "started_at" timestamp(3) with time zone,
      "completed_at" timestamp(3) with time zone,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "candidate_resume_import_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "item_code" varchar,
      "batch_id" integer NOT NULL,
      "resume_id" integer NOT NULL,
      "source_job_id" integer,
      "uploaded_by_id" integer,
      "status" "enum_candidate_resume_import_items_status" DEFAULT 'queued' NOT NULL,
      "parsed_data" jsonb,
      "extracted_text_preview" varchar,
      "error" varchar,
      "attempt_count" numeric DEFAULT 0,
      "started_at" timestamp(3) with time zone,
      "processed_at" timestamp(3) with time zone,
      "candidate_created_at" timestamp(3) with time zone,
      "candidate_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "candidate_resume_import_items_warnings" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "message" varchar NOT NULL
    );

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "candidate_resume_import_batches_id" integer;

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "candidate_resume_import_items_id" integer;
  `))

  await db.execute(sql.raw(`
    DO $$ BEGIN
      ALTER TABLE "candidate_resume_import_batches"
      ADD CONSTRAINT "candidate_resume_import_batches_source_job_id_jobs_id_fk"
      FOREIGN KEY ("source_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "candidate_resume_import_batches"
      ADD CONSTRAINT "candidate_resume_import_batches_uploaded_by_id_users_id_fk"
      FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "candidate_resume_import_items"
      ADD CONSTRAINT "candidate_resume_import_items_batch_id_candidate_resume_import_batches_id_fk"
      FOREIGN KEY ("batch_id") REFERENCES "public"."candidate_resume_import_batches"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "candidate_resume_import_items"
      ADD CONSTRAINT "candidate_resume_import_items_resume_id_candidate_resumes_id_fk"
      FOREIGN KEY ("resume_id") REFERENCES "public"."candidate_resumes"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "candidate_resume_import_items"
      ADD CONSTRAINT "candidate_resume_import_items_source_job_id_jobs_id_fk"
      FOREIGN KEY ("source_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "candidate_resume_import_items"
      ADD CONSTRAINT "candidate_resume_import_items_uploaded_by_id_users_id_fk"
      FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "candidate_resume_import_items"
      ADD CONSTRAINT "candidate_resume_import_items_candidate_id_candidates_id_fk"
      FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "candidate_resume_import_items_warnings"
      ADD CONSTRAINT "candidate_resume_import_items_warnings_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."candidate_resume_import_items"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_candidate_resume_import_bat_fk"
      FOREIGN KEY ("candidate_resume_import_batches_id") REFERENCES "public"."candidate_resume_import_batches"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_candidate_resume_import_ite_fk"
      FOREIGN KEY ("candidate_resume_import_items_id") REFERENCES "public"."candidate_resume_import_items"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `))

  await db.execute(sql.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS "candidate_resume_import_batches_batch_code_idx" ON "candidate_resume_import_batches" USING btree ("batch_code");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_batches_status_idx" ON "candidate_resume_import_batches" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_batches_source_job_idx" ON "candidate_resume_import_batches" USING btree ("source_job_id");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_batches_uploaded_by_idx" ON "candidate_resume_import_batches" USING btree ("uploaded_by_id");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_batches_started_at_idx" ON "candidate_resume_import_batches" USING btree ("started_at");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_batches_completed_at_idx" ON "candidate_resume_import_batches" USING btree ("completed_at");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_batches_updated_at_idx" ON "candidate_resume_import_batches" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_batches_created_at_idx" ON "candidate_resume_import_batches" USING btree ("created_at");

    CREATE UNIQUE INDEX IF NOT EXISTS "candidate_resume_import_items_item_code_idx" ON "candidate_resume_import_items" USING btree ("item_code");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_batch_idx" ON "candidate_resume_import_items" USING btree ("batch_id");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_resume_idx" ON "candidate_resume_import_items" USING btree ("resume_id");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_source_job_idx" ON "candidate_resume_import_items" USING btree ("source_job_id");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_uploaded_by_idx" ON "candidate_resume_import_items" USING btree ("uploaded_by_id");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_status_idx" ON "candidate_resume_import_items" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_started_at_idx" ON "candidate_resume_import_items" USING btree ("started_at");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_processed_at_idx" ON "candidate_resume_import_items" USING btree ("processed_at");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_candidate_created_at_idx" ON "candidate_resume_import_items" USING btree ("candidate_created_at");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_candidate_idx" ON "candidate_resume_import_items" USING btree ("candidate_id");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_updated_at_idx" ON "candidate_resume_import_items" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_created_at_idx" ON "candidate_resume_import_items" USING btree ("created_at");

    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_warnings_order_idx" ON "candidate_resume_import_items_warnings" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "candidate_resume_import_items_warnings_parent_id_idx" ON "candidate_resume_import_items_warnings" USING btree ("_parent_id");

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_candidate_resume_import_ba_idx" ON "payload_locked_documents_rels" USING btree ("candidate_resume_import_batches_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_candidate_resume_import_it_idx" ON "payload_locked_documents_rels" USING btree ("candidate_resume_import_items_id");
  `))
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql.raw(`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_candidate_resume_import_bat_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_candidate_resume_import_ite_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_candidate_resume_import_ba_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_candidate_resume_import_it_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "candidate_resume_import_batches_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "candidate_resume_import_items_id";

    DROP TABLE IF EXISTS "candidate_resume_import_items_warnings" CASCADE;
    DROP TABLE IF EXISTS "candidate_resume_import_items" CASCADE;
    DROP TABLE IF EXISTS "candidate_resume_import_batches" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_candidate_resume_import_items_status";
    DROP TYPE IF EXISTS "public"."enum_candidate_resume_import_batches_status";
  `))
}
