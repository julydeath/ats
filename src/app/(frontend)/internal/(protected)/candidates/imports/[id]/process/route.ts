import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { getPayloadAuthHeaders } from '@/lib/auth/payload-auth-headers'
import { processResumeImportBatch } from '@/lib/candidates/resume-imports'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

export const runtime = 'nodejs'

const readString = (value: FormDataEntryValue | null): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const parseNumericID = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await getPayloadAuthHeaders(request.headers) })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter', 'recruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const { id } = await params
  const batchID = parseNumericID(id)

  if (!batchID) {
    return NextResponse.redirect(
      new URL(APP_ROUTES.internal.candidates.importsNew, request.url),
      303,
    )
  }

  const formData = await request.formData().catch(() => null)
  const itemID = parseNumericID(readString(formData?.get('itemId') ?? null))

  if (itemID) {
    const item = await payload.findByID({
      collection: 'candidate-resume-import-items',
      depth: 0,
      id: itemID,
      overrideAccess: false,
      select: {
        batch: true,
      },
      user: internalUser,
    })

    if (String(extractRelationshipID(item.batch)) === String(batchID)) {
      await payload.update({
        collection: 'candidate-resume-import-items',
        data: {
          error: null,
          status: 'queued',
        },
        id: itemID,
        overrideAccess: false,
        user: internalUser,
      })
    }
  }

  const redirectURL = new URL(`${APP_ROUTES.internal.candidates.imports}/${batchID}`, request.url)

  try {
    await processResumeImportBatch({ batchID })
    redirectURL.searchParams.set('success', 'processing')
  } catch (error) {
    console.error('Bulk resume import processing failed', error)
    redirectURL.searchParams.set('error', 'Resume import processing failed. Please retry.')
  }

  return NextResponse.redirect(redirectURL, 303)
}
