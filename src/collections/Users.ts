import { APIError, type CollectionConfig } from 'payload'

import {
  adminOnlyAccess,
  internalAdminAccess,
  selfOrLeadershipAccess,
  hasInternalRole,
  type InternalUserLike,
} from '@/access/internalRoles'
import { INTERNAL_ROLE_OPTIONS } from '@/lib/constants/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: internalAdminAccess,
    create: async ({ req }) => {
      const actor = req.user as InternalUserLike

      if (hasInternalRole(actor, ['admin', 'leadRecruiter'])) {
        return true
      }

      const userCount = await req.payload.count({
        collection: 'users',
        overrideAccess: true,
        req,
      })

      // Allow bootstrap only when the users collection is empty.
      return userCount.totalDocs === 0
    },
    read: selfOrLeadershipAccess,
    update: ({ req: { user } }) => {
      const internalUser = user as InternalUserLike

      if (!internalUser) {
        return false
      }

      if (hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
        return true
      }

      return {
        id: {
          equals: internalUser.id,
        },
      }
    },
    delete: adminOnlyAccess,
  },
  admin: {
    defaultColumns: ['fullName', 'email', 'role', 'isActive', 'updatedAt'],
    useAsTitle: 'fullName',
  },
  auth: {
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
    tokenExpiration: 60 * 60 * 8,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') {
          return data
        }

        const userCount = await req.payload.count({
          collection: 'users',
          overrideAccess: true,
          req,
        })

        const totalUsers = userCount.totalDocs
        const requestedRole = data?.role
        let nextRole = requestedRole

        if (!nextRole) {
          nextRole = totalUsers === 0 ? 'admin' : 'recruiter'
        }

        if (totalUsers === 0) {
          // Force first account to be active admin for safe bootstrap.
          return {
            ...data,
            isActive: true,
            role: 'admin',
          }
        }

        const creator = req.user as InternalUserLike
        if (!creator || !hasInternalRole(creator, ['admin', 'leadRecruiter'])) {
          throw new APIError('Only admin or lead recruiter can create internal users.', 403)
        }

        if (hasInternalRole(creator, ['leadRecruiter']) && nextRole !== 'recruiter') {
          throw new APIError('Lead recruiter can only create recruiter accounts.', 403)
        }

        return {
          ...data,
          isActive: typeof data?.isActive === 'boolean' ? data.isActive : false,
          role: nextRole,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, req, originalDoc }) => {
        const creator = req.user as InternalUserLike

        if (!creator || hasInternalRole(creator, ['admin'])) {
          return data
        }

        if (!hasInternalRole(creator, ['leadRecruiter'])) {
          return data
        }

        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = (originalDoc as Record<string, unknown> | undefined) || {}
        const targetRole = String(typedData.role ?? typedOriginal.role ?? '')

        if (operation === 'create' && targetRole !== 'recruiter') {
          throw new APIError('Lead recruiter can only create recruiter accounts.', 403)
        }

        if (operation === 'update' && targetRole !== 'recruiter' && String(typedOriginal.id || '') !== String(creator.id)) {
          throw new APIError('Lead recruiter can only edit recruiter accounts.', 403)
        }

        return {
          ...typedData,
          isActive:
            operation === 'create'
              ? false
              : (typedData.isActive ?? typedOriginal.isActive),
          role: operation === 'create' ? 'recruiter' : (typedData.role ?? typedOriginal.role),
        }
      },
    ],
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      index: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      saveToJWT: true,
      defaultValue: 'recruiter',
      options: INTERNAL_ROLE_OPTIONS.map((option) => ({ ...option })),
      access: {
        update: ({ req: { user } }) => hasInternalRole(user as InternalUserLike, ['admin']),
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      saveToJWT: true,
      access: {
        update: ({ req: { user } }) => hasInternalRole(user as InternalUserLike, ['admin']),
      },
    },
  ],
}
