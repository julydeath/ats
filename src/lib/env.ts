const readRequiredEnv = (name: 'DATABASE_URL' | 'PAYLOAD_SECRET'): string => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const normalizeURL = (url: string): string => url.replace(/\/$/, '')

export const env = {
  DATABASE_URL: readRequiredEnv('DATABASE_URL'),
  NEXT_PUBLIC_APP_URL: normalizeURL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  PAYLOAD_SECRET: readRequiredEnv('PAYLOAD_SECRET'),
} as const
