import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'leadRecruiter', 'recruiter');
  CREATE TYPE "public"."enum_candidate_users_role" AS ENUM('candidate');
  CREATE TYPE "public"."enum_candidate_users_onboarding_method" AS ENUM('password', 'magicLink', 'oauth');
  CREATE TYPE "public"."enum_clients_required_documents" AS ENUM('msa', 'nda', 'sow', 'complianceCertificate');
  CREATE TYPE "public"."enum_clients_client_visibility_level" AS ENUM('organization', 'businessUnit');
  CREATE TYPE "public"."enum_clients_company_size" AS ENUM('1-50', '51-200', '201-1000', '1000+');
  CREATE TYPE "public"."enum_clients_status" AS ENUM('active', 'inactive');
  CREATE TYPE "public"."enum_jobs_employment_type" AS ENUM('fullTime', 'partTime', 'contract', 'internship');
  CREATE TYPE "public"."enum_jobs_priority" AS ENUM('low', 'medium', 'high', 'urgent');
  CREATE TYPE "public"."enum_jobs_status" AS ENUM('active', 'onHold', 'closed', 'inactive');
  CREATE TYPE "public"."enum_job_requests_intake_source" AS ENUM('email', 'phone', 'portal', 'manual');
  CREATE TYPE "public"."enum_job_requests_proposed_employment_type" AS ENUM('fullTime', 'partTime', 'contract', 'internship');
  CREATE TYPE "public"."enum_job_requests_priority" AS ENUM('low', 'medium', 'high', 'urgent');
  CREATE TYPE "public"."enum_job_requests_status" AS ENUM('new', 'underReview', 'approved', 'rejected', 'converted', 'duplicateActive', 'reactivated');
  CREATE TYPE "public"."enum_client_lead_assignments_status" AS ENUM('active', 'inactive');
  CREATE TYPE "public"."enum_job_lead_assignments_status" AS ENUM('active', 'inactive');
  CREATE TYPE "public"."enum_recruiter_job_assignments_status" AS ENUM('active', 'inactive');
  CREATE TYPE "public"."enum_candidates_source" AS ENUM('naukri', 'linkedin', 'reference', 'careerPortal', 'walkIn', 'consultancy', 'database', 'other');
  CREATE TYPE "public"."enum_candidate_activities_type" AS ENUM('note', 'task', 'message', 'activity');
  CREATE TYPE "public"."enum_candidate_activities_priority" AS ENUM('low', 'medium', 'high', 'urgent');
  CREATE TYPE "public"."enum_candidate_activities_status" AS ENUM('open', 'inProgress', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_applications_stage" AS ENUM('sourced', 'screened', 'submittedToClient', 'interviewScheduled', 'interviewCleared', 'offerReleased', 'joined', 'rejected');
  CREATE TYPE "public"."enum_application_stage_history_from_stage" AS ENUM('sourced', 'screened', 'submittedToClient', 'interviewScheduled', 'interviewCleared', 'offerReleased', 'joined', 'rejected');
  CREATE TYPE "public"."enum_application_stage_history_to_stage" AS ENUM('sourced', 'screened', 'submittedToClient', 'interviewScheduled', 'interviewCleared', 'offerReleased', 'joined', 'rejected');
  CREATE TYPE "public"."enum_candidate_invites_status" AS ENUM('pending', 'consumed', 'expired', 'revoked');
  CREATE TYPE "public"."enum_job_templates_employment_type" AS ENUM('fullTime', 'partTime', 'contract', 'internship');
  CREATE TYPE "public"."enum_job_templates_priority" AS ENUM('low', 'medium', 'high', 'urgent');
  CREATE TYPE "public"."enum_interviews_interview_round" AS ENUM('screening', 'technicalRound1', 'technicalRound2', 'managerial', 'hr', 'final');
  CREATE TYPE "public"."enum_interviews_mode" AS ENUM('video', 'inPerson', 'phone');
  CREATE TYPE "public"."enum_interviews_status" AS ENUM('scheduled', 'rescheduled', 'completed', 'cancelled', 'noShow');
  CREATE TYPE "public"."enum_placements_placement_type" AS ENUM('recurringRevenue', 'oneTimeRevenue', 'inHouse');
  CREATE TYPE "public"."enum_placements_status" AS ENUM('active', 'inactive', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_employee_profiles_weekly_off_days" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  CREATE TYPE "public"."enum_employee_profiles_employment_status" AS ENUM('active', 'inactive', 'onNotice', 'terminated');
  CREATE TYPE "public"."enum_employee_compensation_tax_regime" AS ENUM('old', 'new');
  CREATE TYPE "public"."enum_attendance_shifts_weekly_off_days" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  CREATE TYPE "public"."enum_holiday_calendars_holidays_type" AS ENUM('national', 'festival', 'company');
  CREATE TYPE "public"."enum_attendance_logs_source" AS ENUM('web', 'mobileWeb');
  CREATE TYPE "public"."enum_attendance_daily_summaries_status" AS ENUM('present', 'absent', 'halfDay', 'leave', 'holiday', 'weekOff');
  CREATE TYPE "public"."enum_leave_types_key" AS ENUM('CL', 'SL', 'EL');
  CREATE TYPE "public"."enum_leave_types_min_unit" AS ENUM('fullDay', 'halfDay');
  CREATE TYPE "public"."enum_leave_requests_workflow_trail_action" AS ENUM('apply', 'leadApprove', 'adminApprove', 'adminOverrideApprove', 'reject', 'cancel');
  CREATE TYPE "public"."enum_leave_requests_workflow_trail_from_status" AS ENUM('pendingLeadApproval', 'pendingAdminApproval', 'approved', 'rejected', 'cancelled');
  CREATE TYPE "public"."enum_leave_requests_workflow_trail_to_status" AS ENUM('pendingLeadApproval', 'pendingAdminApproval', 'approved', 'rejected', 'cancelled');
  CREATE TYPE "public"."enum_leave_requests_leave_unit" AS ENUM('fullDay', 'halfDay');
  CREATE TYPE "public"."enum_leave_requests_status" AS ENUM('pendingLeadApproval', 'pendingAdminApproval', 'approved', 'rejected', 'cancelled');
  CREATE TYPE "public"."enum_performance_cycles_status" AS ENUM('open', 'closed', 'archived');
  CREATE TYPE "public"."enum_performance_reviews_status" AS ENUM('draft', 'submitted', 'finalized');
  CREATE TYPE "public"."enum_payroll_cycles_status" AS ENUM('draft', 'open', 'closed');
  CREATE TYPE "public"."enum_payroll_runs_status" AS ENUM('draft', 'locked', 'approved', 'partiallyPaid', 'disbursing', 'completed', 'failed', 'cancelled');
  CREATE TYPE "public"."enum_payroll_line_items_status" AS ENUM('created', 'processing', 'processed', 'failed', 'reversed', 'cancelled');
  CREATE TYPE "public"."enum_payroll_line_items_payment_status" AS ENUM('pending', 'paid', 'notPaid');
  CREATE TYPE "public"."enum_payroll_line_items_payment_mode" AS ENUM('manual', 'razorpayx');
  CREATE TYPE "public"."enum_payslips_status" AS ENUM('generated', 'published', 'cancelled');
  CREATE TYPE "public"."enum_payroll_payout_transactions_payout_status" AS ENUM('created', 'processing', 'processed', 'failed', 'reversed', 'cancelled');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"full_name" varchar,
  	"role" "enum_users_role" DEFAULT 'recruiter' NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "candidate_users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "candidate_users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"full_name" varchar NOT NULL,
  	"role" "enum_candidate_users_role" DEFAULT 'candidate' NOT NULL,
  	"candidate_profile_id" integer NOT NULL,
  	"is_active" boolean DEFAULT true NOT NULL,
  	"onboarding_method" "enum_candidate_users_onboarding_method" DEFAULT 'password' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "clients_required_documents" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_clients_required_documents",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "clients" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"client_code" varchar,
  	"name" varchar NOT NULL,
  	"logo_id" integer,
  	"contact_person" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"industry" varchar,
  	"category" varchar,
  	"primary_business_unit" varchar,
  	"client_visibility_level" "enum_clients_client_visibility_level" DEFAULT 'organization',
  	"vms_client_name" varchar,
  	"federal_i_d" varchar,
  	"location" varchar,
  	"website" varchar,
  	"company_size" "enum_clients_company_size",
  	"address" varchar,
  	"city" varchar,
  	"state" varchar,
  	"country" varchar DEFAULT 'India',
  	"postal_code" varchar,
  	"fax" varchar,
  	"billing_terms" varchar,
  	"payment_terms" varchar,
  	"practice" varchar,
  	"status" "enum_clients_status" DEFAULT 'active' NOT NULL,
  	"owning_head_recruiter_id" integer,
  	"primary_owner_id" integer,
  	"ownership_id" integer,
  	"client_lead_id" integer,
  	"client_short_name" varchar,
  	"about_company" varchar,
  	"send_requirement" boolean DEFAULT true,
  	"send_hotlist" boolean DEFAULT true,
  	"allow_access_to_all_users" boolean DEFAULT false,
  	"display_on_job" boolean DEFAULT true,
  	"stop_contact_notification" boolean DEFAULT false,
  	"default_job_address" boolean DEFAULT false,
  	"notes" varchar,
  	"normalized_name" varchar,
  	"normalized_email" varchar,
  	"normalized_phone" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "clients_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "jobs_required_skills" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"skill" varchar NOT NULL
  );
  
  CREATE TABLE "jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"job_code" varchar,
  	"client_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"requisition_title" varchar,
  	"business_unit" varchar,
  	"client_job_i_d" varchar,
  	"department" varchar,
  	"employment_type" "enum_jobs_employment_type" NOT NULL,
  	"location" varchar,
  	"client_bill_rate" varchar,
  	"pay_rate" varchar,
  	"pay_type" varchar,
  	"salary_range_label" varchar,
  	"salary_min" numeric,
  	"salary_max" numeric,
  	"experience_min" numeric,
  	"experience_max" numeric,
  	"openings" numeric DEFAULT 1 NOT NULL,
  	"description" varchar NOT NULL,
  	"job_description_file_id" integer,
  	"priority" "enum_jobs_priority" DEFAULT 'medium' NOT NULL,
  	"status" "enum_jobs_status" DEFAULT 'active' NOT NULL,
  	"target_closure_date" timestamp(3) with time zone,
  	"requirement_assigned_on" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"recruitment_manager_id" integer,
  	"primary_recruiter_id" integer,
  	"owning_head_recruiter_id" integer NOT NULL,
  	"source_job_request_id" integer,
  	"dedupe_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "jobs_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "jobs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "job_requests_proposed_required_skills" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"skill" varchar NOT NULL
  );
  
  CREATE TABLE "job_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"job_request_code" varchar,
  	"intake_source" "enum_job_requests_intake_source" DEFAULT 'email' NOT NULL,
  	"subject" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"client_id" integer,
  	"client_name" varchar,
  	"contact_person" varchar,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"proposed_title" varchar,
  	"proposed_department" varchar,
  	"proposed_employment_type" "enum_job_requests_proposed_employment_type",
  	"proposed_location" varchar,
  	"proposed_salary_min" numeric,
  	"proposed_salary_max" numeric,
  	"proposed_experience_min" numeric,
  	"proposed_experience_max" numeric,
  	"proposed_openings" numeric DEFAULT 1,
  	"proposed_description" varchar,
  	"priority" "enum_job_requests_priority" DEFAULT 'medium',
  	"status" "enum_job_requests_status" DEFAULT 'new' NOT NULL,
  	"linked_job_id" integer,
  	"owning_head_recruiter_id" integer,
  	"received_at" timestamp(3) with time zone NOT NULL,
  	"processed_by_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "client_lead_assignments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"client_id" integer NOT NULL,
  	"head_recruiter_id" integer NOT NULL,
  	"lead_recruiter_id" integer NOT NULL,
  	"status" "enum_client_lead_assignments_status" DEFAULT 'active' NOT NULL,
  	"assigned_by_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "job_lead_assignments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"client_id" integer NOT NULL,
  	"job_id" integer NOT NULL,
  	"head_recruiter_id" integer NOT NULL,
  	"lead_recruiter_id" integer NOT NULL,
  	"status" "enum_job_lead_assignments_status" DEFAULT 'active' NOT NULL,
  	"assigned_by_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "recruiter_job_assignments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"job_id" integer NOT NULL,
  	"lead_recruiter_id" integer NOT NULL,
  	"recruiter_id" integer NOT NULL,
  	"status" "enum_recruiter_job_assignments_status" DEFAULT 'active' NOT NULL,
  	"assigned_by_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "candidate_resumes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"source_job_id" integer NOT NULL,
  	"uploaded_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "candidates_education_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"degree" varchar,
  	"institution" varchar,
  	"location" varchar,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone
  );
  
  CREATE TABLE "candidates_certifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"issuer" varchar,
  	"credential_i_d" varchar,
  	"issue_date" timestamp(3) with time zone,
  	"expiry_date" timestamp(3) with time zone
  );
  
  CREATE TABLE "candidates_work_experience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"employer" varchar,
  	"title" varchar,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"is_current" boolean DEFAULT false,
  	"summary" varchar
  );
  
  CREATE TABLE "candidates_employer_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"employer_name" varchar,
  	"contact_name" varchar,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"designation" varchar,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"reason_for_leaving" varchar
  );
  
  CREATE TABLE "candidates_employment_test_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"test_name" varchar,
  	"score" numeric,
  	"max_score" numeric,
  	"result" varchar,
  	"completed_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "candidates_languages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"language" varchar,
  	"can_read" boolean DEFAULT false,
  	"can_write" boolean DEFAULT false,
  	"can_speak" boolean DEFAULT false
  );
  
  CREATE TABLE "candidates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"candidate_code" varchar,
  	"prefix" varchar,
  	"first_name" varchar,
  	"middle_name" varchar,
  	"last_name" varchar,
  	"nick_name" varchar,
  	"full_name" varchar NOT NULL,
  	"email" varchar,
  	"alternate_email" varchar,
  	"phone" varchar,
  	"alternate_phone" varchar,
  	"home_phone" varchar,
  	"work_phone" varchar,
  	"other_phone" varchar,
  	"skype_i_d" varchar,
  	"facebook_profile_u_r_l" varchar,
  	"twitter_profile_u_r_l" varchar,
  	"video_reference" varchar,
  	"current_location" varchar,
  	"city" varchar,
  	"state" varchar,
  	"country" varchar DEFAULT 'India',
  	"postal_code" varchar,
  	"address" varchar,
  	"total_experience_years" numeric,
  	"total_experience_months" numeric,
  	"current_company" varchar,
  	"job_title" varchar,
  	"current_role" varchar,
  	"technology" varchar,
  	"expected_salary" numeric,
  	"expected_pay_min" numeric,
  	"expected_pay_max" numeric,
  	"expected_pay_currency" varchar,
  	"expected_pay_type" varchar,
  	"expected_pay_unit" varchar,
  	"notice_period_days" numeric,
  	"notice_period_label" varchar,
  	"relocation" boolean DEFAULT false,
  	"tax_terms" varchar,
  	"gpa" varchar,
  	"nationality" varchar,
  	"aadhaar_number" varchar,
  	"reference_i_d" varchar,
  	"referred_by" varchar,
  	"applicant_status" varchar,
  	"applicant_group" varchar,
  	"ownership_id" integer,
  	"work_authorization" varchar,
  	"work_authorization_expiry" timestamp(3) with time zone,
  	"clearance" boolean DEFAULT false,
  	"gender" varchar,
  	"race_ethnicity" varchar,
  	"veteran_status" varchar,
  	"disability_status" varchar,
  	"technical_skills_rating" numeric,
  	"communication_skills_rating" numeric,
  	"professionalism_rating" numeric,
  	"overall_rating" numeric,
  	"source" "enum_candidates_source" DEFAULT 'linkedin' NOT NULL,
  	"source_details" varchar,
  	"resume_id" integer,
  	"linked_in_u_r_l" varchar,
  	"portfolio_u_r_l" varchar,
  	"source_job_id" integer NOT NULL,
  	"sourced_by_id" integer,
  	"candidate_account_id" integer,
  	"profile_completed_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"additional_comments" varchar,
  	"normalized_email" varchar,
  	"normalized_phone" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "candidates_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "candidate_activities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"activity_code" varchar,
  	"candidate_id" integer NOT NULL,
  	"application_id" integer,
  	"type" "enum_candidate_activities_type" DEFAULT 'note' NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"priority" "enum_candidate_activities_priority" DEFAULT 'medium' NOT NULL,
  	"status" "enum_candidate_activities_status" DEFAULT 'open' NOT NULL,
  	"action_required" varchar,
  	"due_at" timestamp(3) with time zone,
  	"timezone" varchar DEFAULT 'Asia/Kolkata',
  	"assigned_to_id" integer,
  	"created_by_id" integer,
  	"modified_on" timestamp(3) with time zone,
  	"status_modified_on" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "applications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"application_code" varchar,
  	"candidate_id" integer NOT NULL,
  	"job_id" integer NOT NULL,
  	"recruiter_id" integer NOT NULL,
  	"candidate_account_id" integer,
  	"stage" "enum_applications_stage" DEFAULT 'sourced' NOT NULL,
  	"notes" varchar,
  	"latest_comment" varchar,
  	"pipeline_source" varchar,
  	"submission_type" varchar,
  	"client_bill_rate" varchar,
  	"pay_rate" varchar,
  	"submitted_at" timestamp(3) with time zone,
  	"sourced_at" timestamp(3) with time zone,
  	"screened_at" timestamp(3) with time zone,
  	"submitted_to_client_at" timestamp(3) with time zone,
  	"interview_scheduled_at" timestamp(3) with time zone,
  	"interview_cleared_at" timestamp(3) with time zone,
  	"offer_released_at" timestamp(3) with time zone,
  	"joined_at" timestamp(3) with time zone,
  	"rejected_at" timestamp(3) with time zone,
  	"client_submitted_at" timestamp(3) with time zone,
  	"interview_at" timestamp(3) with time zone,
  	"confirmed_at" timestamp(3) with time zone,
  	"placed_at" timestamp(3) with time zone,
  	"not_joined_at" timestamp(3) with time zone,
  	"reviewed_by_id" integer,
  	"reviewed_at" timestamp(3) with time zone,
  	"candidate_invited_at" timestamp(3) with time zone,
  	"candidate_applied_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "application_stage_history" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"application_id" integer NOT NULL,
  	"candidate_id" integer NOT NULL,
  	"candidate_account_id" integer,
  	"job_id" integer NOT NULL,
  	"recruiter_id" integer NOT NULL,
  	"from_stage" "enum_application_stage_history_from_stage",
  	"to_stage" "enum_application_stage_history_to_stage" NOT NULL,
  	"comment" varchar,
  	"actor_id" integer,
  	"changed_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "candidate_invites" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"candidate_id" integer NOT NULL,
  	"application_id" integer NOT NULL,
  	"invite_email" varchar NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"status" "enum_candidate_invites_status" DEFAULT 'pending' NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"sent_at" timestamp(3) with time zone NOT NULL,
  	"sent_by_id" integer,
  	"consumed_at" timestamp(3) with time zone,
  	"revoked_at" timestamp(3) with time zone,
  	"account_access_sent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "job_templates_required_skills" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"skill" varchar NOT NULL
  );
  
  CREATE TABLE "job_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"template_code" varchar,
  	"template_name" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"requisition_title" varchar,
  	"department" varchar,
  	"business_unit" varchar,
  	"employment_type" "enum_job_templates_employment_type" NOT NULL,
  	"location" varchar,
  	"salary_min" numeric,
  	"salary_max" numeric,
  	"experience_min" numeric,
  	"experience_max" numeric,
  	"openings" numeric DEFAULT 1,
  	"description" varchar NOT NULL,
  	"priority" "enum_job_templates_priority" DEFAULT 'medium' NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"owned_by_lead_recruiter_id" integer,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "job_templates_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "interviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"interview_code" varchar,
  	"application_id" integer NOT NULL,
  	"candidate_id" integer,
  	"job_id" integer,
  	"recruiter_id" integer,
  	"client_id" integer,
  	"interview_round" "enum_interviews_interview_round" DEFAULT 'screening' NOT NULL,
  	"interview_template" varchar,
  	"interviewer_name" varchar NOT NULL,
  	"interviewer_email" varchar,
  	"client_p_o_c" varchar,
  	"mode" "enum_interviews_mode" DEFAULT 'video' NOT NULL,
  	"meeting_link" varchar,
  	"location" varchar,
  	"timezone" varchar DEFAULT 'Asia/Kolkata',
  	"start_time" timestamp(3) with time zone NOT NULL,
  	"end_time" timestamp(3) with time zone NOT NULL,
  	"status" "enum_interviews_status" DEFAULT 'scheduled' NOT NULL,
  	"initiated_by_id" integer,
  	"initiated_on" timestamp(3) with time zone,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "placements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"placement_code" varchar,
  	"application_id" integer NOT NULL,
  	"candidate_id" integer,
  	"job_id" integer,
  	"recruiter_id" integer,
  	"client_id" integer,
  	"placement_type" "enum_placements_placement_type" DEFAULT 'recurringRevenue' NOT NULL,
  	"client_prime_vendor" varchar,
  	"business_unit" varchar,
  	"client_bill_rate" varchar,
  	"pay_rate" varchar,
  	"per_diem_per_hour" varchar,
  	"overhead" varchar,
  	"margin" varchar,
  	"tentative_start_date" timestamp(3) with time zone,
  	"actual_start_date" timestamp(3) with time zone,
  	"actual_end_date" timestamp(3) with time zone,
  	"project_duration_days" numeric,
  	"status" "enum_placements_status" DEFAULT 'active' NOT NULL,
  	"created_by_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "employee_profiles_weekly_off_days" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_employee_profiles_weekly_off_days",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "employee_profiles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"employee_code" varchar,
  	"user_id" integer NOT NULL,
  	"date_of_joining" timestamp(3) with time zone NOT NULL,
  	"employment_status" "enum_employee_profiles_employment_status" DEFAULT 'active' NOT NULL,
  	"designation" varchar NOT NULL,
  	"department" varchar DEFAULT 'Recruitment',
  	"work_location" varchar NOT NULL,
  	"work_state" varchar DEFAULT 'Karnataka' NOT NULL,
  	"work_country" varchar DEFAULT 'India',
  	"reporting_manager_id" integer,
  	"attendance_shift_id" integer,
  	"holiday_calendar_id" integer,
  	"is_payroll_eligible" boolean DEFAULT true,
  	"payout_ready" boolean DEFAULT false,
  	"pan_number" varchar,
  	"aadhaar_number" varchar,
  	"uan_number" varchar,
  	"esic_number" varchar,
  	"bank_account_name" varchar,
  	"bank_account_number" varchar,
  	"bank_i_f_s_c" varchar,
  	"bank_name" varchar,
  	"razorpay_contact_i_d" varchar,
  	"razorpay_fund_account_i_d" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "employee_compensation_custom_earnings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"amount" numeric NOT NULL
  );
  
  CREATE TABLE "employee_compensation_custom_deductions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"amount" numeric NOT NULL
  );
  
  CREATE TABLE "employee_compensation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"compensation_code" varchar,
  	"employee_id" integer NOT NULL,
  	"effective_from" timestamp(3) with time zone NOT NULL,
  	"effective_to" timestamp(3) with time zone,
  	"annual_c_t_c" numeric NOT NULL,
  	"monthly_gross" numeric NOT NULL,
  	"basic_monthly" numeric NOT NULL,
  	"hra_monthly" numeric DEFAULT 0,
  	"special_allowance_monthly" numeric DEFAULT 0,
  	"other_allowance_monthly" numeric DEFAULT 0,
  	"variable_monthly" numeric DEFAULT 0,
  	"reimbursement_monthly" numeric DEFAULT 0,
  	"tax_regime" "enum_employee_compensation_tax_regime" DEFAULT 'new' NOT NULL,
  	"pf_enabled" boolean DEFAULT true,
  	"esi_enabled" boolean DEFAULT false,
  	"professional_tax_enabled" boolean DEFAULT true,
  	"lwf_enabled" boolean DEFAULT false,
  	"tds_enabled" boolean DEFAULT true,
  	"is_active" boolean DEFAULT true,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attendance_shifts_weekly_off_days" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_attendance_shifts_weekly_off_days",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "attendance_shifts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"shift_code" varchar,
  	"name" varchar NOT NULL,
  	"shift_start_time" varchar DEFAULT '09:30' NOT NULL,
  	"shift_end_time" varchar DEFAULT '18:30' NOT NULL,
  	"grace_minutes" numeric DEFAULT 15 NOT NULL,
  	"half_day_threshold_minutes" numeric DEFAULT 240 NOT NULL,
  	"full_day_threshold_minutes" numeric DEFAULT 480 NOT NULL,
  	"overtime_threshold_minutes" numeric DEFAULT 540 NOT NULL,
  	"is_default" boolean DEFAULT false,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "holiday_calendars_holidays" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"type" "enum_holiday_calendars_holidays_type" DEFAULT 'national' NOT NULL
  );
  
  CREATE TABLE "holiday_calendars" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"calendar_code" varchar,
  	"name" varchar NOT NULL,
  	"state" varchar DEFAULT 'Karnataka' NOT NULL,
  	"year" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attendance_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"attendance_log_code" varchar,
  	"employee_id" integer NOT NULL,
  	"punch_date" timestamp(3) with time zone NOT NULL,
  	"punch_in_at" timestamp(3) with time zone NOT NULL,
  	"punch_out_at" timestamp(3) with time zone,
  	"source" "enum_attendance_logs_source" DEFAULT 'web' NOT NULL,
  	"ip_address" varchar,
  	"device_info" varchar,
  	"geo_latitude" numeric,
  	"geo_longitude" numeric,
  	"worked_minutes" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attendance_logs_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "attendance_daily_summaries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"summary_code" varchar,
  	"employee_id" integer NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"status" "enum_attendance_daily_summaries_status" DEFAULT 'absent' NOT NULL,
  	"worked_minutes" numeric DEFAULT 0,
  	"late_minutes" numeric DEFAULT 0,
  	"overtime_minutes" numeric DEFAULT 0,
  	"lop" boolean DEFAULT false,
  	"holiday_name" varchar,
  	"attendance_log_id" integer,
  	"leave_request_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "leave_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"leave_type_code" varchar,
  	"key" "enum_leave_types_key" NOT NULL,
  	"name" varchar NOT NULL,
  	"paid" boolean DEFAULT true,
  	"accrual_per_month" numeric DEFAULT 1 NOT NULL,
  	"annual_allowance" numeric DEFAULT 12 NOT NULL,
  	"carry_forward_limit" numeric DEFAULT 0 NOT NULL,
  	"is_encashable" boolean DEFAULT false,
  	"min_unit" "enum_leave_types_min_unit" DEFAULT 'fullDay' NOT NULL,
  	"max_consecutive_days" numeric DEFAULT 15 NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "leave_balances" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"balance_code" varchar,
  	"employee_id" integer NOT NULL,
  	"leave_type_id" integer NOT NULL,
  	"year" numeric NOT NULL,
  	"opening_balance" numeric DEFAULT 0 NOT NULL,
  	"accrued" numeric DEFAULT 0 NOT NULL,
  	"used" numeric DEFAULT 0 NOT NULL,
  	"adjustments" numeric DEFAULT 0 NOT NULL,
  	"closing_balance" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "leave_requests_workflow_trail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"action" "enum_leave_requests_workflow_trail_action" NOT NULL,
  	"from_status" "enum_leave_requests_workflow_trail_from_status",
  	"to_status" "enum_leave_requests_workflow_trail_to_status" NOT NULL,
  	"comment" varchar,
  	"override_reason" varchar,
  	"acted_by_id" integer,
  	"acted_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "leave_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"leave_request_code" varchar,
  	"employee_id" integer NOT NULL,
  	"employee_role" varchar,
  	"leave_type_id" integer NOT NULL,
  	"leave_unit" "enum_leave_requests_leave_unit" DEFAULT 'fullDay' NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone NOT NULL,
  	"total_days" numeric NOT NULL,
  	"reason" varchar NOT NULL,
  	"status" "enum_leave_requests_status" DEFAULT 'pendingLeadApproval' NOT NULL,
  	"requested_by_id" integer,
  	"lead_approver_id" integer,
  	"admin_approver_id" integer,
  	"lead_decision_at" timestamp(3) with time zone,
  	"admin_decision_at" timestamp(3) with time zone,
  	"rejection_reason" varchar,
  	"comments" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "performance_cycles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"cycle_code" varchar,
  	"title" varchar NOT NULL,
  	"month" numeric NOT NULL,
  	"year" numeric NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone NOT NULL,
  	"kpi_weight" numeric DEFAULT 70 NOT NULL,
  	"manager_weight" numeric DEFAULT 30 NOT NULL,
  	"status" "enum_performance_cycles_status" DEFAULT 'open' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "performance_snapshots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"snapshot_code" varchar,
  	"cycle_id" integer NOT NULL,
  	"employee_id" integer NOT NULL,
  	"generated_by_id" integer,
  	"generated_at" timestamp(3) with time zone,
  	"submissions_count" numeric DEFAULT 0,
  	"approvals_count" numeric DEFAULT 0,
  	"rejection_count" numeric DEFAULT 0,
  	"interview_count" numeric DEFAULT 0,
  	"placement_count" numeric DEFAULT 0,
  	"avg_turnaround_hours" numeric DEFAULT 0,
  	"sla_breaches_count" numeric DEFAULT 0,
  	"kpi_score" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "performance_reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"review_code" varchar,
  	"cycle_id" integer NOT NULL,
  	"employee_id" integer NOT NULL,
  	"reviewer_id" integer NOT NULL,
  	"manager_rating" numeric NOT NULL,
  	"manager_comments" varchar,
  	"kpi_score" numeric,
  	"final_score" numeric,
  	"status" "enum_performance_reviews_status" DEFAULT 'draft' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payroll_rule_sets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"rule_set_code" varchar,
  	"name" varchar NOT NULL,
  	"state" varchar DEFAULT 'Karnataka' NOT NULL,
  	"effective_from" timestamp(3) with time zone NOT NULL,
  	"effective_to" timestamp(3) with time zone,
  	"is_active" boolean DEFAULT true,
  	"pf_enabled" boolean DEFAULT true,
  	"pf_employee_rate" numeric DEFAULT 12,
  	"pf_employer_rate" numeric DEFAULT 12,
  	"pf_wage_cap" numeric DEFAULT 15000,
  	"esi_enabled" boolean DEFAULT true,
  	"esi_employee_rate" numeric DEFAULT 0.75,
  	"esi_employer_rate" numeric DEFAULT 3.25,
  	"esi_wage_threshold" numeric DEFAULT 21000,
  	"professional_tax_enabled" boolean DEFAULT true,
  	"professional_tax_monthly" numeric DEFAULT 200,
  	"lwf_enabled" boolean DEFAULT false,
  	"lwf_employee_monthly" numeric DEFAULT 20,
  	"lwf_employer_monthly" numeric DEFAULT 40,
  	"tds_enabled" boolean DEFAULT true,
  	"tds_rate" numeric DEFAULT 0,
  	"standard_deduction_monthly" numeric DEFAULT 0,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payroll_cycles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"payroll_cycle_code" varchar,
  	"title" varchar,
  	"month" numeric NOT NULL,
  	"year" numeric NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone NOT NULL,
  	"payout_date" timestamp(3) with time zone,
  	"status" "enum_payroll_cycles_status" DEFAULT 'open' NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payroll_runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"payroll_run_code" varchar,
  	"payroll_cycle_id" integer NOT NULL,
  	"rule_set_id" integer,
  	"status" "enum_payroll_runs_status" DEFAULT 'draft' NOT NULL,
  	"prepared_by_id" integer,
  	"prepared_at" timestamp(3) with time zone,
  	"approved_by_id" integer,
  	"approved_at" timestamp(3) with time zone,
  	"disbursed_by_id" integer,
  	"disbursed_at" timestamp(3) with time zone,
  	"total_employees" numeric DEFAULT 0,
  	"total_gross" numeric DEFAULT 0,
  	"total_deductions" numeric DEFAULT 0,
  	"total_net" numeric DEFAULT 0,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payroll_line_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"payroll_line_item_code" varchar,
  	"payroll_run_id" integer NOT NULL,
  	"employee_id" integer NOT NULL,
  	"compensation_id" integer,
  	"gross_earnings" numeric NOT NULL,
  	"total_deductions" numeric NOT NULL,
  	"net_payable" numeric NOT NULL,
  	"lop_days" numeric DEFAULT 0,
  	"lop_deduction" numeric DEFAULT 0,
  	"pf_employee" numeric DEFAULT 0,
  	"pf_employer" numeric DEFAULT 0,
  	"esi_employee" numeric DEFAULT 0,
  	"esi_employer" numeric DEFAULT 0,
  	"professional_tax" numeric DEFAULT 0,
  	"lwf_employee" numeric DEFAULT 0,
  	"lwf_employer" numeric DEFAULT 0,
  	"tds" numeric DEFAULT 0,
  	"reimbursement_total" numeric DEFAULT 0,
  	"custom_earnings_total" numeric DEFAULT 0,
  	"custom_deductions_total" numeric DEFAULT 0,
  	"earnings_breakdown" jsonb,
  	"deductions_breakdown" jsonb,
  	"status" "enum_payroll_line_items_status" DEFAULT 'created' NOT NULL,
  	"payment_status" "enum_payroll_line_items_payment_status" DEFAULT 'pending' NOT NULL,
  	"payment_mode" "enum_payroll_line_items_payment_mode" DEFAULT 'manual' NOT NULL,
  	"paid_at" timestamp(3) with time zone,
  	"paid_by_id" integer,
  	"payment_reference" varchar,
  	"payment_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payslips" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"payslip_code" varchar,
  	"employee_id" integer NOT NULL,
  	"payroll_run_id" integer NOT NULL,
  	"payroll_line_item_id" integer,
  	"month" numeric NOT NULL,
  	"year" numeric NOT NULL,
  	"issue_date" timestamp(3) with time zone NOT NULL,
  	"pdf_u_r_l" varchar,
  	"snapshot" jsonb,
  	"status" "enum_payslips_status" DEFAULT 'generated' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payroll_payout_transactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"payout_txn_code" varchar,
  	"payroll_run_id" integer NOT NULL,
  	"line_item_id" integer NOT NULL,
  	"employee_id" integer NOT NULL,
  	"provider" varchar DEFAULT 'razorpayx',
  	"payout_status" "enum_payroll_payout_transactions_payout_status" DEFAULT 'created' NOT NULL,
  	"payout_i_d" varchar,
  	"idempotency_key" varchar NOT NULL,
  	"attempt_count" numeric DEFAULT 0 NOT NULL,
  	"utr" varchar,
  	"response_log" jsonb,
  	"error_message" varchar,
  	"webhook_event_i_d" varchar,
  	"initiated_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"candidate_users_id" integer,
  	"clients_id" integer,
  	"jobs_id" integer,
  	"job_requests_id" integer,
  	"client_lead_assignments_id" integer,
  	"job_lead_assignments_id" integer,
  	"recruiter_job_assignments_id" integer,
  	"candidate_resumes_id" integer,
  	"candidates_id" integer,
  	"candidate_activities_id" integer,
  	"applications_id" integer,
  	"application_stage_history_id" integer,
  	"candidate_invites_id" integer,
  	"job_templates_id" integer,
  	"interviews_id" integer,
  	"placements_id" integer,
  	"employee_profiles_id" integer,
  	"employee_compensation_id" integer,
  	"attendance_shifts_id" integer,
  	"holiday_calendars_id" integer,
  	"attendance_logs_id" integer,
  	"attendance_daily_summaries_id" integer,
  	"leave_types_id" integer,
  	"leave_balances_id" integer,
  	"leave_requests_id" integer,
  	"performance_cycles_id" integer,
  	"performance_snapshots_id" integer,
  	"performance_reviews_id" integer,
  	"payroll_rule_sets_id" integer,
  	"payroll_cycles_id" integer,
  	"payroll_runs_id" integer,
  	"payroll_line_items_id" integer,
  	"payslips_id" integer,
  	"payroll_payout_transactions_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"candidate_users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "candidate_users_sessions" ADD CONSTRAINT "candidate_users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."candidate_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "candidate_users" ADD CONSTRAINT "candidate_users_candidate_profile_id_candidates_id_fk" FOREIGN KEY ("candidate_profile_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clients_required_documents" ADD CONSTRAINT "clients_required_documents_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clients" ADD CONSTRAINT "clients_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clients" ADD CONSTRAINT "clients_owning_head_recruiter_id_users_id_fk" FOREIGN KEY ("owning_head_recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clients" ADD CONSTRAINT "clients_primary_owner_id_users_id_fk" FOREIGN KEY ("primary_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clients" ADD CONSTRAINT "clients_ownership_id_users_id_fk" FOREIGN KEY ("ownership_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clients" ADD CONSTRAINT "clients_client_lead_id_users_id_fk" FOREIGN KEY ("client_lead_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clients_texts" ADD CONSTRAINT "clients_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "jobs_required_skills" ADD CONSTRAINT "jobs_required_skills_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_job_description_file_id_media_id_fk" FOREIGN KEY ("job_description_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recruitment_manager_id_users_id_fk" FOREIGN KEY ("recruitment_manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_primary_recruiter_id_users_id_fk" FOREIGN KEY ("primary_recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_owning_head_recruiter_id_users_id_fk" FOREIGN KEY ("owning_head_recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "jobs" ADD CONSTRAINT "jobs_source_job_request_id_job_requests_id_fk" FOREIGN KEY ("source_job_request_id") REFERENCES "public"."job_requests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "jobs_texts" ADD CONSTRAINT "jobs_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "jobs_rels" ADD CONSTRAINT "jobs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "jobs_rels" ADD CONSTRAINT "jobs_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "job_requests_proposed_required_skills" ADD CONSTRAINT "job_requests_proposed_required_skills_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."job_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_linked_job_id_jobs_id_fk" FOREIGN KEY ("linked_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_owning_head_recruiter_id_users_id_fk" FOREIGN KEY ("owning_head_recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_processed_by_id_users_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "client_lead_assignments" ADD CONSTRAINT "client_lead_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "client_lead_assignments" ADD CONSTRAINT "client_lead_assignments_head_recruiter_id_users_id_fk" FOREIGN KEY ("head_recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "client_lead_assignments" ADD CONSTRAINT "client_lead_assignments_lead_recruiter_id_users_id_fk" FOREIGN KEY ("lead_recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "client_lead_assignments" ADD CONSTRAINT "client_lead_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "job_lead_assignments" ADD CONSTRAINT "job_lead_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "job_lead_assignments" ADD CONSTRAINT "job_lead_assignments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "job_lead_assignments" ADD CONSTRAINT "job_lead_assignments_head_recruiter_id_users_id_fk" FOREIGN KEY ("head_recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "job_lead_assignments" ADD CONSTRAINT "job_lead_assignments_lead_recruiter_id_users_id_fk" FOREIGN KEY ("lead_recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "job_lead_assignments" ADD CONSTRAINT "job_lead_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recruiter_job_assignments" ADD CONSTRAINT "recruiter_job_assignments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recruiter_job_assignments" ADD CONSTRAINT "recruiter_job_assignments_lead_recruiter_id_users_id_fk" FOREIGN KEY ("lead_recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recruiter_job_assignments" ADD CONSTRAINT "recruiter_job_assignments_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recruiter_job_assignments" ADD CONSTRAINT "recruiter_job_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidate_resumes" ADD CONSTRAINT "candidate_resumes_source_job_id_jobs_id_fk" FOREIGN KEY ("source_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidate_resumes" ADD CONSTRAINT "candidate_resumes_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidates_education_details" ADD CONSTRAINT "candidates_education_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "candidates_certifications" ADD CONSTRAINT "candidates_certifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "candidates_work_experience" ADD CONSTRAINT "candidates_work_experience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "candidates_employer_details" ADD CONSTRAINT "candidates_employer_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "candidates_employment_test_results" ADD CONSTRAINT "candidates_employment_test_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "candidates_languages" ADD CONSTRAINT "candidates_languages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "candidates" ADD CONSTRAINT "candidates_ownership_id_users_id_fk" FOREIGN KEY ("ownership_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidates" ADD CONSTRAINT "candidates_resume_id_candidate_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."candidate_resumes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidates" ADD CONSTRAINT "candidates_source_job_id_jobs_id_fk" FOREIGN KEY ("source_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidates" ADD CONSTRAINT "candidates_sourced_by_id_users_id_fk" FOREIGN KEY ("sourced_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidates" ADD CONSTRAINT "candidates_candidate_account_id_candidate_users_id_fk" FOREIGN KEY ("candidate_account_id") REFERENCES "public"."candidate_users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidates_texts" ADD CONSTRAINT "candidates_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "candidate_activities" ADD CONSTRAINT "candidate_activities_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidate_activities" ADD CONSTRAINT "candidate_activities_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidate_activities" ADD CONSTRAINT "candidate_activities_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidate_activities" ADD CONSTRAINT "candidate_activities_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_account_id_candidate_users_id_fk" FOREIGN KEY ("candidate_account_id") REFERENCES "public"."candidate_users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_candidate_account_id_candidate_users_id_fk" FOREIGN KEY ("candidate_account_id") REFERENCES "public"."candidate_users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidate_invites" ADD CONSTRAINT "candidate_invites_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidate_invites" ADD CONSTRAINT "candidate_invites_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "candidate_invites" ADD CONSTRAINT "candidate_invites_sent_by_id_users_id_fk" FOREIGN KEY ("sent_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "job_templates_required_skills" ADD CONSTRAINT "job_templates_required_skills_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."job_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "job_templates" ADD CONSTRAINT "job_templates_owned_by_lead_recruiter_id_users_id_fk" FOREIGN KEY ("owned_by_lead_recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "job_templates" ADD CONSTRAINT "job_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "job_templates_texts" ADD CONSTRAINT "job_templates_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."job_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "interviews" ADD CONSTRAINT "interviews_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "interviews" ADD CONSTRAINT "interviews_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "interviews" ADD CONSTRAINT "interviews_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "interviews" ADD CONSTRAINT "interviews_initiated_by_id_users_id_fk" FOREIGN KEY ("initiated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "placements" ADD CONSTRAINT "placements_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "placements" ADD CONSTRAINT "placements_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "placements" ADD CONSTRAINT "placements_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "placements" ADD CONSTRAINT "placements_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "placements" ADD CONSTRAINT "placements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "placements" ADD CONSTRAINT "placements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "employee_profiles_weekly_off_days" ADD CONSTRAINT "employee_profiles_weekly_off_days_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."employee_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_reporting_manager_id_users_id_fk" FOREIGN KEY ("reporting_manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_attendance_shift_id_attendance_shifts_id_fk" FOREIGN KEY ("attendance_shift_id") REFERENCES "public"."attendance_shifts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_holiday_calendar_id_holiday_calendars_id_fk" FOREIGN KEY ("holiday_calendar_id") REFERENCES "public"."holiday_calendars"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "employee_compensation_custom_earnings" ADD CONSTRAINT "employee_compensation_custom_earnings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."employee_compensation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "employee_compensation_custom_deductions" ADD CONSTRAINT "employee_compensation_custom_deductions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."employee_compensation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "employee_compensation" ADD CONSTRAINT "employee_compensation_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance_shifts_weekly_off_days" ADD CONSTRAINT "attendance_shifts_weekly_off_days_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."attendance_shifts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "holiday_calendars_holidays" ADD CONSTRAINT "holiday_calendars_holidays_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."holiday_calendars"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance_logs_texts" ADD CONSTRAINT "attendance_logs_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."attendance_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attendance_daily_summaries" ADD CONSTRAINT "attendance_daily_summaries_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance_daily_summaries" ADD CONSTRAINT "attendance_daily_summaries_attendance_log_id_attendance_logs_id_fk" FOREIGN KEY ("attendance_log_id") REFERENCES "public"."attendance_logs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance_daily_summaries" ADD CONSTRAINT "attendance_daily_summaries_leave_request_id_leave_requests_id_fk" FOREIGN KEY ("leave_request_id") REFERENCES "public"."leave_requests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leave_requests_workflow_trail" ADD CONSTRAINT "leave_requests_workflow_trail_acted_by_id_users_id_fk" FOREIGN KEY ("acted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leave_requests_workflow_trail" ADD CONSTRAINT "leave_requests_workflow_trail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."leave_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_lead_approver_id_users_id_fk" FOREIGN KEY ("lead_approver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_admin_approver_id_users_id_fk" FOREIGN KEY ("admin_approver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "performance_snapshots" ADD CONSTRAINT "performance_snapshots_cycle_id_performance_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."performance_cycles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "performance_snapshots" ADD CONSTRAINT "performance_snapshots_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "performance_snapshots" ADD CONSTRAINT "performance_snapshots_generated_by_id_users_id_fk" FOREIGN KEY ("generated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_cycle_id_performance_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."performance_cycles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_payroll_cycle_id_payroll_cycles_id_fk" FOREIGN KEY ("payroll_cycle_id") REFERENCES "public"."payroll_cycles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_rule_set_id_payroll_rule_sets_id_fk" FOREIGN KEY ("rule_set_id") REFERENCES "public"."payroll_rule_sets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_prepared_by_id_users_id_fk" FOREIGN KEY ("prepared_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_disbursed_by_id_users_id_fk" FOREIGN KEY ("disbursed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_compensation_id_employee_compensation_id_fk" FOREIGN KEY ("compensation_id") REFERENCES "public"."employee_compensation"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_paid_by_id_users_id_fk" FOREIGN KEY ("paid_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_line_item_id_payroll_line_items_id_fk" FOREIGN KEY ("payroll_line_item_id") REFERENCES "public"."payroll_line_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_payout_transactions" ADD CONSTRAINT "payroll_payout_transactions_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_payout_transactions" ADD CONSTRAINT "payroll_payout_transactions_line_item_id_payroll_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."payroll_line_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payroll_payout_transactions" ADD CONSTRAINT "payroll_payout_transactions_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_candidate_users_fk" FOREIGN KEY ("candidate_users_id") REFERENCES "public"."candidate_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_clients_fk" FOREIGN KEY ("clients_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_jobs_fk" FOREIGN KEY ("jobs_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_job_requests_fk" FOREIGN KEY ("job_requests_id") REFERENCES "public"."job_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_client_lead_assignments_fk" FOREIGN KEY ("client_lead_assignments_id") REFERENCES "public"."client_lead_assignments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_job_lead_assignments_fk" FOREIGN KEY ("job_lead_assignments_id") REFERENCES "public"."job_lead_assignments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_recruiter_job_assignments_fk" FOREIGN KEY ("recruiter_job_assignments_id") REFERENCES "public"."recruiter_job_assignments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_candidate_resumes_fk" FOREIGN KEY ("candidate_resumes_id") REFERENCES "public"."candidate_resumes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_candidates_fk" FOREIGN KEY ("candidates_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_candidate_activities_fk" FOREIGN KEY ("candidate_activities_id") REFERENCES "public"."candidate_activities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_applications_fk" FOREIGN KEY ("applications_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_application_stage_history_fk" FOREIGN KEY ("application_stage_history_id") REFERENCES "public"."application_stage_history"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_candidate_invites_fk" FOREIGN KEY ("candidate_invites_id") REFERENCES "public"."candidate_invites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_job_templates_fk" FOREIGN KEY ("job_templates_id") REFERENCES "public"."job_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_interviews_fk" FOREIGN KEY ("interviews_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_placements_fk" FOREIGN KEY ("placements_id") REFERENCES "public"."placements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_employee_profiles_fk" FOREIGN KEY ("employee_profiles_id") REFERENCES "public"."employee_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_employee_compensation_fk" FOREIGN KEY ("employee_compensation_id") REFERENCES "public"."employee_compensation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attendance_shifts_fk" FOREIGN KEY ("attendance_shifts_id") REFERENCES "public"."attendance_shifts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_holiday_calendars_fk" FOREIGN KEY ("holiday_calendars_id") REFERENCES "public"."holiday_calendars"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attendance_logs_fk" FOREIGN KEY ("attendance_logs_id") REFERENCES "public"."attendance_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attendance_daily_summaries_fk" FOREIGN KEY ("attendance_daily_summaries_id") REFERENCES "public"."attendance_daily_summaries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leave_types_fk" FOREIGN KEY ("leave_types_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leave_balances_fk" FOREIGN KEY ("leave_balances_id") REFERENCES "public"."leave_balances"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leave_requests_fk" FOREIGN KEY ("leave_requests_id") REFERENCES "public"."leave_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_performance_cycles_fk" FOREIGN KEY ("performance_cycles_id") REFERENCES "public"."performance_cycles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_performance_snapshots_fk" FOREIGN KEY ("performance_snapshots_id") REFERENCES "public"."performance_snapshots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_performance_reviews_fk" FOREIGN KEY ("performance_reviews_id") REFERENCES "public"."performance_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payroll_rule_sets_fk" FOREIGN KEY ("payroll_rule_sets_id") REFERENCES "public"."payroll_rule_sets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payroll_cycles_fk" FOREIGN KEY ("payroll_cycles_id") REFERENCES "public"."payroll_cycles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payroll_runs_fk" FOREIGN KEY ("payroll_runs_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payroll_line_items_fk" FOREIGN KEY ("payroll_line_items_id") REFERENCES "public"."payroll_line_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payslips_fk" FOREIGN KEY ("payslips_id") REFERENCES "public"."payslips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payroll_payout_transactions_fk" FOREIGN KEY ("payroll_payout_transactions_id") REFERENCES "public"."payroll_payout_transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_candidate_users_fk" FOREIGN KEY ("candidate_users_id") REFERENCES "public"."candidate_users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_full_name_idx" ON "users" USING btree ("full_name");
  CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "role_isActive_fullName_idx" ON "users" USING btree ("role","is_active","full_name");
  CREATE INDEX "candidate_users_sessions_order_idx" ON "candidate_users_sessions" USING btree ("_order");
  CREATE INDEX "candidate_users_sessions_parent_id_idx" ON "candidate_users_sessions" USING btree ("_parent_id");
  CREATE INDEX "candidate_users_full_name_idx" ON "candidate_users" USING btree ("full_name");
  CREATE UNIQUE INDEX "candidate_users_candidate_profile_idx" ON "candidate_users" USING btree ("candidate_profile_id");
  CREATE INDEX "candidate_users_is_active_idx" ON "candidate_users" USING btree ("is_active");
  CREATE INDEX "candidate_users_updated_at_idx" ON "candidate_users" USING btree ("updated_at");
  CREATE INDEX "candidate_users_created_at_idx" ON "candidate_users" USING btree ("created_at");
  CREATE UNIQUE INDEX "candidate_users_email_idx" ON "candidate_users" USING btree ("email");
  CREATE INDEX "clients_required_documents_order_idx" ON "clients_required_documents" USING btree ("order");
  CREATE INDEX "clients_required_documents_parent_idx" ON "clients_required_documents" USING btree ("parent_id");
  CREATE UNIQUE INDEX "clients_client_code_idx" ON "clients" USING btree ("client_code");
  CREATE INDEX "clients_name_idx" ON "clients" USING btree ("name");
  CREATE INDEX "clients_logo_idx" ON "clients" USING btree ("logo_id");
  CREATE INDEX "clients_contact_person_idx" ON "clients" USING btree ("contact_person");
  CREATE INDEX "clients_email_idx" ON "clients" USING btree ("email");
  CREATE INDEX "clients_phone_idx" ON "clients" USING btree ("phone");
  CREATE INDEX "clients_location_idx" ON "clients" USING btree ("location");
  CREATE INDEX "clients_status_idx" ON "clients" USING btree ("status");
  CREATE INDEX "clients_owning_head_recruiter_idx" ON "clients" USING btree ("owning_head_recruiter_id");
  CREATE INDEX "clients_primary_owner_idx" ON "clients" USING btree ("primary_owner_id");
  CREATE INDEX "clients_ownership_idx" ON "clients" USING btree ("ownership_id");
  CREATE INDEX "clients_client_lead_idx" ON "clients" USING btree ("client_lead_id");
  CREATE UNIQUE INDEX "clients_normalized_name_idx" ON "clients" USING btree ("normalized_name");
  CREATE UNIQUE INDEX "clients_normalized_email_idx" ON "clients" USING btree ("normalized_email");
  CREATE UNIQUE INDEX "clients_normalized_phone_idx" ON "clients" USING btree ("normalized_phone");
  CREATE INDEX "clients_updated_at_idx" ON "clients" USING btree ("updated_at");
  CREATE INDEX "clients_created_at_idx" ON "clients" USING btree ("created_at");
  CREATE UNIQUE INDEX "clientCode_idx" ON "clients" USING btree ("client_code");
  CREATE UNIQUE INDEX "normalizedName_idx" ON "clients" USING btree ("normalized_name");
  CREATE INDEX "status_updatedAt_idx" ON "clients" USING btree ("status","updated_at");
  CREATE INDEX "owningHeadRecruiter_status_idx" ON "clients" USING btree ("owning_head_recruiter_id","status");
  CREATE INDEX "clientLead_status_idx" ON "clients" USING btree ("client_lead_id","status");
  CREATE INDEX "primaryOwner_status_idx" ON "clients" USING btree ("primary_owner_id","status");
  CREATE INDEX "ownership_status_idx" ON "clients" USING btree ("ownership_id","status");
  CREATE INDEX "clients_texts_order_parent" ON "clients_texts" USING btree ("order","parent_id");
  CREATE INDEX "jobs_required_skills_order_idx" ON "jobs_required_skills" USING btree ("_order");
  CREATE INDEX "jobs_required_skills_parent_id_idx" ON "jobs_required_skills" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "jobs_job_code_idx" ON "jobs" USING btree ("job_code");
  CREATE INDEX "jobs_client_idx" ON "jobs" USING btree ("client_id");
  CREATE INDEX "jobs_title_idx" ON "jobs" USING btree ("title");
  CREATE INDEX "jobs_requisition_title_idx" ON "jobs" USING btree ("requisition_title");
  CREATE INDEX "jobs_business_unit_idx" ON "jobs" USING btree ("business_unit");
  CREATE INDEX "jobs_client_job_i_d_idx" ON "jobs" USING btree ("client_job_i_d");
  CREATE INDEX "jobs_department_idx" ON "jobs" USING btree ("department");
  CREATE INDEX "jobs_employment_type_idx" ON "jobs" USING btree ("employment_type");
  CREATE INDEX "jobs_job_description_file_idx" ON "jobs" USING btree ("job_description_file_id");
  CREATE INDEX "jobs_priority_idx" ON "jobs" USING btree ("priority");
  CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");
  CREATE INDEX "jobs_created_by_idx" ON "jobs" USING btree ("created_by_id");
  CREATE INDEX "jobs_recruitment_manager_idx" ON "jobs" USING btree ("recruitment_manager_id");
  CREATE INDEX "jobs_primary_recruiter_idx" ON "jobs" USING btree ("primary_recruiter_id");
  CREATE INDEX "jobs_owning_head_recruiter_idx" ON "jobs" USING btree ("owning_head_recruiter_id");
  CREATE INDEX "jobs_source_job_request_idx" ON "jobs" USING btree ("source_job_request_id");
  CREATE INDEX "jobs_dedupe_key_idx" ON "jobs" USING btree ("dedupe_key");
  CREATE INDEX "jobs_updated_at_idx" ON "jobs" USING btree ("updated_at");
  CREATE INDEX "jobs_created_at_idx" ON "jobs" USING btree ("created_at");
  CREATE UNIQUE INDEX "jobCode_idx" ON "jobs" USING btree ("job_code");
  CREATE INDEX "client_dedupeKey_idx" ON "jobs" USING btree ("client_id","dedupe_key");
  CREATE INDEX "status_priority_idx" ON "jobs" USING btree ("status","priority");
  CREATE INDEX "status_updatedAt_1_idx" ON "jobs" USING btree ("status","updated_at");
  CREATE INDEX "owningHeadRecruiter_status_updatedAt_idx" ON "jobs" USING btree ("owning_head_recruiter_id","status","updated_at");
  CREATE INDEX "client_status_updatedAt_idx" ON "jobs" USING btree ("client_id","status","updated_at");
  CREATE INDEX "createdBy_createdAt_idx" ON "jobs" USING btree ("created_by_id","created_at");
  CREATE INDEX "jobs_texts_order_parent" ON "jobs_texts" USING btree ("order","parent_id");
  CREATE INDEX "jobs_rels_order_idx" ON "jobs_rels" USING btree ("order");
  CREATE INDEX "jobs_rels_parent_idx" ON "jobs_rels" USING btree ("parent_id");
  CREATE INDEX "jobs_rels_path_idx" ON "jobs_rels" USING btree ("path");
  CREATE INDEX "jobs_rels_users_id_idx" ON "jobs_rels" USING btree ("users_id");
  CREATE INDEX "job_requests_proposed_required_skills_order_idx" ON "job_requests_proposed_required_skills" USING btree ("_order");
  CREATE INDEX "job_requests_proposed_required_skills_parent_id_idx" ON "job_requests_proposed_required_skills" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "job_requests_job_request_code_idx" ON "job_requests" USING btree ("job_request_code");
  CREATE INDEX "job_requests_intake_source_idx" ON "job_requests" USING btree ("intake_source");
  CREATE INDEX "job_requests_subject_idx" ON "job_requests" USING btree ("subject");
  CREATE INDEX "job_requests_client_idx" ON "job_requests" USING btree ("client_id");
  CREATE INDEX "job_requests_status_idx" ON "job_requests" USING btree ("status");
  CREATE INDEX "job_requests_linked_job_idx" ON "job_requests" USING btree ("linked_job_id");
  CREATE INDEX "job_requests_owning_head_recruiter_idx" ON "job_requests" USING btree ("owning_head_recruiter_id");
  CREATE INDEX "job_requests_received_at_idx" ON "job_requests" USING btree ("received_at");
  CREATE INDEX "job_requests_processed_by_idx" ON "job_requests" USING btree ("processed_by_id");
  CREATE INDEX "job_requests_updated_at_idx" ON "job_requests" USING btree ("updated_at");
  CREATE INDEX "job_requests_created_at_idx" ON "job_requests" USING btree ("created_at");
  CREATE UNIQUE INDEX "jobRequestCode_idx" ON "job_requests" USING btree ("job_request_code");
  CREATE INDEX "client_lead_assignments_client_idx" ON "client_lead_assignments" USING btree ("client_id");
  CREATE INDEX "client_lead_assignments_head_recruiter_idx" ON "client_lead_assignments" USING btree ("head_recruiter_id");
  CREATE INDEX "client_lead_assignments_lead_recruiter_idx" ON "client_lead_assignments" USING btree ("lead_recruiter_id");
  CREATE INDEX "client_lead_assignments_status_idx" ON "client_lead_assignments" USING btree ("status");
  CREATE INDEX "client_lead_assignments_assigned_by_idx" ON "client_lead_assignments" USING btree ("assigned_by_id");
  CREATE INDEX "client_lead_assignments_updated_at_idx" ON "client_lead_assignments" USING btree ("updated_at");
  CREATE INDEX "client_lead_assignments_created_at_idx" ON "client_lead_assignments" USING btree ("created_at");
  CREATE INDEX "client_leadRecruiter_status_idx" ON "client_lead_assignments" USING btree ("client_id","lead_recruiter_id","status");
  CREATE INDEX "headRecruiter_status_idx" ON "client_lead_assignments" USING btree ("head_recruiter_id","status");
  CREATE INDEX "job_lead_assignments_client_idx" ON "job_lead_assignments" USING btree ("client_id");
  CREATE INDEX "job_lead_assignments_job_idx" ON "job_lead_assignments" USING btree ("job_id");
  CREATE INDEX "job_lead_assignments_head_recruiter_idx" ON "job_lead_assignments" USING btree ("head_recruiter_id");
  CREATE INDEX "job_lead_assignments_lead_recruiter_idx" ON "job_lead_assignments" USING btree ("lead_recruiter_id");
  CREATE INDEX "job_lead_assignments_status_idx" ON "job_lead_assignments" USING btree ("status");
  CREATE INDEX "job_lead_assignments_assigned_by_idx" ON "job_lead_assignments" USING btree ("assigned_by_id");
  CREATE INDEX "job_lead_assignments_updated_at_idx" ON "job_lead_assignments" USING btree ("updated_at");
  CREATE INDEX "job_lead_assignments_created_at_idx" ON "job_lead_assignments" USING btree ("created_at");
  CREATE INDEX "job_leadRecruiter_status_idx" ON "job_lead_assignments" USING btree ("job_id","lead_recruiter_id","status");
  CREATE INDEX "client_leadRecruiter_status_1_idx" ON "job_lead_assignments" USING btree ("client_id","lead_recruiter_id","status");
  CREATE INDEX "headRecruiter_status_1_idx" ON "job_lead_assignments" USING btree ("head_recruiter_id","status");
  CREATE INDEX "recruiter_job_assignments_job_idx" ON "recruiter_job_assignments" USING btree ("job_id");
  CREATE INDEX "recruiter_job_assignments_lead_recruiter_idx" ON "recruiter_job_assignments" USING btree ("lead_recruiter_id");
  CREATE INDEX "recruiter_job_assignments_recruiter_idx" ON "recruiter_job_assignments" USING btree ("recruiter_id");
  CREATE INDEX "recruiter_job_assignments_status_idx" ON "recruiter_job_assignments" USING btree ("status");
  CREATE INDEX "recruiter_job_assignments_assigned_by_idx" ON "recruiter_job_assignments" USING btree ("assigned_by_id");
  CREATE INDEX "recruiter_job_assignments_updated_at_idx" ON "recruiter_job_assignments" USING btree ("updated_at");
  CREATE INDEX "recruiter_job_assignments_created_at_idx" ON "recruiter_job_assignments" USING btree ("created_at");
  CREATE INDEX "job_recruiter_status_idx" ON "recruiter_job_assignments" USING btree ("job_id","recruiter_id","status");
  CREATE INDEX "leadRecruiter_status_idx" ON "recruiter_job_assignments" USING btree ("lead_recruiter_id","status");
  CREATE INDEX "candidate_resumes_source_job_idx" ON "candidate_resumes" USING btree ("source_job_id");
  CREATE INDEX "candidate_resumes_uploaded_by_idx" ON "candidate_resumes" USING btree ("uploaded_by_id");
  CREATE INDEX "candidate_resumes_updated_at_idx" ON "candidate_resumes" USING btree ("updated_at");
  CREATE INDEX "candidate_resumes_created_at_idx" ON "candidate_resumes" USING btree ("created_at");
  CREATE UNIQUE INDEX "candidate_resumes_filename_idx" ON "candidate_resumes" USING btree ("filename");
  CREATE INDEX "candidates_education_details_order_idx" ON "candidates_education_details" USING btree ("_order");
  CREATE INDEX "candidates_education_details_parent_id_idx" ON "candidates_education_details" USING btree ("_parent_id");
  CREATE INDEX "candidates_certifications_order_idx" ON "candidates_certifications" USING btree ("_order");
  CREATE INDEX "candidates_certifications_parent_id_idx" ON "candidates_certifications" USING btree ("_parent_id");
  CREATE INDEX "candidates_work_experience_order_idx" ON "candidates_work_experience" USING btree ("_order");
  CREATE INDEX "candidates_work_experience_parent_id_idx" ON "candidates_work_experience" USING btree ("_parent_id");
  CREATE INDEX "candidates_employer_details_order_idx" ON "candidates_employer_details" USING btree ("_order");
  CREATE INDEX "candidates_employer_details_parent_id_idx" ON "candidates_employer_details" USING btree ("_parent_id");
  CREATE INDEX "candidates_employment_test_results_order_idx" ON "candidates_employment_test_results" USING btree ("_order");
  CREATE INDEX "candidates_employment_test_results_parent_id_idx" ON "candidates_employment_test_results" USING btree ("_parent_id");
  CREATE INDEX "candidates_languages_order_idx" ON "candidates_languages" USING btree ("_order");
  CREATE INDEX "candidates_languages_parent_id_idx" ON "candidates_languages" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "candidates_candidate_code_idx" ON "candidates" USING btree ("candidate_code");
  CREATE INDEX "candidates_full_name_idx" ON "candidates" USING btree ("full_name");
  CREATE INDEX "candidates_email_idx" ON "candidates" USING btree ("email");
  CREATE INDEX "candidates_phone_idx" ON "candidates" USING btree ("phone");
  CREATE INDEX "candidates_applicant_status_idx" ON "candidates" USING btree ("applicant_status");
  CREATE INDEX "candidates_ownership_idx" ON "candidates" USING btree ("ownership_id");
  CREATE INDEX "candidates_work_authorization_idx" ON "candidates" USING btree ("work_authorization");
  CREATE INDEX "candidates_source_idx" ON "candidates" USING btree ("source");
  CREATE INDEX "candidates_resume_idx" ON "candidates" USING btree ("resume_id");
  CREATE INDEX "candidates_source_job_idx" ON "candidates" USING btree ("source_job_id");
  CREATE INDEX "candidates_sourced_by_idx" ON "candidates" USING btree ("sourced_by_id");
  CREATE INDEX "candidates_candidate_account_idx" ON "candidates" USING btree ("candidate_account_id");
  CREATE UNIQUE INDEX "candidates_normalized_email_idx" ON "candidates" USING btree ("normalized_email");
  CREATE UNIQUE INDEX "candidates_normalized_phone_idx" ON "candidates" USING btree ("normalized_phone");
  CREATE INDEX "candidates_updated_at_idx" ON "candidates" USING btree ("updated_at");
  CREATE INDEX "candidates_created_at_idx" ON "candidates" USING btree ("created_at");
  CREATE UNIQUE INDEX "candidateCode_idx" ON "candidates" USING btree ("candidate_code");
  CREATE INDEX "sourceJob_updatedAt_idx" ON "candidates" USING btree ("source_job_id","updated_at");
  CREATE INDEX "source_updatedAt_idx" ON "candidates" USING btree ("source","updated_at");
  CREATE INDEX "sourcedBy_updatedAt_idx" ON "candidates" USING btree ("sourced_by_id","updated_at");
  CREATE INDEX "candidates_texts_order_parent" ON "candidates_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "candidate_activities_activity_code_idx" ON "candidate_activities" USING btree ("activity_code");
  CREATE INDEX "candidate_activities_candidate_idx" ON "candidate_activities" USING btree ("candidate_id");
  CREATE INDEX "candidate_activities_application_idx" ON "candidate_activities" USING btree ("application_id");
  CREATE INDEX "candidate_activities_type_idx" ON "candidate_activities" USING btree ("type");
  CREATE INDEX "candidate_activities_title_idx" ON "candidate_activities" USING btree ("title");
  CREATE INDEX "candidate_activities_priority_idx" ON "candidate_activities" USING btree ("priority");
  CREATE INDEX "candidate_activities_status_idx" ON "candidate_activities" USING btree ("status");
  CREATE INDEX "candidate_activities_due_at_idx" ON "candidate_activities" USING btree ("due_at");
  CREATE INDEX "candidate_activities_assigned_to_idx" ON "candidate_activities" USING btree ("assigned_to_id");
  CREATE INDEX "candidate_activities_created_by_idx" ON "candidate_activities" USING btree ("created_by_id");
  CREATE INDEX "candidate_activities_modified_on_idx" ON "candidate_activities" USING btree ("modified_on");
  CREATE INDEX "candidate_activities_status_modified_on_idx" ON "candidate_activities" USING btree ("status_modified_on");
  CREATE INDEX "candidate_activities_updated_at_idx" ON "candidate_activities" USING btree ("updated_at");
  CREATE INDEX "candidate_activities_created_at_idx" ON "candidate_activities" USING btree ("created_at");
  CREATE UNIQUE INDEX "activityCode_idx" ON "candidate_activities" USING btree ("activity_code");
  CREATE INDEX "candidate_type_updatedAt_idx" ON "candidate_activities" USING btree ("candidate_id","type","updated_at");
  CREATE INDEX "assignedTo_status_dueAt_idx" ON "candidate_activities" USING btree ("assigned_to_id","status","due_at");
  CREATE UNIQUE INDEX "applications_application_code_idx" ON "applications" USING btree ("application_code");
  CREATE INDEX "applications_candidate_idx" ON "applications" USING btree ("candidate_id");
  CREATE INDEX "applications_job_idx" ON "applications" USING btree ("job_id");
  CREATE INDEX "applications_recruiter_idx" ON "applications" USING btree ("recruiter_id");
  CREATE INDEX "applications_candidate_account_idx" ON "applications" USING btree ("candidate_account_id");
  CREATE INDEX "applications_stage_idx" ON "applications" USING btree ("stage");
  CREATE INDEX "applications_reviewed_by_idx" ON "applications" USING btree ("reviewed_by_id");
  CREATE INDEX "applications_created_by_idx" ON "applications" USING btree ("created_by_id");
  CREATE INDEX "applications_updated_at_idx" ON "applications" USING btree ("updated_at");
  CREATE INDEX "applications_created_at_idx" ON "applications" USING btree ("created_at");
  CREATE UNIQUE INDEX "applicationCode_idx" ON "applications" USING btree ("application_code");
  CREATE UNIQUE INDEX "candidate_job_idx" ON "applications" USING btree ("candidate_id","job_id");
  CREATE INDEX "job_stage_idx" ON "applications" USING btree ("job_id","stage");
  CREATE INDEX "candidateAccount_stage_idx" ON "applications" USING btree ("candidate_account_id","stage");
  CREATE INDEX "stage_updatedAt_idx" ON "applications" USING btree ("stage","updated_at");
  CREATE INDEX "recruiter_stage_updatedAt_idx" ON "applications" USING btree ("recruiter_id","stage","updated_at");
  CREATE INDEX "recruiter_createdAt_idx" ON "applications" USING btree ("recruiter_id","created_at");
  CREATE INDEX "job_updatedAt_idx" ON "applications" USING btree ("job_id","updated_at");
  CREATE INDEX "application_stage_history_application_idx" ON "application_stage_history" USING btree ("application_id");
  CREATE INDEX "application_stage_history_candidate_idx" ON "application_stage_history" USING btree ("candidate_id");
  CREATE INDEX "application_stage_history_candidate_account_idx" ON "application_stage_history" USING btree ("candidate_account_id");
  CREATE INDEX "application_stage_history_job_idx" ON "application_stage_history" USING btree ("job_id");
  CREATE INDEX "application_stage_history_recruiter_idx" ON "application_stage_history" USING btree ("recruiter_id");
  CREATE INDEX "application_stage_history_from_stage_idx" ON "application_stage_history" USING btree ("from_stage");
  CREATE INDEX "application_stage_history_to_stage_idx" ON "application_stage_history" USING btree ("to_stage");
  CREATE INDEX "application_stage_history_actor_idx" ON "application_stage_history" USING btree ("actor_id");
  CREATE INDEX "application_stage_history_changed_at_idx" ON "application_stage_history" USING btree ("changed_at");
  CREATE INDEX "application_stage_history_updated_at_idx" ON "application_stage_history" USING btree ("updated_at");
  CREATE INDEX "application_stage_history_created_at_idx" ON "application_stage_history" USING btree ("created_at");
  CREATE INDEX "application_changedAt_idx" ON "application_stage_history" USING btree ("application_id","changed_at");
  CREATE INDEX "candidateAccount_changedAt_idx" ON "application_stage_history" USING btree ("candidate_account_id","changed_at");
  CREATE INDEX "toStage_changedAt_idx" ON "application_stage_history" USING btree ("to_stage","changed_at");
  CREATE INDEX "actor_changedAt_idx" ON "application_stage_history" USING btree ("actor_id","changed_at");
  CREATE INDEX "job_changedAt_idx" ON "application_stage_history" USING btree ("job_id","changed_at");
  CREATE INDEX "recruiter_changedAt_idx" ON "application_stage_history" USING btree ("recruiter_id","changed_at");
  CREATE INDEX "candidate_invites_candidate_idx" ON "candidate_invites" USING btree ("candidate_id");
  CREATE INDEX "candidate_invites_application_idx" ON "candidate_invites" USING btree ("application_id");
  CREATE INDEX "candidate_invites_invite_email_idx" ON "candidate_invites" USING btree ("invite_email");
  CREATE UNIQUE INDEX "candidate_invites_token_hash_idx" ON "candidate_invites" USING btree ("token_hash");
  CREATE INDEX "candidate_invites_status_idx" ON "candidate_invites" USING btree ("status");
  CREATE INDEX "candidate_invites_expires_at_idx" ON "candidate_invites" USING btree ("expires_at");
  CREATE INDEX "candidate_invites_sent_at_idx" ON "candidate_invites" USING btree ("sent_at");
  CREATE INDEX "candidate_invites_sent_by_idx" ON "candidate_invites" USING btree ("sent_by_id");
  CREATE INDEX "candidate_invites_consumed_at_idx" ON "candidate_invites" USING btree ("consumed_at");
  CREATE INDEX "candidate_invites_revoked_at_idx" ON "candidate_invites" USING btree ("revoked_at");
  CREATE INDEX "candidate_invites_updated_at_idx" ON "candidate_invites" USING btree ("updated_at");
  CREATE INDEX "candidate_invites_created_at_idx" ON "candidate_invites" USING btree ("created_at");
  CREATE INDEX "application_status_idx" ON "candidate_invites" USING btree ("application_id","status");
  CREATE INDEX "candidate_status_idx" ON "candidate_invites" USING btree ("candidate_id","status");
  CREATE INDEX "expiresAt_status_idx" ON "candidate_invites" USING btree ("expires_at","status");
  CREATE INDEX "job_templates_required_skills_order_idx" ON "job_templates_required_skills" USING btree ("_order");
  CREATE INDEX "job_templates_required_skills_parent_id_idx" ON "job_templates_required_skills" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "job_templates_template_code_idx" ON "job_templates" USING btree ("template_code");
  CREATE INDEX "job_templates_template_name_idx" ON "job_templates" USING btree ("template_name");
  CREATE INDEX "job_templates_title_idx" ON "job_templates" USING btree ("title");
  CREATE INDEX "job_templates_is_active_idx" ON "job_templates" USING btree ("is_active");
  CREATE INDEX "job_templates_owned_by_lead_recruiter_idx" ON "job_templates" USING btree ("owned_by_lead_recruiter_id");
  CREATE INDEX "job_templates_created_by_idx" ON "job_templates" USING btree ("created_by_id");
  CREATE INDEX "job_templates_updated_at_idx" ON "job_templates" USING btree ("updated_at");
  CREATE INDEX "job_templates_created_at_idx" ON "job_templates" USING btree ("created_at");
  CREATE UNIQUE INDEX "templateCode_idx" ON "job_templates" USING btree ("template_code");
  CREATE INDEX "templateName_isActive_idx" ON "job_templates" USING btree ("template_name","is_active");
  CREATE INDEX "job_templates_texts_order_parent" ON "job_templates_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "interviews_interview_code_idx" ON "interviews" USING btree ("interview_code");
  CREATE INDEX "interviews_application_idx" ON "interviews" USING btree ("application_id");
  CREATE INDEX "interviews_candidate_idx" ON "interviews" USING btree ("candidate_id");
  CREATE INDEX "interviews_job_idx" ON "interviews" USING btree ("job_id");
  CREATE INDEX "interviews_recruiter_idx" ON "interviews" USING btree ("recruiter_id");
  CREATE INDEX "interviews_client_idx" ON "interviews" USING btree ("client_id");
  CREATE INDEX "interviews_start_time_idx" ON "interviews" USING btree ("start_time");
  CREATE INDEX "interviews_end_time_idx" ON "interviews" USING btree ("end_time");
  CREATE INDEX "interviews_status_idx" ON "interviews" USING btree ("status");
  CREATE INDEX "interviews_initiated_by_idx" ON "interviews" USING btree ("initiated_by_id");
  CREATE INDEX "interviews_updated_at_idx" ON "interviews" USING btree ("updated_at");
  CREATE INDEX "interviews_created_at_idx" ON "interviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "interviewCode_idx" ON "interviews" USING btree ("interview_code");
  CREATE INDEX "application_startTime_idx" ON "interviews" USING btree ("application_id","start_time");
  CREATE INDEX "status_startTime_idx" ON "interviews" USING btree ("status","start_time");
  CREATE INDEX "candidate_startTime_idx" ON "interviews" USING btree ("candidate_id","start_time");
  CREATE INDEX "recruiter_startTime_idx" ON "interviews" USING btree ("recruiter_id","start_time");
  CREATE UNIQUE INDEX "placements_placement_code_idx" ON "placements" USING btree ("placement_code");
  CREATE INDEX "placements_application_idx" ON "placements" USING btree ("application_id");
  CREATE INDEX "placements_candidate_idx" ON "placements" USING btree ("candidate_id");
  CREATE INDEX "placements_job_idx" ON "placements" USING btree ("job_id");
  CREATE INDEX "placements_recruiter_idx" ON "placements" USING btree ("recruiter_id");
  CREATE INDEX "placements_client_idx" ON "placements" USING btree ("client_id");
  CREATE INDEX "placements_status_idx" ON "placements" USING btree ("status");
  CREATE INDEX "placements_created_by_idx" ON "placements" USING btree ("created_by_id");
  CREATE INDEX "placements_updated_at_idx" ON "placements" USING btree ("updated_at");
  CREATE INDEX "placements_created_at_idx" ON "placements" USING btree ("created_at");
  CREATE UNIQUE INDEX "placementCode_idx" ON "placements" USING btree ("placement_code");
  CREATE UNIQUE INDEX "application_idx" ON "placements" USING btree ("application_id");
  CREATE INDEX "status_tentativeStartDate_idx" ON "placements" USING btree ("status","tentative_start_date");
  CREATE INDEX "candidate_status_1_idx" ON "placements" USING btree ("candidate_id","status");
  CREATE INDEX "recruiter_createdAt_1_idx" ON "placements" USING btree ("recruiter_id","created_at");
  CREATE INDEX "recruiter_status_createdAt_idx" ON "placements" USING btree ("recruiter_id","status","created_at");
  CREATE INDEX "employee_profiles_weekly_off_days_order_idx" ON "employee_profiles_weekly_off_days" USING btree ("order");
  CREATE INDEX "employee_profiles_weekly_off_days_parent_idx" ON "employee_profiles_weekly_off_days" USING btree ("parent_id");
  CREATE UNIQUE INDEX "employee_profiles_employee_code_idx" ON "employee_profiles" USING btree ("employee_code");
  CREATE UNIQUE INDEX "employee_profiles_user_idx" ON "employee_profiles" USING btree ("user_id");
  CREATE INDEX "employee_profiles_date_of_joining_idx" ON "employee_profiles" USING btree ("date_of_joining");
  CREATE INDEX "employee_profiles_employment_status_idx" ON "employee_profiles" USING btree ("employment_status");
  CREATE INDEX "employee_profiles_designation_idx" ON "employee_profiles" USING btree ("designation");
  CREATE INDEX "employee_profiles_department_idx" ON "employee_profiles" USING btree ("department");
  CREATE INDEX "employee_profiles_work_state_idx" ON "employee_profiles" USING btree ("work_state");
  CREATE INDEX "employee_profiles_reporting_manager_idx" ON "employee_profiles" USING btree ("reporting_manager_id");
  CREATE INDEX "employee_profiles_attendance_shift_idx" ON "employee_profiles" USING btree ("attendance_shift_id");
  CREATE INDEX "employee_profiles_holiday_calendar_idx" ON "employee_profiles" USING btree ("holiday_calendar_id");
  CREATE INDEX "employee_profiles_is_payroll_eligible_idx" ON "employee_profiles" USING btree ("is_payroll_eligible");
  CREATE INDEX "employee_profiles_payout_ready_idx" ON "employee_profiles" USING btree ("payout_ready");
  CREATE INDEX "employee_profiles_razorpay_fund_account_i_d_idx" ON "employee_profiles" USING btree ("razorpay_fund_account_i_d");
  CREATE INDEX "employee_profiles_updated_at_idx" ON "employee_profiles" USING btree ("updated_at");
  CREATE INDEX "employee_profiles_created_at_idx" ON "employee_profiles" USING btree ("created_at");
  CREATE UNIQUE INDEX "employeeCode_idx" ON "employee_profiles" USING btree ("employee_code");
  CREATE UNIQUE INDEX "user_idx" ON "employee_profiles" USING btree ("user_id");
  CREATE INDEX "employmentStatus_workState_idx" ON "employee_profiles" USING btree ("employment_status","work_state");
  CREATE INDEX "employee_compensation_custom_earnings_order_idx" ON "employee_compensation_custom_earnings" USING btree ("_order");
  CREATE INDEX "employee_compensation_custom_earnings_parent_id_idx" ON "employee_compensation_custom_earnings" USING btree ("_parent_id");
  CREATE INDEX "employee_compensation_custom_deductions_order_idx" ON "employee_compensation_custom_deductions" USING btree ("_order");
  CREATE INDEX "employee_compensation_custom_deductions_parent_id_idx" ON "employee_compensation_custom_deductions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "employee_compensation_compensation_code_idx" ON "employee_compensation" USING btree ("compensation_code");
  CREATE INDEX "employee_compensation_employee_idx" ON "employee_compensation" USING btree ("employee_id");
  CREATE INDEX "employee_compensation_effective_from_idx" ON "employee_compensation" USING btree ("effective_from");
  CREATE INDEX "employee_compensation_effective_to_idx" ON "employee_compensation" USING btree ("effective_to");
  CREATE INDEX "employee_compensation_is_active_idx" ON "employee_compensation" USING btree ("is_active");
  CREATE INDEX "employee_compensation_updated_at_idx" ON "employee_compensation" USING btree ("updated_at");
  CREATE INDEX "employee_compensation_created_at_idx" ON "employee_compensation" USING btree ("created_at");
  CREATE UNIQUE INDEX "compensationCode_idx" ON "employee_compensation" USING btree ("compensation_code");
  CREATE INDEX "employee_effectiveFrom_idx" ON "employee_compensation" USING btree ("employee_id","effective_from");
  CREATE INDEX "attendance_shifts_weekly_off_days_order_idx" ON "attendance_shifts_weekly_off_days" USING btree ("order");
  CREATE INDEX "attendance_shifts_weekly_off_days_parent_idx" ON "attendance_shifts_weekly_off_days" USING btree ("parent_id");
  CREATE UNIQUE INDEX "attendance_shifts_shift_code_idx" ON "attendance_shifts" USING btree ("shift_code");
  CREATE INDEX "attendance_shifts_name_idx" ON "attendance_shifts" USING btree ("name");
  CREATE INDEX "attendance_shifts_is_default_idx" ON "attendance_shifts" USING btree ("is_default");
  CREATE INDEX "attendance_shifts_updated_at_idx" ON "attendance_shifts" USING btree ("updated_at");
  CREATE INDEX "attendance_shifts_created_at_idx" ON "attendance_shifts" USING btree ("created_at");
  CREATE UNIQUE INDEX "shiftCode_idx" ON "attendance_shifts" USING btree ("shift_code");
  CREATE INDEX "name_idx" ON "attendance_shifts" USING btree ("name");
  CREATE INDEX "holiday_calendars_holidays_order_idx" ON "holiday_calendars_holidays" USING btree ("_order");
  CREATE INDEX "holiday_calendars_holidays_parent_id_idx" ON "holiday_calendars_holidays" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "holiday_calendars_calendar_code_idx" ON "holiday_calendars" USING btree ("calendar_code");
  CREATE INDEX "holiday_calendars_name_idx" ON "holiday_calendars" USING btree ("name");
  CREATE INDEX "holiday_calendars_state_idx" ON "holiday_calendars" USING btree ("state");
  CREATE INDEX "holiday_calendars_year_idx" ON "holiday_calendars" USING btree ("year");
  CREATE INDEX "holiday_calendars_updated_at_idx" ON "holiday_calendars" USING btree ("updated_at");
  CREATE INDEX "holiday_calendars_created_at_idx" ON "holiday_calendars" USING btree ("created_at");
  CREATE UNIQUE INDEX "calendarCode_idx" ON "holiday_calendars" USING btree ("calendar_code");
  CREATE UNIQUE INDEX "state_year_idx" ON "holiday_calendars" USING btree ("state","year");
  CREATE UNIQUE INDEX "attendance_logs_attendance_log_code_idx" ON "attendance_logs" USING btree ("attendance_log_code");
  CREATE INDEX "attendance_logs_employee_idx" ON "attendance_logs" USING btree ("employee_id");
  CREATE INDEX "attendance_logs_punch_date_idx" ON "attendance_logs" USING btree ("punch_date");
  CREATE INDEX "attendance_logs_punch_in_at_idx" ON "attendance_logs" USING btree ("punch_in_at");
  CREATE INDEX "attendance_logs_punch_out_at_idx" ON "attendance_logs" USING btree ("punch_out_at");
  CREATE INDEX "attendance_logs_source_idx" ON "attendance_logs" USING btree ("source");
  CREATE INDEX "attendance_logs_updated_at_idx" ON "attendance_logs" USING btree ("updated_at");
  CREATE INDEX "attendance_logs_created_at_idx" ON "attendance_logs" USING btree ("created_at");
  CREATE UNIQUE INDEX "attendanceLogCode_idx" ON "attendance_logs" USING btree ("attendance_log_code");
  CREATE INDEX "employee_punchDate_punchInAt_idx" ON "attendance_logs" USING btree ("employee_id","punch_date","punch_in_at");
  CREATE INDEX "attendance_logs_texts_order_parent" ON "attendance_logs_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "attendance_daily_summaries_summary_code_idx" ON "attendance_daily_summaries" USING btree ("summary_code");
  CREATE INDEX "attendance_daily_summaries_employee_idx" ON "attendance_daily_summaries" USING btree ("employee_id");
  CREATE INDEX "attendance_daily_summaries_date_idx" ON "attendance_daily_summaries" USING btree ("date");
  CREATE INDEX "attendance_daily_summaries_status_idx" ON "attendance_daily_summaries" USING btree ("status");
  CREATE INDEX "attendance_daily_summaries_lop_idx" ON "attendance_daily_summaries" USING btree ("lop");
  CREATE INDEX "attendance_daily_summaries_attendance_log_idx" ON "attendance_daily_summaries" USING btree ("attendance_log_id");
  CREATE INDEX "attendance_daily_summaries_leave_request_idx" ON "attendance_daily_summaries" USING btree ("leave_request_id");
  CREATE INDEX "attendance_daily_summaries_updated_at_idx" ON "attendance_daily_summaries" USING btree ("updated_at");
  CREATE INDEX "attendance_daily_summaries_created_at_idx" ON "attendance_daily_summaries" USING btree ("created_at");
  CREATE UNIQUE INDEX "summaryCode_idx" ON "attendance_daily_summaries" USING btree ("summary_code");
  CREATE UNIQUE INDEX "employee_date_idx" ON "attendance_daily_summaries" USING btree ("employee_id","date");
  CREATE INDEX "status_date_idx" ON "attendance_daily_summaries" USING btree ("status","date");
  CREATE UNIQUE INDEX "leave_types_leave_type_code_idx" ON "leave_types" USING btree ("leave_type_code");
  CREATE INDEX "leave_types_key_idx" ON "leave_types" USING btree ("key");
  CREATE INDEX "leave_types_is_active_idx" ON "leave_types" USING btree ("is_active");
  CREATE INDEX "leave_types_updated_at_idx" ON "leave_types" USING btree ("updated_at");
  CREATE INDEX "leave_types_created_at_idx" ON "leave_types" USING btree ("created_at");
  CREATE UNIQUE INDEX "leaveTypeCode_idx" ON "leave_types" USING btree ("leave_type_code");
  CREATE UNIQUE INDEX "key_idx" ON "leave_types" USING btree ("key");
  CREATE UNIQUE INDEX "leave_balances_balance_code_idx" ON "leave_balances" USING btree ("balance_code");
  CREATE INDEX "leave_balances_employee_idx" ON "leave_balances" USING btree ("employee_id");
  CREATE INDEX "leave_balances_leave_type_idx" ON "leave_balances" USING btree ("leave_type_id");
  CREATE INDEX "leave_balances_year_idx" ON "leave_balances" USING btree ("year");
  CREATE INDEX "leave_balances_updated_at_idx" ON "leave_balances" USING btree ("updated_at");
  CREATE INDEX "leave_balances_created_at_idx" ON "leave_balances" USING btree ("created_at");
  CREATE UNIQUE INDEX "balanceCode_idx" ON "leave_balances" USING btree ("balance_code");
  CREATE UNIQUE INDEX "employee_leaveType_year_idx" ON "leave_balances" USING btree ("employee_id","leave_type_id","year");
  CREATE INDEX "leave_requests_workflow_trail_order_idx" ON "leave_requests_workflow_trail" USING btree ("_order");
  CREATE INDEX "leave_requests_workflow_trail_parent_id_idx" ON "leave_requests_workflow_trail" USING btree ("_parent_id");
  CREATE INDEX "leave_requests_workflow_trail_acted_by_idx" ON "leave_requests_workflow_trail" USING btree ("acted_by_id");
  CREATE UNIQUE INDEX "leave_requests_leave_request_code_idx" ON "leave_requests" USING btree ("leave_request_code");
  CREATE INDEX "leave_requests_employee_idx" ON "leave_requests" USING btree ("employee_id");
  CREATE INDEX "leave_requests_employee_role_idx" ON "leave_requests" USING btree ("employee_role");
  CREATE INDEX "leave_requests_leave_type_idx" ON "leave_requests" USING btree ("leave_type_id");
  CREATE INDEX "leave_requests_start_date_idx" ON "leave_requests" USING btree ("start_date");
  CREATE INDEX "leave_requests_end_date_idx" ON "leave_requests" USING btree ("end_date");
  CREATE INDEX "leave_requests_status_idx" ON "leave_requests" USING btree ("status");
  CREATE INDEX "leave_requests_requested_by_idx" ON "leave_requests" USING btree ("requested_by_id");
  CREATE INDEX "leave_requests_lead_approver_idx" ON "leave_requests" USING btree ("lead_approver_id");
  CREATE INDEX "leave_requests_admin_approver_idx" ON "leave_requests" USING btree ("admin_approver_id");
  CREATE INDEX "leave_requests_updated_at_idx" ON "leave_requests" USING btree ("updated_at");
  CREATE INDEX "leave_requests_created_at_idx" ON "leave_requests" USING btree ("created_at");
  CREATE UNIQUE INDEX "leaveRequestCode_idx" ON "leave_requests" USING btree ("leave_request_code");
  CREATE INDEX "employee_status_startDate_idx" ON "leave_requests" USING btree ("employee_id","status","start_date");
  CREATE INDEX "employee_startDate_endDate_idx" ON "leave_requests" USING btree ("employee_id","start_date","end_date");
  CREATE INDEX "requestedBy_status_idx" ON "leave_requests" USING btree ("requested_by_id","status");
  CREATE UNIQUE INDEX "performance_cycles_cycle_code_idx" ON "performance_cycles" USING btree ("cycle_code");
  CREATE INDEX "performance_cycles_month_idx" ON "performance_cycles" USING btree ("month");
  CREATE INDEX "performance_cycles_year_idx" ON "performance_cycles" USING btree ("year");
  CREATE INDEX "performance_cycles_start_date_idx" ON "performance_cycles" USING btree ("start_date");
  CREATE INDEX "performance_cycles_end_date_idx" ON "performance_cycles" USING btree ("end_date");
  CREATE INDEX "performance_cycles_status_idx" ON "performance_cycles" USING btree ("status");
  CREATE INDEX "performance_cycles_updated_at_idx" ON "performance_cycles" USING btree ("updated_at");
  CREATE INDEX "performance_cycles_created_at_idx" ON "performance_cycles" USING btree ("created_at");
  CREATE UNIQUE INDEX "cycleCode_idx" ON "performance_cycles" USING btree ("cycle_code");
  CREATE UNIQUE INDEX "month_year_idx" ON "performance_cycles" USING btree ("month","year");
  CREATE UNIQUE INDEX "performance_snapshots_snapshot_code_idx" ON "performance_snapshots" USING btree ("snapshot_code");
  CREATE INDEX "performance_snapshots_cycle_idx" ON "performance_snapshots" USING btree ("cycle_id");
  CREATE INDEX "performance_snapshots_employee_idx" ON "performance_snapshots" USING btree ("employee_id");
  CREATE INDEX "performance_snapshots_generated_by_idx" ON "performance_snapshots" USING btree ("generated_by_id");
  CREATE INDEX "performance_snapshots_generated_at_idx" ON "performance_snapshots" USING btree ("generated_at");
  CREATE INDEX "performance_snapshots_kpi_score_idx" ON "performance_snapshots" USING btree ("kpi_score");
  CREATE INDEX "performance_snapshots_updated_at_idx" ON "performance_snapshots" USING btree ("updated_at");
  CREATE INDEX "performance_snapshots_created_at_idx" ON "performance_snapshots" USING btree ("created_at");
  CREATE UNIQUE INDEX "snapshotCode_idx" ON "performance_snapshots" USING btree ("snapshot_code");
  CREATE UNIQUE INDEX "cycle_employee_idx" ON "performance_snapshots" USING btree ("cycle_id","employee_id");
  CREATE UNIQUE INDEX "performance_reviews_review_code_idx" ON "performance_reviews" USING btree ("review_code");
  CREATE INDEX "performance_reviews_cycle_idx" ON "performance_reviews" USING btree ("cycle_id");
  CREATE INDEX "performance_reviews_employee_idx" ON "performance_reviews" USING btree ("employee_id");
  CREATE INDEX "performance_reviews_reviewer_idx" ON "performance_reviews" USING btree ("reviewer_id");
  CREATE INDEX "performance_reviews_final_score_idx" ON "performance_reviews" USING btree ("final_score");
  CREATE INDEX "performance_reviews_status_idx" ON "performance_reviews" USING btree ("status");
  CREATE INDEX "performance_reviews_updated_at_idx" ON "performance_reviews" USING btree ("updated_at");
  CREATE INDEX "performance_reviews_created_at_idx" ON "performance_reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "reviewCode_idx" ON "performance_reviews" USING btree ("review_code");
  CREATE UNIQUE INDEX "cycle_employee_1_idx" ON "performance_reviews" USING btree ("cycle_id","employee_id");
  CREATE UNIQUE INDEX "payroll_rule_sets_rule_set_code_idx" ON "payroll_rule_sets" USING btree ("rule_set_code");
  CREATE INDEX "payroll_rule_sets_name_idx" ON "payroll_rule_sets" USING btree ("name");
  CREATE INDEX "payroll_rule_sets_state_idx" ON "payroll_rule_sets" USING btree ("state");
  CREATE INDEX "payroll_rule_sets_effective_from_idx" ON "payroll_rule_sets" USING btree ("effective_from");
  CREATE INDEX "payroll_rule_sets_effective_to_idx" ON "payroll_rule_sets" USING btree ("effective_to");
  CREATE INDEX "payroll_rule_sets_is_active_idx" ON "payroll_rule_sets" USING btree ("is_active");
  CREATE INDEX "payroll_rule_sets_updated_at_idx" ON "payroll_rule_sets" USING btree ("updated_at");
  CREATE INDEX "payroll_rule_sets_created_at_idx" ON "payroll_rule_sets" USING btree ("created_at");
  CREATE UNIQUE INDEX "ruleSetCode_idx" ON "payroll_rule_sets" USING btree ("rule_set_code");
  CREATE INDEX "state_effectiveFrom_idx" ON "payroll_rule_sets" USING btree ("state","effective_from");
  CREATE UNIQUE INDEX "payroll_cycles_payroll_cycle_code_idx" ON "payroll_cycles" USING btree ("payroll_cycle_code");
  CREATE INDEX "payroll_cycles_month_idx" ON "payroll_cycles" USING btree ("month");
  CREATE INDEX "payroll_cycles_year_idx" ON "payroll_cycles" USING btree ("year");
  CREATE INDEX "payroll_cycles_start_date_idx" ON "payroll_cycles" USING btree ("start_date");
  CREATE INDEX "payroll_cycles_end_date_idx" ON "payroll_cycles" USING btree ("end_date");
  CREATE INDEX "payroll_cycles_payout_date_idx" ON "payroll_cycles" USING btree ("payout_date");
  CREATE INDEX "payroll_cycles_status_idx" ON "payroll_cycles" USING btree ("status");
  CREATE INDEX "payroll_cycles_updated_at_idx" ON "payroll_cycles" USING btree ("updated_at");
  CREATE INDEX "payroll_cycles_created_at_idx" ON "payroll_cycles" USING btree ("created_at");
  CREATE UNIQUE INDEX "payrollCycleCode_idx" ON "payroll_cycles" USING btree ("payroll_cycle_code");
  CREATE INDEX "month_year_1_idx" ON "payroll_cycles" USING btree ("month","year");
  CREATE UNIQUE INDEX "payroll_runs_payroll_run_code_idx" ON "payroll_runs" USING btree ("payroll_run_code");
  CREATE INDEX "payroll_runs_payroll_cycle_idx" ON "payroll_runs" USING btree ("payroll_cycle_id");
  CREATE INDEX "payroll_runs_rule_set_idx" ON "payroll_runs" USING btree ("rule_set_id");
  CREATE INDEX "payroll_runs_status_idx" ON "payroll_runs" USING btree ("status");
  CREATE INDEX "payroll_runs_prepared_by_idx" ON "payroll_runs" USING btree ("prepared_by_id");
  CREATE INDEX "payroll_runs_prepared_at_idx" ON "payroll_runs" USING btree ("prepared_at");
  CREATE INDEX "payroll_runs_approved_by_idx" ON "payroll_runs" USING btree ("approved_by_id");
  CREATE INDEX "payroll_runs_approved_at_idx" ON "payroll_runs" USING btree ("approved_at");
  CREATE INDEX "payroll_runs_disbursed_by_idx" ON "payroll_runs" USING btree ("disbursed_by_id");
  CREATE INDEX "payroll_runs_disbursed_at_idx" ON "payroll_runs" USING btree ("disbursed_at");
  CREATE INDEX "payroll_runs_updated_at_idx" ON "payroll_runs" USING btree ("updated_at");
  CREATE INDEX "payroll_runs_created_at_idx" ON "payroll_runs" USING btree ("created_at");
  CREATE UNIQUE INDEX "payrollRunCode_idx" ON "payroll_runs" USING btree ("payroll_run_code");
  CREATE INDEX "payrollCycle_status_idx" ON "payroll_runs" USING btree ("payroll_cycle_id","status");
  CREATE UNIQUE INDEX "payroll_line_items_payroll_line_item_code_idx" ON "payroll_line_items" USING btree ("payroll_line_item_code");
  CREATE INDEX "payroll_line_items_payroll_run_idx" ON "payroll_line_items" USING btree ("payroll_run_id");
  CREATE INDEX "payroll_line_items_employee_idx" ON "payroll_line_items" USING btree ("employee_id");
  CREATE INDEX "payroll_line_items_compensation_idx" ON "payroll_line_items" USING btree ("compensation_id");
  CREATE INDEX "payroll_line_items_status_idx" ON "payroll_line_items" USING btree ("status");
  CREATE INDEX "payroll_line_items_payment_status_idx" ON "payroll_line_items" USING btree ("payment_status");
  CREATE INDEX "payroll_line_items_payment_mode_idx" ON "payroll_line_items" USING btree ("payment_mode");
  CREATE INDEX "payroll_line_items_paid_at_idx" ON "payroll_line_items" USING btree ("paid_at");
  CREATE INDEX "payroll_line_items_paid_by_idx" ON "payroll_line_items" USING btree ("paid_by_id");
  CREATE INDEX "payroll_line_items_payment_reference_idx" ON "payroll_line_items" USING btree ("payment_reference");
  CREATE INDEX "payroll_line_items_updated_at_idx" ON "payroll_line_items" USING btree ("updated_at");
  CREATE INDEX "payroll_line_items_created_at_idx" ON "payroll_line_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "payrollLineItemCode_idx" ON "payroll_line_items" USING btree ("payroll_line_item_code");
  CREATE UNIQUE INDEX "payrollRun_employee_idx" ON "payroll_line_items" USING btree ("payroll_run_id","employee_id");
  CREATE INDEX "payrollRun_paymentStatus_idx" ON "payroll_line_items" USING btree ("payroll_run_id","payment_status");
  CREATE INDEX "employee_createdAt_idx" ON "payroll_line_items" USING btree ("employee_id","created_at");
  CREATE UNIQUE INDEX "payslips_payslip_code_idx" ON "payslips" USING btree ("payslip_code");
  CREATE INDEX "payslips_employee_idx" ON "payslips" USING btree ("employee_id");
  CREATE INDEX "payslips_payroll_run_idx" ON "payslips" USING btree ("payroll_run_id");
  CREATE UNIQUE INDEX "payslips_payroll_line_item_idx" ON "payslips" USING btree ("payroll_line_item_id");
  CREATE INDEX "payslips_month_idx" ON "payslips" USING btree ("month");
  CREATE INDEX "payslips_year_idx" ON "payslips" USING btree ("year");
  CREATE INDEX "payslips_issue_date_idx" ON "payslips" USING btree ("issue_date");
  CREATE INDEX "payslips_status_idx" ON "payslips" USING btree ("status");
  CREATE INDEX "payslips_updated_at_idx" ON "payslips" USING btree ("updated_at");
  CREATE INDEX "payslips_created_at_idx" ON "payslips" USING btree ("created_at");
  CREATE UNIQUE INDEX "payslipCode_idx" ON "payslips" USING btree ("payslip_code");
  CREATE INDEX "employee_month_year_idx" ON "payslips" USING btree ("employee_id","month","year");
  CREATE UNIQUE INDEX "payroll_payout_transactions_payout_txn_code_idx" ON "payroll_payout_transactions" USING btree ("payout_txn_code");
  CREATE INDEX "payroll_payout_transactions_payroll_run_idx" ON "payroll_payout_transactions" USING btree ("payroll_run_id");
  CREATE INDEX "payroll_payout_transactions_line_item_idx" ON "payroll_payout_transactions" USING btree ("line_item_id");
  CREATE INDEX "payroll_payout_transactions_employee_idx" ON "payroll_payout_transactions" USING btree ("employee_id");
  CREATE INDEX "payroll_payout_transactions_provider_idx" ON "payroll_payout_transactions" USING btree ("provider");
  CREATE INDEX "payroll_payout_transactions_payout_status_idx" ON "payroll_payout_transactions" USING btree ("payout_status");
  CREATE UNIQUE INDEX "payroll_payout_transactions_payout_i_d_idx" ON "payroll_payout_transactions" USING btree ("payout_i_d");
  CREATE UNIQUE INDEX "payroll_payout_transactions_idempotency_key_idx" ON "payroll_payout_transactions" USING btree ("idempotency_key");
  CREATE INDEX "payroll_payout_transactions_utr_idx" ON "payroll_payout_transactions" USING btree ("utr");
  CREATE INDEX "payroll_payout_transactions_webhook_event_i_d_idx" ON "payroll_payout_transactions" USING btree ("webhook_event_i_d");
  CREATE INDEX "payroll_payout_transactions_initiated_at_idx" ON "payroll_payout_transactions" USING btree ("initiated_at");
  CREATE INDEX "payroll_payout_transactions_updated_at_idx" ON "payroll_payout_transactions" USING btree ("updated_at");
  CREATE INDEX "payroll_payout_transactions_created_at_idx" ON "payroll_payout_transactions" USING btree ("created_at");
  CREATE UNIQUE INDEX "payoutTxnCode_idx" ON "payroll_payout_transactions" USING btree ("payout_txn_code");
  CREATE UNIQUE INDEX "payrollRun_lineItem_idx" ON "payroll_payout_transactions" USING btree ("payroll_run_id","line_item_id");
  CREATE INDEX "payoutStatus_updatedAt_idx" ON "payroll_payout_transactions" USING btree ("payout_status","updated_at");
  CREATE INDEX "employee_initiatedAt_idx" ON "payroll_payout_transactions" USING btree ("employee_id","initiated_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_candidate_users_id_idx" ON "payload_locked_documents_rels" USING btree ("candidate_users_id");
  CREATE INDEX "payload_locked_documents_rels_clients_id_idx" ON "payload_locked_documents_rels" USING btree ("clients_id");
  CREATE INDEX "payload_locked_documents_rels_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("jobs_id");
  CREATE INDEX "payload_locked_documents_rels_job_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("job_requests_id");
  CREATE INDEX "payload_locked_documents_rels_client_lead_assignments_id_idx" ON "payload_locked_documents_rels" USING btree ("client_lead_assignments_id");
  CREATE INDEX "payload_locked_documents_rels_job_lead_assignments_id_idx" ON "payload_locked_documents_rels" USING btree ("job_lead_assignments_id");
  CREATE INDEX "payload_locked_documents_rels_recruiter_job_assignments__idx" ON "payload_locked_documents_rels" USING btree ("recruiter_job_assignments_id");
  CREATE INDEX "payload_locked_documents_rels_candidate_resumes_id_idx" ON "payload_locked_documents_rels" USING btree ("candidate_resumes_id");
  CREATE INDEX "payload_locked_documents_rels_candidates_id_idx" ON "payload_locked_documents_rels" USING btree ("candidates_id");
  CREATE INDEX "payload_locked_documents_rels_candidate_activities_id_idx" ON "payload_locked_documents_rels" USING btree ("candidate_activities_id");
  CREATE INDEX "payload_locked_documents_rels_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("applications_id");
  CREATE INDEX "payload_locked_documents_rels_application_stage_history__idx" ON "payload_locked_documents_rels" USING btree ("application_stage_history_id");
  CREATE INDEX "payload_locked_documents_rels_candidate_invites_id_idx" ON "payload_locked_documents_rels" USING btree ("candidate_invites_id");
  CREATE INDEX "payload_locked_documents_rels_job_templates_id_idx" ON "payload_locked_documents_rels" USING btree ("job_templates_id");
  CREATE INDEX "payload_locked_documents_rels_interviews_id_idx" ON "payload_locked_documents_rels" USING btree ("interviews_id");
  CREATE INDEX "payload_locked_documents_rels_placements_id_idx" ON "payload_locked_documents_rels" USING btree ("placements_id");
  CREATE INDEX "payload_locked_documents_rels_employee_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("employee_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_employee_compensation_id_idx" ON "payload_locked_documents_rels" USING btree ("employee_compensation_id");
  CREATE INDEX "payload_locked_documents_rels_attendance_shifts_id_idx" ON "payload_locked_documents_rels" USING btree ("attendance_shifts_id");
  CREATE INDEX "payload_locked_documents_rels_holiday_calendars_id_idx" ON "payload_locked_documents_rels" USING btree ("holiday_calendars_id");
  CREATE INDEX "payload_locked_documents_rels_attendance_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("attendance_logs_id");
  CREATE INDEX "payload_locked_documents_rels_attendance_daily_summaries_idx" ON "payload_locked_documents_rels" USING btree ("attendance_daily_summaries_id");
  CREATE INDEX "payload_locked_documents_rels_leave_types_id_idx" ON "payload_locked_documents_rels" USING btree ("leave_types_id");
  CREATE INDEX "payload_locked_documents_rels_leave_balances_id_idx" ON "payload_locked_documents_rels" USING btree ("leave_balances_id");
  CREATE INDEX "payload_locked_documents_rels_leave_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("leave_requests_id");
  CREATE INDEX "payload_locked_documents_rels_performance_cycles_id_idx" ON "payload_locked_documents_rels" USING btree ("performance_cycles_id");
  CREATE INDEX "payload_locked_documents_rels_performance_snapshots_id_idx" ON "payload_locked_documents_rels" USING btree ("performance_snapshots_id");
  CREATE INDEX "payload_locked_documents_rels_performance_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("performance_reviews_id");
  CREATE INDEX "payload_locked_documents_rels_payroll_rule_sets_id_idx" ON "payload_locked_documents_rels" USING btree ("payroll_rule_sets_id");
  CREATE INDEX "payload_locked_documents_rels_payroll_cycles_id_idx" ON "payload_locked_documents_rels" USING btree ("payroll_cycles_id");
  CREATE INDEX "payload_locked_documents_rels_payroll_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("payroll_runs_id");
  CREATE INDEX "payload_locked_documents_rels_payroll_line_items_id_idx" ON "payload_locked_documents_rels" USING btree ("payroll_line_items_id");
  CREATE INDEX "payload_locked_documents_rels_payslips_id_idx" ON "payload_locked_documents_rels" USING btree ("payslips_id");
  CREATE INDEX "payload_locked_documents_rels_payroll_payout_transaction_idx" ON "payload_locked_documents_rels" USING btree ("payroll_payout_transactions_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_candidate_users_id_idx" ON "payload_preferences_rels" USING btree ("candidate_users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "candidate_users_sessions" CASCADE;
  DROP TABLE "candidate_users" CASCADE;
  DROP TABLE "clients_required_documents" CASCADE;
  DROP TABLE "clients" CASCADE;
  DROP TABLE "clients_texts" CASCADE;
  DROP TABLE "jobs_required_skills" CASCADE;
  DROP TABLE "jobs" CASCADE;
  DROP TABLE "jobs_texts" CASCADE;
  DROP TABLE "jobs_rels" CASCADE;
  DROP TABLE "job_requests_proposed_required_skills" CASCADE;
  DROP TABLE "job_requests" CASCADE;
  DROP TABLE "client_lead_assignments" CASCADE;
  DROP TABLE "job_lead_assignments" CASCADE;
  DROP TABLE "recruiter_job_assignments" CASCADE;
  DROP TABLE "candidate_resumes" CASCADE;
  DROP TABLE "candidates_education_details" CASCADE;
  DROP TABLE "candidates_certifications" CASCADE;
  DROP TABLE "candidates_work_experience" CASCADE;
  DROP TABLE "candidates_employer_details" CASCADE;
  DROP TABLE "candidates_employment_test_results" CASCADE;
  DROP TABLE "candidates_languages" CASCADE;
  DROP TABLE "candidates" CASCADE;
  DROP TABLE "candidates_texts" CASCADE;
  DROP TABLE "candidate_activities" CASCADE;
  DROP TABLE "applications" CASCADE;
  DROP TABLE "application_stage_history" CASCADE;
  DROP TABLE "candidate_invites" CASCADE;
  DROP TABLE "job_templates_required_skills" CASCADE;
  DROP TABLE "job_templates" CASCADE;
  DROP TABLE "job_templates_texts" CASCADE;
  DROP TABLE "interviews" CASCADE;
  DROP TABLE "placements" CASCADE;
  DROP TABLE "employee_profiles_weekly_off_days" CASCADE;
  DROP TABLE "employee_profiles" CASCADE;
  DROP TABLE "employee_compensation_custom_earnings" CASCADE;
  DROP TABLE "employee_compensation_custom_deductions" CASCADE;
  DROP TABLE "employee_compensation" CASCADE;
  DROP TABLE "attendance_shifts_weekly_off_days" CASCADE;
  DROP TABLE "attendance_shifts" CASCADE;
  DROP TABLE "holiday_calendars_holidays" CASCADE;
  DROP TABLE "holiday_calendars" CASCADE;
  DROP TABLE "attendance_logs" CASCADE;
  DROP TABLE "attendance_logs_texts" CASCADE;
  DROP TABLE "attendance_daily_summaries" CASCADE;
  DROP TABLE "leave_types" CASCADE;
  DROP TABLE "leave_balances" CASCADE;
  DROP TABLE "leave_requests_workflow_trail" CASCADE;
  DROP TABLE "leave_requests" CASCADE;
  DROP TABLE "performance_cycles" CASCADE;
  DROP TABLE "performance_snapshots" CASCADE;
  DROP TABLE "performance_reviews" CASCADE;
  DROP TABLE "payroll_rule_sets" CASCADE;
  DROP TABLE "payroll_cycles" CASCADE;
  DROP TABLE "payroll_runs" CASCADE;
  DROP TABLE "payroll_line_items" CASCADE;
  DROP TABLE "payslips" CASCADE;
  DROP TABLE "payroll_payout_transactions" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_candidate_users_role";
  DROP TYPE "public"."enum_candidate_users_onboarding_method";
  DROP TYPE "public"."enum_clients_required_documents";
  DROP TYPE "public"."enum_clients_client_visibility_level";
  DROP TYPE "public"."enum_clients_company_size";
  DROP TYPE "public"."enum_clients_status";
  DROP TYPE "public"."enum_jobs_employment_type";
  DROP TYPE "public"."enum_jobs_priority";
  DROP TYPE "public"."enum_jobs_status";
  DROP TYPE "public"."enum_job_requests_intake_source";
  DROP TYPE "public"."enum_job_requests_proposed_employment_type";
  DROP TYPE "public"."enum_job_requests_priority";
  DROP TYPE "public"."enum_job_requests_status";
  DROP TYPE "public"."enum_client_lead_assignments_status";
  DROP TYPE "public"."enum_job_lead_assignments_status";
  DROP TYPE "public"."enum_recruiter_job_assignments_status";
  DROP TYPE "public"."enum_candidates_source";
  DROP TYPE "public"."enum_candidate_activities_type";
  DROP TYPE "public"."enum_candidate_activities_priority";
  DROP TYPE "public"."enum_candidate_activities_status";
  DROP TYPE "public"."enum_applications_stage";
  DROP TYPE "public"."enum_application_stage_history_from_stage";
  DROP TYPE "public"."enum_application_stage_history_to_stage";
  DROP TYPE "public"."enum_candidate_invites_status";
  DROP TYPE "public"."enum_job_templates_employment_type";
  DROP TYPE "public"."enum_job_templates_priority";
  DROP TYPE "public"."enum_interviews_interview_round";
  DROP TYPE "public"."enum_interviews_mode";
  DROP TYPE "public"."enum_interviews_status";
  DROP TYPE "public"."enum_placements_placement_type";
  DROP TYPE "public"."enum_placements_status";
  DROP TYPE "public"."enum_employee_profiles_weekly_off_days";
  DROP TYPE "public"."enum_employee_profiles_employment_status";
  DROP TYPE "public"."enum_employee_compensation_tax_regime";
  DROP TYPE "public"."enum_attendance_shifts_weekly_off_days";
  DROP TYPE "public"."enum_holiday_calendars_holidays_type";
  DROP TYPE "public"."enum_attendance_logs_source";
  DROP TYPE "public"."enum_attendance_daily_summaries_status";
  DROP TYPE "public"."enum_leave_types_key";
  DROP TYPE "public"."enum_leave_types_min_unit";
  DROP TYPE "public"."enum_leave_requests_workflow_trail_action";
  DROP TYPE "public"."enum_leave_requests_workflow_trail_from_status";
  DROP TYPE "public"."enum_leave_requests_workflow_trail_to_status";
  DROP TYPE "public"."enum_leave_requests_leave_unit";
  DROP TYPE "public"."enum_leave_requests_status";
  DROP TYPE "public"."enum_performance_cycles_status";
  DROP TYPE "public"."enum_performance_reviews_status";
  DROP TYPE "public"."enum_payroll_cycles_status";
  DROP TYPE "public"."enum_payroll_runs_status";
  DROP TYPE "public"."enum_payroll_line_items_status";
  DROP TYPE "public"."enum_payroll_line_items_payment_status";
  DROP TYPE "public"."enum_payroll_line_items_payment_mode";
  DROP TYPE "public"."enum_payslips_status";
  DROP TYPE "public"."enum_payroll_payout_transactions_payout_status";`)
}
