import configPromise from '@payload-config'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { APIError, getPayload, type Payload, type Where } from 'payload'

import type { Candidate } from '@/payload-types'

import { env } from '@/lib/env'
import { buildCandidateDuplicateSignals } from './dedupe'
import { getResumeImportMimeType } from './resume-import-validation'
import { parseResumeEssentials, ResumeUnreadableError } from './resume-parser'

export const MAX_RESUME_IMPORT_FILES = 10
// Each file is sent in its own request, which keeps every upload under the
// Vercel serverless request body limit (~4.5 MB).
export const MAX_RESUME_IMPORT_FILE_SIZE_BYTES = 4 * 1024 * 1024
// Items stuck in "processing" longer than this are treated as timed out.
export const RESUME_IMPORT_STALE_MS = 10 * 60 * 1000

export type ResumeImportFileBuffer = {
  buffer: Buffer
  filename: string
  mimeType: string
}

type ResumeDocumentLike = {
  filename?: string | null
  mimeType?: string | null
  url?: string | null
}

type ImportItemLike = {
  attemptCount?: number | null
  batch?: number | string | { id: number | string } | null
  id: number | string
  resume?: number | string | ResumeDocumentLike | null
  uploadedBy?: number | string | { id: number | string } | null
}

const s3Client = env.S3_UPLOADS_ENABLED
  ? new S3Client({
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE || undefined,
      region: env.S3_REGION,
    })
  : null

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

const getResumeDocument = async ({
  payload,
  resume,
}: {
  payload: Payload
  resume: ImportItemLike['resume']
}): Promise<ResumeDocumentLike> => {
  if (resume && typeof resume === 'object') {
    return resume
  }

  const resumeID = toNumericID(resume)
  if (!resumeID) {
    throw new Error('Import item is missing its uploaded resume.')
  }

  return payload.findByID({
    collection: 'candidate-resumes',
    depth: 0,
    id: resumeID,
    overrideAccess: true,
    select: {
      filename: true,
      mimeType: true,
      url: true,
    },
  })
}

const unique = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))

const keyFromURL = (url: string): string | null => {
  try {
    const parsedURL = new URL(url)
    const pathParts = parsedURL.pathname.split('/').filter(Boolean).map(decodeURIComponent)

    if (pathParts.length === 0) {
      return null
    }

    if (pathParts[0] === env.S3_BUCKET && pathParts.length > 1) {
      return pathParts.slice(1).join('/')
    }

    return pathParts.join('/')
  } catch {
    return null
  }
}

const getStoredResumeKeys = (resume: ResumeDocumentLike): string[] => {
  const keys: string[] = []

  if (resume.url) {
    keys.push(keyFromURL(resume.url) || '')

    if (env.S3_PUBLIC_BASE_URL && resume.url.startsWith(env.S3_PUBLIC_BASE_URL)) {
      keys.push(
        decodeURIComponent(resume.url.slice(env.S3_PUBLIC_BASE_URL.length).replace(/^\/+/, '')),
      )
    }
  }

  if (resume.filename) {
    keys.push(resume.filename)
    keys.push(`candidate-resumes/${resume.filename}`)
    keys.push(`media/candidate-resumes/${resume.filename}`)
  }

  return unique(keys)
}

const bodyToBuffer = async (body: unknown): Promise<Buffer> => {
  if (!body) {
    throw new Error('Stored resume response was empty.')
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body)
  }

  if (
    typeof body === 'object' &&
    body !== null &&
    'transformToByteArray' in body &&
    typeof body.transformToByteArray === 'function'
  ) {
    return Buffer.from(await body.transformToByteArray())
  }

  if (typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = []

    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk))
    }

    return Buffer.concat(chunks)
  }

  throw new Error('Stored resume stream could not be read.')
}

const readStoredResumeBuffer = async (
  resume: ResumeDocumentLike,
): Promise<ResumeImportFileBuffer> => {
  const filename = resume.filename || 'resume'
  const mimeType =
    getResumeImportMimeType({ filename, mimeType: resume.mimeType }) ||
    resume.mimeType ||
    'application/octet-stream'

  if (s3Client) {
    const keys = getStoredResumeKeys(resume)
    let lastError: unknown

    for (const key of keys) {
      try {
        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: key,
          }),
        )

        return {
          buffer: await bodyToBuffer(response.Body),
          filename,
          mimeType,
        }
      } catch (error) {
        lastError = error
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Stored resume could not be read from object storage.')
  }

  if (!resume.url) {
    throw new Error('Stored resume does not have a downloadable URL.')
  }

  const resumeURL = /^https?:\/\//i.test(resume.url)
    ? resume.url
    : `${env.NEXT_PUBLIC_APP_URL}${resume.url.startsWith('/') ? '' : '/'}${resume.url}`
  const response = await fetch(resumeURL)

  if (!response.ok) {
    throw new Error(`Stored resume download failed with ${response.status}.`)
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    filename,
    mimeType:
      getResumeImportMimeType({
        filename,
        mimeType: response.headers.get('content-type'),
      }) || mimeType,
  }
}

