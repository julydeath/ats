import * as migration_20260720_154211_init_schema from './20260720_154211_init_schema';
import * as migration_20260724_000001_optional_candidate_source_job from './20260724_000001_optional_candidate_source_job';
import * as migration_20260810_000001_update_application_pipeline_stages from './20260810_000001_update_application_pipeline_stages';
import * as migration_20260810_000002_candidate_resume_imports from './20260810_000002_candidate_resume_imports';

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
];
