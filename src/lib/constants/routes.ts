export const APP_ROUTES = {
  root: '/',
  payloadAdmin: '/admin',
  internal: {
    base: '/internal',
    login: '/internal/login',
    dashboard: '/internal/dashboard',
    schedule: '/internal/schedule',
    settings: '/internal/settings',
    assignments: {
      head: '/internal/assignments/head',
      lead: '/internal/assignments/lead',
    },
    jobs: {
      assigned: '/internal/jobs/assigned',
      create: '/internal/jobs/create',
      detailBase: '/internal/jobs/assigned',
      templates: '/internal/jobs/templates',
      templatesCreate: '/internal/jobs/templates/create',
    },
    clients: {
      create: '/internal/clients/create',
      detailBase: '/internal/clients',
      list: '/internal/clients',
    },
    candidates: {
      activityCreate: '/internal/candidates/activity/create',
      create: '/internal/candidates/create',
      detailBase: '/internal/candidates',
      list: '/internal/candidates',
      new: '/internal/candidates/new',
      parseResume: '/internal/candidates/parse-resume',
    },
    applications: {
      create: '/internal/applications/create',
      detailBase: '/internal/applications',
      list: '/internal/applications',
      new: '/internal/applications/new',
      review: '/internal/applications/review',
      reviewQueue: '/internal/applications/review-queue',
      submit: '/internal/applications/submit',
    },
    interviews: {
      create: '/internal/interviews/create',
      detailBase: '/internal/interviews',
      list: '/internal/interviews',
      updateStatus: '/internal/interviews/update-status',
    },
    placements: {
      create: '/internal/placements/create',
      detailBase: '/internal/placements',
      list: '/internal/placements',
      updateStatus: '/internal/placements/update-status',
    },
  },
  candidate: {
    base: '/candidate',
    inviteBase: '/candidate/invite',
    login: '/candidate/login',
    dashboard: '/candidate/dashboard',
    applications: '/candidate/applications',
  },
} as const

export const PAYLOAD_AUTH_COOKIE_NAME = 'payload-token'
