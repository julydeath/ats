import { type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import {
  performanceSnapshotManageAccess,
  performanceSnapshotReadAccess,
} from '@/access/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

export const PerformanceSnapshots: CollectionConfig = {
  slug: 'performance-snapshots',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: performanceSnapshotManageAccess,
    read: performanceSnapshotReadAccess,
    update: performanceSnapshotManageAccess,
    delete: performanceSnapshotManageAccess,
  },
  admin: {
    defaultColumns: ['snapshotCode', 'cycle', 'employee', 'kpiScore', 'submissionsCount', 'interviewCount', 'placementCount'],
    group: 'HRMS',
    useAsTitle: 'snapshotCode',
  },
  fields: [
    {
      name: 'snapshotCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'cycle',
      type: 'relationship',
      relationTo: 'performance-cycles',
      required: true,
      index: true,
    },
    {
      name: 'employee',
      type: 'relationship',
      relationTo: 'employee-profiles',
      required: true,
      index: true,
    },
    {
      name: 'generatedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'generatedAt',
      type: 'date',
      index: true,
    },
    {
      name: 'submissionsCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'approvalsCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'rejectionCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'interviewCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'placementCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'avgTurnaroundHours',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'slaBreachesCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'kpiScore',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 100,
      index: true,
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const snapshotCode = await resolveBusinessCode({
          collection: 'performance-snapshots',
          data: typedData,
          fieldName: 'snapshotCode',
          originalDoc: typedOriginal,
          prefix: 'PRS',
          req,
        })

        return {
          ...typedData,
          snapshotCode,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['snapshotCode'],
      unique: true,
    },
    {
      fields: ['cycle', 'employee'],
      unique: true,
    },
  ],
}
