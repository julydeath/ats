import { INTERNAL_ROLE_LABELS, isInternalRole } from '@/lib/constants/roles'

type AuditActor =
  | {
      email?: string | null
      fullName?: string | null
      id?: number | string | null
      role?: unknown
    }
  | number
  | string
  | null
  | undefined

const recordDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
  year: 'numeric',
})

const isAuditActorObject = (actor: AuditActor): actor is Extract<AuditActor, object> =>
  Boolean(actor) && typeof actor === 'object'

export const formatAuditActorName = (
  actor: AuditActor,
  fallback: string = 'Unknown employee',
): string => {
  if (typeof actor === 'number' || typeof actor === 'string') {
    return `User ${actor}`
  }

  if (!isAuditActorObject(actor)) {
    return fallback
  }

  return actor.fullName || actor.email || (actor.id ? `User ${actor.id}` : fallback)
}

export const formatAuditActorRole = (
  actor: AuditActor,
  fallback: string = 'Role not set',
): string => {
  if (!isAuditActorObject(actor)) {
    return fallback
  }

  return isInternalRole(actor.role) ? INTERNAL_ROLE_LABELS[actor.role] : fallback
}

export const formatAuditDate = (
  value?: Date | string | null,
  fallback: string = 'Date not set',
): string => {
  if (!value) {
    return fallback
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return recordDateFormatter.format(date)
}
