import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { INTERVIEW_MODES, INTERVIEW_ROUNDS, INTERVIEW_STATUSES } from '@/lib/constants/recruitment'
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

const toISODateTime = (value: FormDataEntryValue | null): string | null => {
  const raw = readString(value)

  if (!raw) {
    return null
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

const parseEnumValue = <T extends readonly string[]>(
  value: FormDataEntryValue | null,
  options: T,
): T[number] | null => {
  const raw = readString(value)
  if (!raw) {
    return null
  }

  return options.includes(raw as T[number]) ? (raw as T[number]) : null
}

const buildRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.interviews.list, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()

  const application = parseNumericID(formData.get('application'))
  const interviewerName = readString(formData.get('interviewerName'))
  const startTime = toISODateTime(formData.get('startTime'))
  const endTime = toISODateTime(formData.get('endTime'))
  const interviewRound = parseEnumValue(formData.get('interviewRound'), INTERVIEW_ROUNDS) || 'screening'
  const mode = parseEnumValue(formData.get('mode'), INTERVIEW_MODES) || 'video'
  const status = parseEnumValue(formData.get('status'), INTERVIEW_STATUSES) || 'scheduled'

  if (!application || !interviewerName || !startTime || !endTime) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('create', '1')
    failureURL.searchParams.set('error', 'Application, interviewer name, start time, and end time are required.')
    return NextResponse.redirect(failureURL, 303)
  }

  if (
    readString(formData.get('interviewRound')) &&
    !parseEnumValue(formData.get('interviewRound'), INTERVIEW_ROUNDS)
  ) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('create', '1')
    failureURL.searchParams.set('error', 'Invalid interview round selected.')
    return NextResponse.redirect(failureURL, 303)
  }

  if (readString(formData.get('mode')) && !parseEnumValue(formData.get('mode'), INTERVIEW_MODES)) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('create', '1')
    failureURL.searchParams.set('error', 'Invalid interview mode selected.')
    return NextResponse.redirect(failureURL, 303)
  }

  if (readString(formData.get('status')) && !parseEnumValue(formData.get('status'), INTERVIEW_STATUSES)) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('create', '1')
    failureURL.searchParams.set('error', 'Invalid interview status selected.')
    return NextResponse.redirect(failureURL, 303)
  }

  try {
    await payload.create({
      collection: 'interviews',
      data: {
        application,
        clientPOC: readString(formData.get('clientPOC')) || undefined,
        interviewerEmail: readString(formData.get('interviewerEmail')) || undefined,
        interviewerName,
        interviewRound,
        interviewTemplate: readString(formData.get('interviewTemplate')) || undefined,
        location: readString(formData.get('location')) || undefined,
        meetingLink: readString(formData.get('meetingLink')) || undefined,
        mode,
        notes: readString(formData.get('notes')) || undefined,
        status,
        timezone: readString(formData.get('timezone')) || 'Asia/Kolkata',
        startTime,
        endTime,
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildRedirectURL(request)
    successURL.searchParams.set('success', 'interviewCreated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('create', '1')
    failureURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to create interview schedule.')
    return NextResponse.redirect(failureURL, 303)
  }
}
