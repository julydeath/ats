import type { CollectionConfig } from 'payload'

import {
  adminOnlyAccess,
  adminLeadershipAccess,
  canManageInternalUsers,
  internalAdminAccess,
  selfOrAdminAccess,
  selfOrLeadershipAccess,
  type InternalUserLike,
} from '@/access/internalRoles'
import { INTERNAL_ROLE_OPTIONS } from '@/lib/constants/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: internalAdminAccess,
    create: adminLeadershipAccess,
    read: selfOrLeadershipAccess,
    update: selfOrAdminAccess,
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

        if (data?.role) {
          return data
        }

        const userCount = await req.payload.count({
          collection: 'users',
          req,
        })

        return {
          ...data,
          role: userCount.totalDocs === 0 ? 'admin' : 'recruiter',
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
        update: ({ req: { user } }) => canManageInternalUsers(user as InternalUserLike),
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      saveToJWT: true,
      access: {
        update: ({ req: { user } }) => canManageInternalUsers(user as InternalUserLike),
      },
    },
  ],
}
