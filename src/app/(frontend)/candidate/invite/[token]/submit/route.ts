import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { EXTERNAL_CANDIDATE_ROLE } from '@/lib/constants/roles'
import { APP_ROUTES } from '@/lib/constants/routes'
import {
  buildCandidateDashboardLink,
  buildCandidateLoginLink,
  sendCandidateAccountAccessEmail,
} from '@/lib/email/resend'
import { findActiveCandidateInviteByToken } from '@/lib/candidates/invites'
import { extractRelationshipID } from '@/lib/utils/relationships'

const readString = (value: FormDataEntryValue | null): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const readOptionalNumber = (value: FormDataEntryValue | null): number | undefined => {
  const raw = readString(value)

  if (!raw) {
    return undefined
  }

  const parsed = Number(raw)

  if (!Number.isFinite(parsed)) {
    return undefined
  }

  return parsed
}

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

const buildInviteRedirectURL = (request: Request, token: string): URL =>
  new URL(`${APP_ROUTES.candidate.inviteBase}/${encodeURIComponent(token)}`, request.url)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const payload = await getPayload({ config: configPromise })
  const formData = await request.formData()
  const fullName = readString(formData.get('fullName'))
  const email = readString(formData.get('email')).toLowerCase()
  const phone = readString(formData.get('phone'))
  const password = readString(formData.get('password'))
  const confirmPassword = readString(formData.get('confirmPassword'))
  const currentLocation = readString(formData.get('currentLocation')) || undefined
  const currentCompany = readString(formData.get('currentCompany')) || undefined
  const currentRole = readString(formData.get('currentRole')) || undefined
  const expectedSalary = readOptionalNumber(formData.get('expectedSalary'))
  const linkedInURL = readString(formData.get('linkedInURL')) || undefined
  const noticePeriodDays = readOptionalNumber(formData.get('noticePeriodDays'))
  const notes = readString(formData.get('notes')) || undefined
  const portfolioURL = readString(formData.get('portfolioURL')) || undefined
  const totalExperienceYears = readOptionalNumber(formData.get('totalExperienceYears'))

  if (!fullName || !email || !phone) {
    const failureURL = buildInviteRedirectURL(request, token)
    failureURL.searchParams.set('error', 'Full name, email, and phone are required.')
    return NextResponse.redirect(failureURL)
  }

  if (password.length < 8 || password !== confirmPassword) {
    const failureURL = buildInviteRedirectURL(request, token)
    failureURL.searchParams.set('error', 'Password must be at least 8 characters and both fields must match.')
    return NextResponse.redirect(failureURL)
  }

  try {
    const invite = await findActiveCandidateInviteByToken({
      payload,
      token,
    })

    if (!invite) {
      const failureURL = buildInviteRedirectURL(request, token)
      failureURL.searchParams.set('error', 'Invite link is invalid or already used.')
      return NextResponse.redirect(failureURL)
    }

    const candidateID = toNumericID(extractRelationshipID(invite.candidate))
    const applicationID = toNumericID(extractRelationshipID(invite.application))

    if (!candidateID || !applicationID) {
      throw new Error('Invite linkage is invalid.')
    }

    const [candidate, application] = await Promise.all([
      payload.findByID({
        collection: 'candidates',
        depth: 0,
        id: candidateID,
        overrideAccess: true,
      }),
      payload.findByID({
        collection: 'applications',
        depth: 0,
        id: applicationID,
        overrideAccess: true,
      }),
    ])

    if (
      String(application.stage) !== 'candidateInvited' &&
      String(application.stage) !== 'internalReviewApproved' &&
      String(application.stage) !== 'candidateApplied'
    ) {
      const failureURL = buildInviteRedirectURL(request, token)
      failureURL.searchParams.set('error', 'Application is not in an invite-ready stage.')
      return NextResponse.redirect(failureURL)
    }

    const existingAccountID = toNumericID(extractRelationshipID(candidate.candidateAccount))
    let accountID = existingAccountID

    if (accountID) {
      await payload.update({
        collection: 'candidate-users',
        data: {
          candidateProfile: candidateID,
          email,
          fullName,
          isActive: true,
          onboardingMethod: 'password',
          password,
          role: EXTERNAL_CANDIDATE_ROLE,
        },
        id: accountID,
        overrideAccess: true,
      })
    } else {
      const existingAccount = await payload.find({
        collection: 'candidate-users',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: {
          email: {
            equals: email,
          },
        },
      })

      if (existingAccount.totalDocs > 0) {
        const existingAccountDoc = existingAccount.docs[0]
        const linkedProfileID = extractRelationshipID(existingAccountDoc.candidateProfile)

        if (linkedProfileID && String(linkedProfileID) !== String(candidateID)) {
          throw new Error('This email is already linked to a different candidate profile.')
        }

        await payload.update({
          collection: 'candidate-users',
          data: {
            candidateProfile: candidateID,
            email,
            fullName,
            isActive: true,
            onboardingMethod: 'password',
            password,
            role: EXTERNAL_CANDIDATE_ROLE,
          },
          id: existingAccountDoc.id,
          overrideAccess: true,
        })

        accountID = existingAccountDoc.id
      } else {
        const createdAccount = await payload.create({
          collection: 'candidate-users',
          data: {
            candidateProfile: candidateID,
            email,
            fullName,
            isActive: true,
            onboardingMethod: 'password',
            password,
            role: EXTERNAL_CANDIDATE_ROLE,
          },
          overrideAccess: true,
        })

        accountID = createdAccount.id
      }
    }

    if (!accountID) {
      throw new Error('Unable to provision candidate account.')
    }

    await payload.update({
      collection: 'candidates',
      data: {
        candidateAccount: accountID,
        currentCompany,
        currentLocation,
        currentRole,
        email,
        expectedSalary,
        fullName,
        linkedInURL,
        noticePeriodDays,
        notes,
        phone,
        portfolioURL,
        profileCompletedAt: new Date().toISOString(),
        totalExperienceYears,
      },
      id: candidateID,
      overrideAccess: true,
    })

    await payload.update({
      collection: 'applications',
      context: {
        applicationStageCommentOverride: 'Candidate submitted application through invite portal.',
        skipCandidateInviteDispatch: true,
        skipStageTransitionValidation: true,
      },
      data: {
        candidateAccount: accountID,
        latestComment: notes || 'Candidate submitted application through invite portal.',
        stage: 'candidateApplied',
      },
      id: applicationID,
      overrideAccess: true,
    })

    await sendCandidateAccountAccessEmail({
      candidateName: fullName,
      dashboardLink: buildCandidateDashboardLink(),
      loginLink: buildCandidateLoginLink(email),
      to: email,
    })

    const nowISO = new Date().toISOString()

    await payload.update({
      collection: 'candidate-invites',
      data: {
        accountAccessSentAt: nowISO,
        consumedAt: nowISO,
        status: 'consumed',
      },
      id: invite.id,
      overrideAccess: true,
    })

    const successURL = new URL(APP_ROUTES.candidate.login, request.url)
    successURL.searchParams.set('email', email)
    successURL.searchParams.set('success', 'applicationSubmitted')
    return NextResponse.redirect(successURL)
  } catch (error) {
    const failureURL = buildInviteRedirectURL(request, token)
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to submit application.',
    )
    return NextResponse.redirect(failureURL)
  }
}
