import 'dotenv/config'

import configPromise from '../src/payload.config'
import { getPayload, type CollectionSlug } from 'payload'

type BackfillTarget = {
  collection: CollectionSlug
  field: string
  label: string
  prefix: string
}

type InternalUser = {
  id: number | string
  role?: string
  email?: string
  fullName?: string
}

type BackfillCounters = {
  failed: number
  scanned: number
  updated: number
}

const TARGETS: BackfillTarget[] = [
  { collection: 'clients', field: 'clientCode', label: 'Clients', prefix: 'CLT' },
  { collection: 'jobs', field: 'jobCode', label: 'Jobs', prefix: 'JOB' },
  { collection: 'candidates', field: 'candidateCode', label: 'Candidates', prefix: 'CAN' },
  { collection: 'applications', field: 'applicationCode', label: 'Applications', prefix: 'APP' },
  { collection: 'job-requests', field: 'jobRequestCode', label: 'Job Requests', prefix: 'JREQ' },
]

const pad = (value: number, size: number): string => String(value).padStart(size, '0')

const buildCodeStamp = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = pad(now.getMonth() + 1, 2)
  const day = pad(now.getDate(), 2)
  const hour = pad(now.getHours(), 2)
  const minute = pad(now.getMinutes(), 2)
  return `${year}${month}${day}${hour}${minute}`
}

const createCandidateCode = (prefix: string): string =>
  `${prefix}-${buildCodeStamp()}-${pad(Math.floor(Math.random() * 10000), 4)}`

const resolveAdminUser = async (payload: Awaited<ReturnType<typeof getPayload>>): Promise<InternalUser> => {
  const admins = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      role: {
        equals: 'admin',
      },
    },
  })

  if (admins.totalDocs === 0) {
    throw new Error('No admin user found. Create an admin account and rerun.')
  }

  return admins.docs[0] as InternalUser
}

const findMissingDocs = async ({
  adminUser,
  payload,
  target,
}: {
  adminUser: InternalUser
  payload: Awaited<ReturnType<typeof getPayload>>
  target: BackfillTarget
}): Promise<Array<{ id: number | string }>> => {
  const docs: Array<{ id: number | string }> = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const missingWhere = {
      or: [
        {
          [target.field]: {
            exists: false,
          },
        },
        {
          [target.field]: {
            equals: null,
          },
        },
        {
          [target.field]: {
            equals: '',
          },
        },
      ],
    }

    const result = await payload.find({
      collection: target.collection,
      depth: 0,
      limit: 200,
      overrideAccess: false,
      page,
      user: adminUser,
      where: missingWhere as never,
    } as Parameters<typeof payload.find>[0])

    docs.push(...(result.docs as Array<{ id: number | string }>))
    page += 1
    hasNextPage = Boolean(result.hasNextPage)
  }

  return docs
}

const generateUniqueCode = async ({
  adminUser,
  payload,
  target,
}: {
  adminUser: InternalUser
  payload: Awaited<ReturnType<typeof getPayload>>
  target: BackfillTarget
}): Promise<string> => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const nextCode = createCandidateCode(target.prefix)
    const codeWhere = {
      [target.field]: {
        equals: nextCode,
      },
    }

    const existing = await payload.find({
      collection: target.collection,
      depth: 0,
      limit: 1,
      overrideAccess: false,
      pagination: false,
      user: adminUser,
      where: codeWhere as never,
    } as Parameters<typeof payload.find>[0])

    if (existing.totalDocs === 0) {
      return nextCode
    }
  }

  throw new Error(`Could not generate unique ${target.field}.`)
}

const runTargetBackfill = async ({
  adminUser,
  payload,
  target,
}: {
  adminUser: InternalUser
  payload: Awaited<ReturnType<typeof getPayload>>
  target: BackfillTarget
}): Promise<BackfillCounters> => {
  const docs = await findMissingDocs({ adminUser, payload, target })
  const counters: BackfillCounters = {
    failed: 0,
    scanned: docs.length,
    updated: 0,
  }

  if (docs.length === 0) {
    return counters
  }

  console.log(`\n[${target.label}] Missing ${target.field}: ${docs.length}`)

  for (const doc of docs) {
    try {
      const code = await generateUniqueCode({ adminUser, payload, target })
      const updateData = {
        [target.field]: code,
      }

      await payload.update({
        collection: target.collection,
        data: updateData as never,
        id: doc.id,
        overrideAccess: false,
        user: adminUser,
      } as Parameters<typeof payload.update>[0])

      counters.updated += 1
    } catch (error) {
      counters.failed += 1
      const reason = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${target.label}] Failed for doc ${String(doc.id)}: ${reason}`)
    }
  }

  return counters
}

const main = async () => {
  try {
    const payload = await getPayload({ config: configPromise })
    const adminUser = await resolveAdminUser(payload)
    const identity = adminUser.fullName || adminUser.email || `admin#${String(adminUser.id)}`
    console.log(`Running business ID backfill as: ${identity}`)

    let totalScanned = 0
    let totalUpdated = 0
    let totalFailed = 0

    for (const target of TARGETS) {
      const result = await runTargetBackfill({ adminUser, payload, target })
      totalScanned += result.scanned
      totalUpdated += result.updated
      totalFailed += result.failed

      console.log(
        `[${target.label}] scanned=${result.scanned} updated=${result.updated} failed=${result.failed}`,
      )
    }

    console.log('\nBackfill complete:')
    console.log(`- scanned: ${totalScanned}`)
    console.log(`- updated: ${totalUpdated}`)
    console.log(`- failed : ${totalFailed}`)

    process.exit(totalFailed > 0 ? 1 : 0)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Backfill failed: ${message}`)
    process.exit(1)
  }
}

void main()
