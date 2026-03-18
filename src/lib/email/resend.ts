import { Resend } from 'resend'

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
