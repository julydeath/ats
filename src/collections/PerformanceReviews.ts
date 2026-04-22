import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import {
  performanceReviewManageAccess,
  performanceReviewReadAccess,
} from '@/access/hr'
import { PERFORMANCE_REVIEW_STATUS_OPTIONS } from '@/lib/constants/hr'
import { readRelationID } from '@/lib/hr/common'
import { computePerformanceFinalScore } from '@/lib/hr/performance'
import { resolveBusinessCode } from '@/lib/utils/business-codes'
import type { EmployeeProfile, PerformanceCycle, User } from '@/payload-types'

export const PerformanceReviews: CollectionConfig = {
  slug: 'performance-reviews',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: performanceReviewManageAccess,
    read: performanceReviewReadAccess,
    update: performanceReviewManageAccess,
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['reviewCode', 'cycle', 'employee', 'reviewer', 'managerRating', 'finalScore', 'status'],
    group: 'HRMS',
    useAsTitle: 'reviewCode',
  },
  fields: [
    {
      name: 'reviewCode',
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
      name: 'reviewer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'managerRating',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
    },
    {
      name: 'managerComments',
      type: 'textarea',
    },
    {
      name: 'kpiScore',
      type: 'number',
      min: 0,
      max: 100,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'finalScore',
      type: 'number',
      min: 0,
      max: 100,
      admin: {
        readOnly: true,
      },
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: PERFORMANCE_REVIEW_STATUS_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const reviewCode = await resolveBusinessCode({
          collection: 'performance-reviews',
          data: typedData,
          fieldName: 'reviewCode',
          originalDoc: typedOriginal,
          prefix: 'PRV',
          req,
        })

        return {
          ...typedData,
          reviewCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const employeeID = readRelationID(typedData.employee ?? typedOriginal?.employee)
        const cycleID = readRelationID(typedData.cycle ?? typedOriginal?.cycle)
        const reviewerID = readRelationID(typedData.reviewer ?? typedOriginal?.reviewer)

        if (!employeeID || !cycleID || !reviewerID) {
          throw new APIError('Employee, cycle, and reviewer are required.', 400)
        }

        const employee: EmployeeProfile = await req.payload.findByID({
          collection: 'employee-profiles',
          depth: 1,
          id: employeeID,
          overrideAccess: true,
          req,
        })

        const employeeUserID = readRelationID(employee.user)
        if (!employeeUserID) {
          throw new APIError('Employee profile is missing internal user mapping.', 400)
        }

        const employeeUser: User =
          typeof employee.user === 'object' && employee.user !== null
            ? employee.user
            : await req.payload.findByID({
                collection: 'users',
                depth: 0,
                id: employeeUserID,
                overrideAccess: true,
                req,
              })

        const reviewerUser: User = await req.payload.findByID({
          collection: 'users',
          depth: 0,
          id: reviewerID,
          overrideAccess: true,
          req,
        })

        const employeeRole = String(employeeUser.role || '')
        const reviewerRole = String(reviewerUser.role || '')

        if (employeeRole === 'recruiter' && !['leadRecruiter', 'admin'].includes(reviewerRole)) {
          throw new APIError('Recruiter reviews must be submitted by Lead Recruiter or Admin.', 403)
        }

        if (employeeRole === 'leadRecruiter' && reviewerRole !== 'admin') {
          throw new APIError('Lead Recruiter reviews must be submitted by Admin.', 403)
        }

        if (operation === 'create') {
          const existing = await req.payload.find({
            collection: 'performance-reviews',
            depth: 0,
            limit: 1,
            overrideAccess: true,
            pagination: false,
            req,
            where: {
              and: [
                {
                  cycle: {
                    equals: cycleID,
                  },
                },
                {
                  employee: {
                    equals: employeeID,
                  },
                },
              ],
            },
          })

          if (existing.totalDocs > 0) {
            throw new APIError('Performance review already exists for this employee in selected cycle.', 409)
          }
        }

        const cycle: PerformanceCycle = await req.payload.findByID({
          collection: 'performance-cycles',
          depth: 0,
          id: cycleID,
          overrideAccess: true,
          req,
        })

        const snapshot = await req.payload.find({
          collection: 'performance-snapshots',
          depth: 0,
          limit: 1,
          overrideAccess: true,
          pagination: false,
          req,
          where: {
            and: [
              {
                cycle: {
                  equals: cycleID,
                },
              },
              {
                employee: {
                  equals: employeeID,
                },
              },
            ],
          },
        })

        const kpiScore = Number(snapshot.docs[0]?.kpiScore || 0)
        const managerRating = Number(typedData.managerRating ?? typedOriginal?.managerRating ?? 0)
        const finalScore = computePerformanceFinalScore({
          kpiScore,
          kpiWeight: Number(cycle.kpiWeight || 70),
          managerRating,
          managerWeight: Number(cycle.managerWeight || 30),
        })

        return {
          ...typedData,
          cycle: cycleID,
          employee: employeeID,
          finalScore,
          kpiScore,
          reviewer: reviewerID,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['reviewCode'],
      unique: true,
    },
    {
      fields: ['cycle', 'employee'],
      unique: true,
    },
  ],
}
