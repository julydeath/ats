import 'dotenv/config'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
  normalizeApplicationStage,
  type ApplicationStage,
} from '@/lib/constants/recruitment'

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

const run = async () => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'applications',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: {
      id: true,
      stage: true,
    },
  })

  if (result.docs.length === 0) {
    payload.logger.info('No legacy application stages found.')
    return
  }

  let updatedCount = 0

  for (const item of result.docs) {
    const id = toNumericID(item.id)
    const normalized = normalizeApplicationStage(item.stage) as ApplicationStage | null

    if (!id || !normalized || normalized === item.stage) {
      continue
    }

    await payload.update({
      collection: 'applications',
      context: {
        applicationStageCommentOverride: `Stage migrated from legacy value "${String(item.stage)}".`,
        skipStageTransitionValidation: true,
      },
      data: {
        stage: normalized,
      },
      id,
      overrideAccess: true,
    })

    updatedCount += 1
  }

  payload.logger.info(`Migrated ${updatedCount} application record(s) to the new stage flow.`)
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