const readRelationNumericID = (value: unknown): number | null =>
  toNumericID(value && typeof value === 'object' && 'id' in value ? value.id : value)

export const updateResumeImportBatchStats = async ({
  batchID,
  payload,
}: {
  batchID: number
  payload: Payload
}) => {
  const items = await payload.find({
    collection: 'candidate-resume-import-items',
    depth: 0,
    limit: 500,
    overrideAccess: true,
    pagination: false,
    select: {
      status: true,
    },
    where: {
      batch: {
        equals: batchID,
      },
    },
  })

  const counts = items.docs.reduce(
    (acc, item) => {
      const status = String(item.status || 'queued')

      if (status === 'queued') acc.queuedCount += 1
      if (status === 'processing') acc.processingCount += 1
      if (status === 'needsReview') acc.parsedCount += 1
      if (status === 'failed') acc.failedCount += 1
      if (status === 'candidateCreated') acc.createdCount += 1
      if (status === 'duplicate') acc.duplicateCount += 1

      return acc
    },
    {
      createdCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      parsedCount: 0,
      processingCount: 0,
      queuedCount: 0,
    },
  )

  const totalCount = items.docs.length
  const hasPendingWork = counts.queuedCount > 0 || counts.processingCount > 0
  const nextStatus =
    totalCount === 0
      ? 'queued'
      : hasPendingWork
        ? 'processing'
        : counts.failedCount === totalCount
          ? 'failed'
          : counts.parsedCount > 0
            ? 'readyForReview'
            : counts.failedCount > 0
              ? 'completedWithErrors'
              : 'completed'

  await payload.update({
    collection: 'candidate-resume-import-batches',
    data: {
      ...counts,
      completedAt: hasPendingWork ? null : new Date().toISOString(),
      status: nextStatus,
      totalCount,
    },
    id: batchID,
    overrideAccess: true,
  })
}

const findExistingCandidateID = async ({
  email,
  payload,
  phone,
}: {
  email?: string
  payload: Payload
  phone?: string
}): Promise<number | null> => {
  const signals = buildCandidateDuplicateSignals({ email, phone })
  const or: Where[] = [
    ...(signals.normalizedEmail ? [{ normalizedEmail: { equals: signals.normalizedEmail } }] : []),
    ...(signals.normalizedPhone ? [{ normalizedPhone: { equals: signals.normalizedPhone } }] : []),
  ]

  if (or.length === 0) {
    return null
  }

  const existing = await payload.find({
    collection: 'candidates',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    select: {},
    where: {
      or,
    },
  })

  return existing.docs[0]?.id ?? null
}

type ItemOutcome =
  | { candidateID: number; status: 'candidateCreated' | 'duplicate'; warnings: string[] }
  | { error: string; status: 'failed'; warnings: string[] }

const resolveItemOutcome = async ({
  batch,
  file,
  payload,
  resumeID,
  uploadedByID,
}: {
  batch: { role?: string | null; source?: string | null; sourceDetails?: string | null }
  file: ResumeImportFileBuffer
  payload: Payload
  resumeID: number | null
  uploadedByID: number | null
}): Promise<ItemOutcome & { extractedTextPreview?: string; parsedData?: unknown }> => {
  let parsed: Awaited<ReturnType<typeof parseResumeEssentials>>

  try {
    parsed = await parseResumeEssentials(file)
  } catch (error) {
    return {
      error:
        error instanceof ResumeUnreadableError
          ? error.message
          : 'This file could not be opened. It may be corrupted or password protected.',
      status: 'failed',
      warnings: [],
    }
  }

  const { essentials } = parsed
  const base = {
    extractedTextPreview: parsed.extractedTextPreview,
    parsedData: essentials,
  }

  if (!essentials.fullName) {
    return {
      ...base,
      error: "Couldn't find the candidate's name in this resume. Add them manually.",
      status: 'failed',
      warnings: parsed.warnings,
    }
  }

  if (!essentials.email && !essentials.phone) {
    return {
      ...base,
      error: `No email or phone number found for ${essentials.fullName}. Add them manually.`,
      status: 'failed',
      warnings: parsed.warnings,
    }
  }

  const existingID = await findExistingCandidateID({ ...essentials, payload })
  if (existingID) {
    return {
      ...base,
      candidateID: existingID,
      status: 'duplicate',
      warnings: parsed.warnings,
    }
  }

  const warnings = [...parsed.warnings]
  if (essentials.skills.length === 0) warnings.push('Skills not found; add them later.')
  if (essentials.totalExperienceYears === undefined) {
    warnings.push('Experience not found; add it later.')
  }

  try {
    const candidate = await payload.create({
      collection: 'candidates',
      data: {
        email: essentials.email,
        firstName: essentials.firstName,
        fullName: essentials.fullName,
        jobTitle: batch.role || undefined,
        lastName: essentials.lastName,
        phone: essentials.phone,
        resume: resumeID ?? undefined,
        skills: essentials.skills,
        source: (batch.source || 'other') as Candidate['source'],
        sourceDetails: batch.sourceDetails || undefined,
        sourcedBy: uploadedByID ?? undefined,
        totalExperienceMonths: essentials.totalExperienceMonths,
        totalExperienceYears: essentials.totalExperienceYears,
      },
      overrideAccess: true,
    })

    return { ...base, candidateID: candidate.id, status: 'candidateCreated', warnings }
  } catch (error) {
    // Another upload may have created the same person moments ago.
    if (error instanceof APIError && error.status === 409) {
      const raceID = await findExistingCandidateID({ ...essentials, payload })
      if (raceID) {
        return { ...base, candidateID: raceID, status: 'duplicate', warnings }
      }
    }

    return {
      ...base,
      error: error instanceof Error ? error.message : 'Candidate could not be saved.',
      status: 'failed',
      warnings,
    }
  }
}

