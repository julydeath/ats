import configPromise from '@payload-config'
import { after, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { getPayloadAuthHeaders } from '@/lib/auth/payload-auth-headers'
import { processResumeImportItem } from '@/lib/candidates/resume-imports'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

export const runtime = 'nodejs'
export const maxDuration = 60

const readString = (value: FormDataEntryValue | null | undefined): string =>
  typeof value === 'string' ? value.trim() : ''

// Uploads tray actions on a single resume: "retry" re-parses the stored file,
// "dismiss" hides a failed item once the recruiter has dealt with it.
export async function POST(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await getPayloadAuthHeaders(request.headers) })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter', 'recruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData().catch(() => null)
  const action = readString(formData?.get('action'))
  const returnTo = readString(formData?.get('returnTo'))
  const redirectURL = new URL(
    returnTo.startsWith('/internal/') ? returnTo : APP_ROUTES.internal.candidates.importsNew,
    request.url,
  )
  const { itemId } = await params

  if (!/^\d+$/.test(itemId)) {
    return NextResponse.redirect(redirectURL, 303)
  }

  const item = await payload
    .findByID({
      collection: 'candidate-resume-import-items',
      depth: 0,
      id: Number(itemId),
      overrideAccess: false,
      select: {
        status: true,
        uploadedBy: true,
      },
      user: internalUser,
    })
    .catch(() => null)

  const isOwner = item && String(extractRelationshipID(item.uploadedBy)) === String(internalUser?.id)

  if (!item || (!isOwner && !hasInternalRole(internalUser, ['admin', 'leadRecruiter']))) {
    return NextResponse.redirect(redirectURL, 303)
  }

  if (action === 'dismiss') {
    await payload.update({
      collection: 'candidate-resume-import-items',
      data: {
        dismissedAt: new Date().toISOString(),
      },
      id: item.id,
      overrideAccess: false,
      user: internalUser,
    })
  }

  if (action === 'retry' && (item.status === 'failed' || item.status === 'processing')) {
    await payload.update({
      collection: 'candidate-resume-import-items',
      data: {
        error: null,
        status: 'queued',
      },
      id: item.id,
      overrideAccess: false,
      user: internalUser,
    })

    after(() => processResumeImportItem({ itemID: item.id, payload }))
  }

  return NextResponse.redirect(redirectURL, 303)
}
