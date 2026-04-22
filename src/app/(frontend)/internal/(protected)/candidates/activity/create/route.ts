import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import {
  CANDIDATE_ACTIVITY_PRIORITIES,
  CANDIDATE_ACTIVITY_STATUSES,
  CANDIDATE_ACTIVITY_TYPES,
  type CandidateActivityPriority,
  type CandidateActivityStatus,
  type CandidateActivityType,
} from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

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

const toISODate = (value: FormDataEntryValue | null): string | undefined => {
  const raw = readString(value)

  if (!raw) {
    return undefined
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString()
}

const buildCandidateRedirectURL = ({
  candidateID,
  request,
}: {
  candidateID: number
  request: Request
}): URL => new URL(`${APP_ROUTES.internal.candidates.detailBase}/${candidateID}`, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await getHeaders() })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter', 'recruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()
  const candidateID = parseNumericID(formData.get('candidateId'))

  if (!candidateID) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.candidates.list, request.url), 303)
  }

  const redirectURL = buildCandidateRedirectURL({
    candidateID,
    request,
  })

  const title = readString(formData.get('title'))
  const description = readString(formData.get('description')) || undefined
  const actionRequired = readString(formData.get('actionRequired')) || undefined
  const activityTypeInput = readString(formData.get('type'))
  const priorityInput = readString(formData.get('priority'))
  const statusInput = readString(formData.get('status'))
  const dueAtISO = toISODate(formData.get('dueAt'))
  const applicationID = parseNumericID(formData.get('applicationId'))
  const assignedTo = parseNumericID(formData.get('assignedTo'))

  if (!title) {
    redirectURL.searchParams.set('error', 'Activity title is required.')
    return NextResponse.redirect(redirectURL, 303)
  }

  const type = CANDIDATE_ACTIVITY_TYPES.includes(activityTypeInput as CandidateActivityType)
    ? (activityTypeInput as CandidateActivityType)
    : 'note'
  const priority = CANDIDATE_ACTIVITY_PRIORITIES.includes(priorityInput as CandidateActivityPriority)
    ? (priorityInput as CandidateActivityPriority)
    : 'medium'
  const status = CANDIDATE_ACTIVITY_STATUSES.includes(statusInput as CandidateActivityStatus)
    ? (statusInput as CandidateActivityStatus)
    : 'open'

  try {
    await payload.create({
      collection: 'candidate-activities',
      data: {
        actionRequired,
        application: applicationID ?? undefined,
        assignedTo: assignedTo ?? undefined,
        candidate: candidateID,
        description,
        dueAt: dueAtISO,
        priority,
        status,
        title,
        type,
      },
      overrideAccess: false,
      user: internalUser,
    })

    redirectURL.searchParams.set('success', 'activityCreated')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to save activity.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
