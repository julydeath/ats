import configPromise from '@payload-config'
import { after, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { getPayloadAuthHeaders } from '@/lib/auth/payload-auth-headers'
import {
  MAX_RESUME_IMPORT_FILES,
  MAX_RESUME_IMPORT_FILE_SIZE_BYTES,
  processResumeImportItem,
} from '@/lib/candidates/resume-imports'
import { getResumeImportMimeType } from '@/lib/candidates/resume-import-validation'
import { extractRelationshipID } from '@/lib/utils/relationships'

export const runtime = 'nodejs'
export const maxDuration = 60

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

// Receives one resume of a bulk upload, stores it, and parses it into a
// candidate in the background after the response is sent.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await getPayloadAuthHeaders(request.headers) })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter', 'recruiter'])) {
    return NextResponse.json({ error: 'You do not have access to bulk upload.' }, { status: 403 })
  }

  const batchID = toNumericID((await params).id)
  const currentUserID = toNumericID(internalUser?.id)

  if (!batchID) {
    return NextResponse.json({ error: 'Upload not found.' }, { status: 404 })
  }

  const batch = await payload
    .findByID({
      collection: 'candidate-resume-import-batches',
      depth: 0,
      id: batchID,
      overrideAccess: false,
      select: {
        totalCount: true,
        uploadedBy: true,
      },
      user: internalUser,
    })
    .catch(() => null)

  if (!batch || String(extractRelationshipID(batch.uploadedBy)) !== String(currentUserID)) {
    return NextResponse.json({ error: 'Upload not found.' }, { status: 404 })
  }

  if ((batch.totalCount || 0) >= MAX_RESUME_IMPORT_FILES) {
    return NextResponse.json(
      { error: `Only ${MAX_RESUME_IMPORT_FILES} resumes can be uploaded at a time.` },
      { status: 400 },
    )
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('resume')

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'The file is empty.' }, { status: 400 })
  }

  const mimeType = getResumeImportMimeType({ filename: file.name, mimeType: file.type })
  if (!mimeType || mimeType === 'application/msword') {
    return NextResponse.json({ error: 'Only PDF or DOCX files are supported.' }, { status: 400 })
  }

  if (file.size > MAX_RESUME_IMPORT_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File is larger than 4 MB.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const resume = await payload.create({
    collection: 'candidate-resumes',
    data: {
      alt: file.name.replace(/\.[^.]+$/, '') || 'Imported Resume',
      uploadedBy: currentUserID ?? undefined,
    },
    file: {
      data: buffer,
      mimetype: mimeType,
      name: file.name,
      size: file.size,
    },
    overrideAccess: false,
    user: internalUser,
  })

  const item = await payload.create({
    collection: 'candidate-resume-import-items',
    data: {
      batch: batchID,
      resume: resume.id,
      status: 'queued',
      uploadedBy: currentUserID ?? undefined,
    },
    overrideAccess: false,
    user: internalUser,
  })

  await payload.update({
    collection: 'candidate-resume-import-batches',
    data: {
      status: 'processing',
      totalCount: (batch.totalCount || 0) + 1,
    },
    id: batchID,
    overrideAccess: true,
  })

  after(() =>
    processResumeImportItem({
      file: {
        buffer,
        filename: resume.filename || file.name,
        mimeType,
      },
      itemID: item.id,
      payload,
    }),
  )

  return NextResponse.json({ itemId: item.id })
}
