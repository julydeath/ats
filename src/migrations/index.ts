import * as migration_20260720_154211_init_schema from './20260720_154211_init_schema';
import * as migration_20260724_000001_optional_candidate_source_job from './20260724_000001_optional_candidate_source_job';
import * as migration_20260810_000001_update_application_pipeline_stages from './20260810_000001_update_application_pipeline_stages';
import * as migration_20260810_000002_candidate_resume_imports from './20260810_000002_candidate_resume_imports';
import * as migration_20261020_000001_clients_created_by from './20261020_000001_clients_created_by';
import * as migration_20261027_000001_quick_resume_intake from './20261027_000001_quick_resume_intake';
import * as migration_20261028_000001_bulk_upload_role from './20261028_000001_bulk_upload_role';
import * as migration_20261028_000002_application_lead_recruiter from './20261028_000002_application_lead_recruiter';
import * as migration_20261030_000001_lead_managed_applications from './20261030_000001_lead_managed_applications';

export const migrations = [
  {
    up: migration_20260720_154211_init_schema.up,
    down: migration_20260720_154211_init_schema.down,
    name: '20260720_154211_init_schema'
  },
  {
    up: migration_20260724_000001_optional_candidate_source_job.up,
    down: migration_20260724_000001_optional_candidate_source_job.down,
    name: '20260724_000001_optional_candidate_source_job'
  },
  {
    up: migration_20260810_000001_update_application_pipeline_stages.up,
    down: migration_20260810_000001_update_application_pipeline_stages.down,
    name: '20260810_000001_update_application_pipeline_stages'
  },
  {
    up: migration_20260810_000002_candidate_resume_imports.up,
    down: migration_20260810_000002_candidate_resume_imports.down,
    name: '20260810_000002_candidate_resume_imports'
  },
  {
    up: migration_20261020_000001_clients_created_by.up,
    down: migration_20261020_000001_clients_created_by.down,
    name: '20261020_000001_clients_created_by'
  },
  {
    up: migration_20261027_000001_quick_resume_intake.up,
    down: migration_20261027_000001_quick_resume_intake.down,
    name: '20261027_000001_quick_resume_intake'
  },
  {
    up: migration_20261028_000001_bulk_upload_role.up,
    down: migration_20261028_000001_bulk_upload_role.down,
    name: '20261028_000001_bulk_upload_role'
  },
  {
    up: migration_20261028_000002_application_lead_recruiter.up,
    down: migration_20261028_000002_application_lead_recruiter.down,
    name: '20261028_000002_application_lead_recruiter'
  },
  {
    up: migration_20261030_000001_lead_managed_applications.up,
    down: migration_20261030_000001_lead_managed_applications.down,
    name: '20261030_000001_lead_managed_applications'
  },
];
