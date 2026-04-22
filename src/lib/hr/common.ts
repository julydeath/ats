import { APIError, type PayloadRequest } from 'payload'

import { type InternalUserLike } from '@/access/internalRoles'

export const readRelationID = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  if (value && typeof value === 'object' && 'id' in value) {
    const typed = value as { id?: number | string }
    if (typeof typed.id === 'number' && Number.isFinite(typed.id)) {
      return typed.id
    }
    if (typeof typed.id === 'string' && typed.id.trim().length > 0) {
      const parsed = Number(typed.id)
      return Number.isFinite(parsed) ? parsed : null
    }
  }

  return null
}

export const requireEmployeeProfileIDForUser = async ({
  req,
  user,
}: {
  req: PayloadRequest
  user: InternalUserLike
}): Promise<number> => {
  if (!user?.id) {
    throw new APIError('Authentication required.', 401)
  }

  const profile = await req.payload.find({
    collection: 'employee-profiles',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      user: {
        equals: user.id,
      },
    },
  })

  if (!profile.docs[0]?.id) {
    throw new APIError('Employee profile not found for current user.', 404)
  }

  return profile.docs[0].id
}
