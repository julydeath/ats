import configPromise from '@payload-config'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getPayload, type Payload } from 'payload'

import { env } from '@/lib/env'
import { parseResumeBuffer } from './resume-parser'

export const MAX_RESUME_IMPORT_FILES = 5
export const MAX_RESUME_IMPORT_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const RESUME_IMPORT_MIME_TYPES = new Set<string>([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

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
  id: number | string
  resume?: number | string | ResumeDocumentLike | null
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
      keys.push(decodeURIComponent(resume.url.slice(env.S3_PUBLIC_BASE_URL.length).replace(/^\/+/, '')))
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

const readStoredResumeBuffer = async (resume: ResumeDocumentLike): Promise<ResumeImportFileBuffer> => {
  const filename = resume.filename || 'resume'
  const mimeType = resume.mimeType || 'application/octet-stream'

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
    mimeType: response.headers.get('content-type') || mimeType,
  }
}

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

      return acc
    },
    {
      createdCount: 0,
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
          : counts.createdCount === totalCount
            ? 'completed'
            : counts.failedCount > 0
              ? 'completedWithErrors'
              : 'readyForReview'

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

export const processResumeImportBatch = async ({
  batchID,
  itemBuffers = {},
  maxItems = MAX_RESUME_IMPORT_FILES,
}: {
  batchID: number
  itemBuffers?: Record<string, ResumeImportFileBuffer>
  maxItems?: number
}) => {
  const payload = await getPayload({ config: configPromise })
  const staleProcessingCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  await payload.update({
    collection: 'candidate-resume-import-items',
    data: {
      error: 'Previous parsing attempt timed out. Queued for retry.',
      status: 'queued',
    },
    overrideAccess: true,
    where: {
      and: [
        {
          batch: {
            equals: batchID,
          },
        },
        {
          status: {
            equals: 'processing',
          },
        },
        {
          startedAt: {
            less_than: staleProcessingCutoff,
          },
        },
      ],
    },
  })

  await payload.update({
    collection: 'candidate-resume-import-batches',
    data: {
      startedAt: new Date().toISOString(),
      status: 'processing',
    },
    id: batchID,
    overrideAccess: true,
  })

  const items = await payload.find({
    collection: 'candidate-resume-import-items',
    depth: 1,
    limit: maxItems,
    overrideAccess: true,
    pagination: false,
    sort: 'createdAt',
    where: {
      and: [
        {
          batch: {
            equals: batchID,
          },
        },
        {
          status: {
            in: ['queued'],
          },
        },
      ],
    },
  })

  await updateResumeImportBatchStats({ batchID, payload })

  for (const item of items.docs as ImportItemLike[]) {
    const itemID = toNumericID(item.id)

    if (!itemID) {
      continue
    }

    try {
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

      await updateResumeImportBatchStats({ batchID, payload })

      const resumeFile =
        itemBuffers[String(itemID)] ||
        (await readStoredResumeBuffer(await getResumeDocument({ payload, resume: item.resume })))

      const parsedResume = await parseResumeBuffer({
        buffer: resumeFile.buffer,
        filename: resumeFile.filename,
        mimeType: resumeFile.mimeType,
      })

      await payload.update({
        collection: 'candidate-resume-import-items',
        data: {
          error: null,
          extractedTextPreview: parsedResume.extractedTextPreview,
          parsedData: parsedResume.parsed,
          processedAt: new Date().toISOString(),
          status: 'needsReview',
          warnings: parsedResume.warnings.map((message) => ({ message })),
        },
        id: itemID,
        overrideAccess: true,
      })
    } catch (error) {
      await payload.update({
        collection: 'candidate-resume-import-items',
        data: {
          error: error instanceof Error ? error.message : 'Resume parsing failed.',
          processedAt: new Date().toISOString(),
          status: 'failed',
        },
        id: itemID,
        overrideAccess: true,
      })
    }

    await updateResumeImportBatchStats({ batchID, payload })
  }
}
