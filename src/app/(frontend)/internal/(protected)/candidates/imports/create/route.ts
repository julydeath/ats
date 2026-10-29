import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { getPayloadAuthHeaders } from '@/lib/auth/payload-auth-headers'
import { MAX_RESUME_IMPORT_FILES } from '@/lib/candidates/resume-imports'
import { CANDIDATE_SOURCES, type CandidateSource } from '@/lib/constants/recruitment'

export const runtime = 'nodejs'

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

// Starts a bulk upload. The browser then sends each resume to
// `/imports/[id]/files` one request at a time.
export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await getPayloadAuthHeaders(request.headers) })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter', 'recruiter'])) {
    return NextResponse.json({ error: 'You do not have access to bulk upload.' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as {
    fileCount?: unknown
    role?: unknown
    source?: unknown
    sourceDetails?: unknown
  } | null
  const source = typeof body?.source === 'string' ? body.source : ''
  const sourceDetails = typeof body?.sourceDetails === 'string' ? body.sourceDetails.trim() : ''
  const role = typeof body?.role === 'string' ? body.role.trim().replace(/\s+/g, ' ').slice(0, 120) : ''
  const fileCount = Number(body?.fileCount)

  if (!CANDIDATE_SOURCES.includes(source as CandidateSource)) {
    return NextResponse.json({ error: 'Choose which platform these resumes came from.' }, { status: 400 })
  }

  if (source === 'other' && !sourceDetails) {
    return NextResponse.json({ error: 'Type the platform name for "Other".' }, { status: 400 })
  }

  if (!role) {
    return NextResponse.json({ error: 'Enter the role these resumes are for.' }, { status: 400 })
  }

  if (!Number.isInteger(fileCount) || fileCount < 1 || fileCount > MAX_RESUME_IMPORT_FILES) {
    return NextResponse.json(
      { error: `Upload between 1 and ${MAX_RESUME_IMPORT_FILES} resumes at a time.` },
      { status: 400 },
    )
  }

  const batch = await payload.create({
    collection: 'candidate-resume-import-batches',
    data: {
      role,
      source: source as CandidateSource,
      sourceDetails: sourceDetails || undefined,
      status: 'queued',
      totalCount: 0,
      uploadedBy: toNumericID(internalUser?.id) ?? undefined,
    },
    overrideAccess: false,
    user: internalUser,
  })

  return NextResponse.json({ batchId: batch.id })
}
