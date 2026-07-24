import * as migration_20260720_154211_init_schema from './20260720_154211_init_schema';
import * as migration_20260724_000001_optional_candidate_source_job from './20260724_000001_optional_candidate_source_job';

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
];
