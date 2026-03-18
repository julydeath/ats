export const APP_ROUTES = {
  root: '/',
  payloadAdmin: '/admin',
  internal: {
    base: '/internal',
    login: '/internal/login',
    dashboard: '/internal/dashboard',
    assignments: {
      head: '/internal/assignments/head',
      lead: '/internal/assignments/lead',
    },
    jobs: {
      assigned: '/internal/jobs/assigned',
    },
  },
} as const

export const PAYLOAD_AUTH_COOKIE_NAME = 'payload-token'
