import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APPLICATION_STAGES, type ApplicationStage } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

const readString = (value: FormDataEntryValue | null): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const parseDocumentID = (value: FormDataEntryValue | null): number | string | null => {
  const raw = readString(value)

  if (!raw) {
    return null
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw)
  }

  return raw
}

const parseStage = (value: FormDataEntryValue | null): ApplicationStage | null => {
  const raw = readString(value)
  if (!raw) {
    return null
  }

  return APPLICATION_STAGES.includes(raw as ApplicationStage) ? (raw as ApplicationStage) : null
}

const resolveRedirectPath = (value: string): string => {
  if (!value.startsWith('/internal/')) {
    return APP_ROUTES.internal.applications.list
  }

  return value
}

const buildRedirectURL = ({ path, request }: { path: string; request: Request }): URL =>
  new URL(path, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter', 'recruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()
  const applicationID =
    parseDocumentID(formData.get('applicationId')) ??
    parseDocumentID(formData.get('applicationID')) ??
    parseDocumentID(formData.get('id'))
  const toStage = parseStage(formData.get('toStage'))
  const latestComment = readString(formData.get('latestComment')) || undefined
  const redirectPath = resolveRedirectPath(readString(formData.get('redirectTo')) || APP_ROUTES.internal.applications.list)

  if (!applicationID || !toStage) {
    const failureURL = buildRedirectURL({ path: redirectPath, request })
    failureURL.searchParams.set('error', 'Valid application ID and stage are required.')
    return NextResponse.redirect(failureURL, 303)
  }

  try {
    await payload.update({
      collection: 'applications',
      data: {
        latestComment,
        stage: toStage,
      },
      id: applicationID,
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildRedirectURL({ path: redirectPath, request })
    successURL.searchParams.set('success', 'stageUpdated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildRedirectURL({ path: redirectPath, request })
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to update application stage.',
    )
    return NextResponse.redirect(failureURL, 303)
  }
}
