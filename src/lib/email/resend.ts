import { Resend } from 'resend'

import { APP_ROUTES } from '@/lib/constants/routes'

const RESEND_API_KEY_PLACEHOLDER = 're_xxxxxxxxx'
const resendApiKey = process.env.RESEND_API_KEY || RESEND_API_KEY_PLACEHOLDER

export const resend = new Resend(resendApiKey)

const assertResendConfigured = (): void => {
  if (resendApiKey === RESEND_API_KEY_PLACEHOLDER) {
    throw new Error(
      'RESEND_API_KEY is still the placeholder. Replace `re_xxxxxxxxx` with your real Resend API key.',
    )
  }
}

export const sendHelloWorldEmail = async () => {
  assertResendConfigured()

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    to: process.env.RESEND_TEST_TO_EMAIL || 'manojkarajada.mk@gmail.com',
    subject: 'Hello World',
    html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
  })
}

const getAppURL = (): string => (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

export const buildCandidateInviteLink = (token: string): string =>
  `${getAppURL()}${APP_ROUTES.candidate.inviteBase}/${encodeURIComponent(token)}`

export const buildCandidateLoginLink = (email?: string | null): string => {
  const loginURL = new URL(`${getAppURL()}${APP_ROUTES.candidate.login}`)

  if (email) {
    loginURL.searchParams.set('email', email)
  }

  return loginURL.toString()
}

export const buildCandidateDashboardLink = (): string => `${getAppURL()}${APP_ROUTES.candidate.dashboard}`

type CandidateInviteEmailInput = {
  candidateName: string
  expiresAtISO: string
  inviteLink: string
  jobTitle: string
  to: string
}

export const sendCandidateInviteEmail = async ({
  candidateName,
  expiresAtISO,
  inviteLink,
  jobTitle,
  to,
}: CandidateInviteEmailInput) => {
  assertResendConfigured()

  const safeName = candidateName.trim() || 'Candidate'
  const expiryLabel = new Date(expiresAtISO).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    to,
    subject: `Application invite for ${jobTitle} | Realizing Dreams Inspirix HR Services`,
    html: `
      <p>Hi ${safeName},</p>
      <p>Your profile has cleared internal review for the role <strong>${jobTitle}</strong>.</p>
      <p>Please complete your application using the secure link below:</p>
      <p><a href="${inviteLink}">${inviteLink}</a></p>
      <p>This one-time invite expires on <strong>${expiryLabel}</strong>.</p>
      <p>Regards,<br/>Realizing Dreams Inspirix HR Services</p>
    `,
  })
}

type CandidateAccessEmailInput = {
  candidateName: string
  dashboardLink: string
  loginLink: string
  to: string
}

export const sendCandidateAccountAccessEmail = async ({
  candidateName,
  dashboardLink,
  loginLink,
  to,
}: CandidateAccessEmailInput) => {
  assertResendConfigured()

  const safeName = candidateName.trim() || 'Candidate'

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    to,
    subject: 'Your candidate portal access is now active',
    html: `
      <p>Hi ${safeName},</p>
      <p>Your application has been submitted successfully.</p>
      <p>You can sign in here: <a href="${loginLink}">${loginLink}</a></p>
      <p>After sign in, monitor status on your dashboard: <a href="${dashboardLink}">${dashboardLink}</a></p>
      <p>Regards,<br/>Realizing Dreams Inspirix HR Services</p>
    `,
  })
}
