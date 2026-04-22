const readRequiredEnv = (name: 'DATABASE_URL' | 'PAYLOAD_SECRET'): string => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const normalizeURL = (url: string): string => url.replace(/\/$/, '')

const readOptionalEnv = (name: string): string =>
  (process.env[name] || '').trim()

export const env = {
  DATABASE_URL: readRequiredEnv('DATABASE_URL'),
  NEXT_PUBLIC_APP_URL: normalizeURL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  PAYLOAD_SECRET: readRequiredEnv('PAYLOAD_SECRET'),
  RAZORPAYX_ACCOUNT_NUMBER: readOptionalEnv('RAZORPAYX_ACCOUNT_NUMBER'),
  RAZORPAYX_KEY_ID: readOptionalEnv('RAZORPAYX_KEY_ID'),
  RAZORPAYX_KEY_SECRET: readOptionalEnv('RAZORPAYX_KEY_SECRET'),
  RAZORPAYX_WEBHOOK_SECRET: readOptionalEnv('RAZORPAYX_WEBHOOK_SECRET'),
} as const