// Parses one uploaded resume and turns it straight into a candidate (or links
// it to an existing candidate with the same email/phone). Never throws.
export const processResumeImportItem = async ({
  file,
  itemID,
  payload: providedPayload,
}: {
  file?: ResumeImportFileBuffer
  itemID: number
  payload?: Payload
}) => {
  const payload = providedPayload || (await getPayload({ config: configPromise }))
  let batchID: number | null = null

  try {
    const item = (await payload.findByID({
      collection: 'candidate-resume-import-items',
      depth: 0,
      id: itemID,
      overrideAccess: true,
    })) as ImportItemLike

    batchID = readRelationNumericID(item.batch)

    const batch = batchID
      ? await payload.findByID({
          collection: 'candidate-resume-import-batches',
          depth: 0,
          id: batchID,
          overrideAccess: true,
          select: {
            role: true,
            source: true,
            sourceDetails: true,
          },
        })
      : {}

    await payload.update({
      collection: 'candidate-resume-import-items',
      data: {
        attemptCount: (item.attemptCount || 0) + 1,
        error: null,
        startedAt: new Date().toISOString(),
        status: 'processing',
      },
      id: itemID,
      overrideAccess: true,
    })

    const resumeID = readRelationNumericID(item.resume)
    const resumeFile =
      file || (await readStoredResumeBuffer(await getResumeDocument({ payload, resume: item.resume })))
    const outcome = await resolveItemOutcome({
      batch,
      file: resumeFile,
      payload,
      resumeID,
      uploadedByID: readRelationNumericID(item.uploadedBy),
    })
    const now = new Date().toISOString()

    await payload.update({
      collection: 'candidate-resume-import-items',
      data: {
        candidate: 'candidateID' in outcome ? outcome.candidateID : null,
        candidateCreatedAt: outcome.status === 'candidateCreated' ? now : null,
        error: 'error' in outcome ? outcome.error : null,
        extractedTextPreview: outcome.extractedTextPreview,
        parsedData: outcome.parsedData as Record<string, unknown> | undefined,
        processedAt: now,
        status: outcome.status,
        warnings: outcome.warnings.map((message) => ({ message })),
      },
      id: itemID,
      overrideAccess: true,
    })
  } catch (error) {
    console.error('Resume import item processing failed', error)

    await payload
      .update({
        collection: 'candidate-resume-import-items',
        data: {
          error: 'Something went wrong while reading this resume. Retry or add manually.',
          processedAt: new Date().toISOString(),
          status: 'failed',
        },
        id: itemID,
        overrideAccess: true,
      })
      .catch(() => undefined)
  }

  if (batchID) {
    await updateResumeImportBatchStats({ batchID, payload }).catch(() => undefined)
  }
}

// Re-runs queued (and timed-out) items in a batch, e.g. after "Retry".
export const processResumeImportBatch = async ({
  batchID,
  maxItems = MAX_RESUME_IMPORT_FILES,
}: {
  batchID: number
  maxItems?: number
}) => {
  const payload = await getPayload({ config: configPromise })

  await payload.update({
    collection: 'candidate-resume-import-items',
    data: {
      status: 'queued',
    },
    overrideAccess: true,
    where: {
      and: [
        { batch: { equals: batchID } },
        { status: { equals: 'processing' } },
        { startedAt: { less_than: new Date(Date.now() - RESUME_IMPORT_STALE_MS).toISOString() } },
      ],
    },
  })

  const items = await payload.find({
    collection: 'candidate-resume-import-items',
    depth: 0,
    limit: maxItems,
    overrideAccess: true,
    pagination: false,
    select: {},
    sort: 'createdAt',
    where: {
      and: [{ batch: { equals: batchID } }, { status: { equals: 'queued' } }],
    },
  })

  for (const item of items.docs) {
    await processResumeImportItem({ itemID: item.id, payload })
  }

  await updateResumeImportBatchStats({ batchID, payload })
}
