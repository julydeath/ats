import configPromise from '@payload-config'
import { after, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { getPayloadAuthHeaders } from '@/lib/auth/payload-auth-headers'
import {
  MAX_RESUME_IMPORT_FILES,
  MAX_RESUME_IMPORT_FILE_SIZE_BYTES,
  RESUME_IMPORT_MIME_TYPES,
  processResumeImportBatch,
  type ResumeImportFileBuffer,
} from '@/lib/candidates/resume-imports'
import { APP_ROUTES } from '@/lib/constants/routes'

export const runtime = 'nodejs'

const readString = (value: FormDataEntryValue | null): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const parseNumericID = (value: FormDataEntryValue | null): number | null => {
  const raw = readString(value)

  if (!raw || !/^\d+$/.test(raw)) {
    return null
  }

  return Number(raw)
}

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

const buildFailureURL = (request: Request, message: string): URL => {
  const failureURL = new URL(APP_ROUTES.internal.candidates.importsNew, request.url)
  failureURL.searchParams.set('error', message)
  return failureURL
}

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await getPayloadAuthHeaders(request.headers) })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter', 'recruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()
  const sourceJobID = parseNumericID(formData.get('sourceJob'))
  const resumeFiles = formData
    .getAll('resumes')
    .filter((value): value is File => value instanceof File && value.size > 0)
    .slice(0, MAX_RESUME_IMPORT_FILES + 1)

  if (resumeFiles.length === 0) {
    return NextResponse.redirect(buildFailureURL(request, 'Choose at least one resume file.'), 303)
  }

  if (resumeFiles.length > MAX_RESUME_IMPORT_FILES) {
    return NextResponse.redirect(
      buildFailureURL(request, `Upload a maximum of ${MAX_RESUME_IMPORT_FILES} resumes per bundle.`),
      303,
    )
  }

  for (const resumeFile of resumeFiles) {
    if (!RESUME_IMPORT_MIME_TYPES.has(resumeFile.type)) {
      return NextResponse.redirect(
        buildFailureURL(request, `${resumeFile.name} must be a PDF, DOC, or DOCX file.`),
        303,
      )
    }

    if (resumeFile.size > MAX_RESUME_IMPORT_FILE_SIZE_BYTES) {
      return NextResponse.redirect(
        buildFailureURL(request, `${resumeFile.name} is larger than 10 MB.`),
        303,
      )
    }
  }

  const currentUserID = toNumericID(internalUser?.id)
  const createdResumeIDs: number[] = []
  const createdItemIDs: number[] = []
  let createdBatchID: number | null = null

  try {
    const batch = await payload.create({
      collection: 'candidate-resume-import-batches',
      data: {
        queuedCount: resumeFiles.length,
        sourceJob: sourceJobID ?? undefined,
        status: 'queued',
        totalCount: resumeFiles.length,
        uploadedBy: currentUserID ?? undefined,
      },
      overrideAccess: false,
      user: internalUser,
    })

    createdBatchID = batch.id

    const itemBuffers: Record<string, ResumeImportFileBuffer> = {}

    for (const resumeFile of resumeFiles) {
      const buffer = Buffer.from(await resumeFile.arrayBuffer())
      const resume = await payload.create({
        collection: 'candidate-resumes',
        data: {
          alt: resumeFile.name.replace(/\.[^.]+$/, '') || 'Imported Resume',
          sourceJob: sourceJobID ?? undefined,
          uploadedBy: currentUserID ?? undefined,
        },
        file: {
          data: buffer,
          mimetype: resumeFile.type,
          name: resumeFile.name,
          size: resumeFile.size,
        },
        overrideAccess: false,
        user: internalUser,
      })

      createdResumeIDs.push(resume.id)

      const item = await payload.create({
        collection: 'candidate-resume-import-items',
        data: {
          batch: batch.id,
          resume: resume.id,
          sourceJob: sourceJobID ?? undefined,
          status: 'queued',
          uploadedBy: currentUserID ?? undefined,
        },
        overrideAccess: false,
        user: internalUser,
      })

      createdItemIDs.push(item.id)
      itemBuffers[String(item.id)] = {
        buffer,
        filename: resume.filename || resumeFile.name,
        mimeType: resume.mimeType || resumeFile.type,
      }
    }

    after(async () => {
      try {
        await processResumeImportBatch({
          batchID: batch.id,
          itemBuffers,
        })
      } catch (error) {
        console.error('Bulk resume import processing failed', error)
      }
    })

    const successURL = new URL(`${APP_ROUTES.internal.candidates.imports}/${batch.id}`, request.url)
    successURL.searchParams.set('success', 'batchCreated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    for (const itemID of createdItemIDs) {
      await payload
        .delete({
          collection: 'candidate-resume-import-items',
          id: itemID,
          overrideAccess: true,
        })
        .catch(() => undefined)
    }

    if (createdBatchID !== null) {
      await payload
        .delete({
          collection: 'candidate-resume-import-batches',
          id: createdBatchID,
          overrideAccess: true,
        })
        .catch(() => undefined)
    }

    for (const resumeID of createdResumeIDs) {
      await payload
        .delete({
          collection: 'candidate-resumes',
          id: resumeID,
          overrideAccess: true,
        })
        .catch(() => undefined)
    }

    return NextResponse.redirect(
      buildFailureURL(
        request,
        error instanceof Error ? error.message : 'Unable to start resume import. Please retry.',
      ),
      303,
    )
  }
}
