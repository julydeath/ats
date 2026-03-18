import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getPayload } from 'payload'

import { hasInternalRole, isInternalAuthenticated, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLES, type InternalRole } from '@/lib/constants/roles'

export type InternalSessionUser = {
  email: string
  fullName?: string | null
  id: number | string
  isActive?: boolean | null
  role: InternalRole
}

type RawAuthenticatedUser = {
  email?: string | null
  fullName?: string | null
  id: number | string
  isActive?: boolean | null
  role?: unknown
}

const toInternalSessionUser = (user: RawAuthenticatedUser): InternalSessionUser => {
  return {
    email: String(user.email || ''),
    fullName: user.fullName || null,
    id: user.id,
    isActive: user.isActive ?? true,
    role: user.role as InternalRole,
  }
}

export const getCurrentInternalUser = cache(async (): Promise<InternalSessionUser | null> => {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!isInternalAuthenticated(user as InternalUserLike)) {
    return null
  }

  return toInternalSessionUser(user as unknown as RawAuthenticatedUser)
})

export const requireInternalUser = async (): Promise<InternalSessionUser> => {
  const user = await getCurrentInternalUser()

  if (!user || !user.isActive) {
    redirect(APP_ROUTES.internal.login)
  }

  return user
}

export const requireInternalRole = async (
  allowedRoles: readonly InternalRole[],
): Promise<InternalSessionUser> => {
  const user = await requireInternalUser()

  if (!hasInternalRole(user, allowedRoles)) {
    redirect(APP_ROUTES.internal.dashboard)
  }

  return user
}

export const canAccessInternalRoute = (role: unknown): role is InternalRole =>
  INTERNAL_ROLES.includes(role as InternalRole)
