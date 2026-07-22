const readRequiredEnv = (name: 'DATABASE_URL' | 'PAYLOAD_SECRET'): string => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const normalizeURL = (url: string): string => {
  const trimmedURL = url.trim().replace(/\/$/, '')

  if (!trimmedURL) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmedURL)) {
    return trimmedURL
  }

  if (/^(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(trimmedURL)) {
    return `http://${trimmedURL}`
  }

  return `https://${trimmedURL}`
}

const readOptionalEnv = (name: string): string =>
  (process.env[name] || '').trim()

const readBooleanEnv = (name: string): boolean => {
  const value = readOptionalEnv(name).toLowerCase()

  return value === '1' || value === 'true' || value === 'yes'
}

const readURLListEnv = (name: string): string[] =>
  readOptionalEnv(name)
    .split(',')
    .map(normalizeURL)
    .filter(Boolean)

const appURLs = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.APP_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_URL,
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
      process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
      process.env.NEXT_PUBLIC_VERCEL_URL,
      ...readURLListEnv('APP_URLS'),
      'http://localhost:3000',
    ]
      .map((url) => normalizeURL(url || ''))
      .filter(Boolean),
  ),
)

const s3Bucket = readOptionalEnv('S3_BUCKET')
const s3AccessKeyID = readOptionalEnv('S3_ACCESS_KEY_ID')
const s3SecretAccessKey = readOptionalEnv('S3_SECRET_ACCESS_KEY')
const s3Region = readOptionalEnv('S3_REGION') || 'auto'
const s3Endpoint = normalizeURL(readOptionalEnv('S3_ENDPOINT'))
const isCloudflareR2Endpoint = s3Endpoint.includes('.r2.cloudflarestorage.com')

export const env = {
  APP_URLS: appURLs,
  DATABASE_CA_CERT: readOptionalEnv('DATABASE_CA_CERT').replace(/\\n/g, '\n'),
  DATABASE_SSL_REJECT_UNAUTHORIZED: readOptionalEnv('DATABASE_SSL_REJECT_UNAUTHORIZED'),
  DATABASE_URL: readRequiredEnv('DATABASE_URL'),
  NEXT_PUBLIC_APP_URL: appURLs[0] || 'http://localhost:3000',
  PAYLOAD_SECRET: readRequiredEnv('PAYLOAD_SECRET'),
  RAZORPAYX_ACCOUNT_NUMBER: readOptionalEnv('RAZORPAYX_ACCOUNT_NUMBER'),
  RAZORPAYX_KEY_ID: readOptionalEnv('RAZORPAYX_KEY_ID'),
  RAZORPAYX_KEY_SECRET: readOptionalEnv('RAZORPAYX_KEY_SECRET'),
  RAZORPAYX_WEBHOOK_SECRET: readOptionalEnv('RAZORPAYX_WEBHOOK_SECRET'),
  S3_ACCESS_KEY_ID: s3AccessKeyID,
  S3_BUCKET: s3Bucket,
  S3_ENDPOINT: s3Endpoint,
  S3_FORCE_PATH_STYLE: readBooleanEnv('S3_FORCE_PATH_STYLE') || isCloudflareR2Endpoint,
  S3_PUBLIC_BASE_URL: normalizeURL(readOptionalEnv('S3_PUBLIC_BASE_URL')),
  S3_REGION: s3Region,
  S3_SECRET_ACCESS_KEY: s3SecretAccessKey,
  S3_UPLOADS_ENABLED: Boolean(s3Bucket && s3AccessKeyID && s3SecretAccessKey && s3Region),
} as const
