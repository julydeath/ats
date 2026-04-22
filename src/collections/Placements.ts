import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { placementsManageAccess, placementsReadAccess } from '@/access/visibility'
import {
  PLACEMENT_STATUS_OPTIONS,
  PLACEMENT_TYPE_OPTIONS,
  type PlacementStatus,
} from '@/lib/constants/recruitment'
import { resolveBusinessCode } from '@/lib/utils/business-codes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

const toISOOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

const computeDurationDays = ({
  endDate,
  startDate,
}: {
  endDate: string | null
  startDate: string | null
}): number | null => {
  if (!startDate || !endDate) {
    return null
  }

  const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return null
  }

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

const isPlacementLikeStatus = (status: PlacementStatus): boolean =>
  status === 'active' || status === 'completed'

export const Placements: CollectionConfig = {
  slug: 'placements',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: placementsManageAccess,
    read: placementsReadAccess,
    update: placementsManageAccess,
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['placementCode', 'candidate', 'job', 'placementType', 'status', 'tentativeStartDate', 'updatedAt'],
    group: 'Applications',
    useAsTitle: 'placementCode',
  },
  fields: [
    {
      name: 'placementCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'applications',
      required: true,
      index: true,
    },
    {
      name: 'candidate',
      type: 'relationship',
      relationTo: 'candidates',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'job',
      type: 'relationship',
      relationTo: 'jobs',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'recruiter',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'placementType',
      type: 'select',
      required: true,
      defaultValue: 'recurringRevenue',
      options: PLACEMENT_TYPE_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'clientPrimeVendor',
      type: 'text',
    },
    {
      name: 'businessUnit',
      type: 'text',
    },
    {
      name: 'clientBillRate',
      type: 'text',
    },
    {
      name: 'payRate',
      type: 'text',
    },
    {
      name: 'perDiemPerHour',
      type: 'text',
    },
    {
      name: 'overhead',
      type: 'text',
    },
    {
      name: 'margin',
      type: 'text',
    },
    {
      name: 'tentativeStartDate',
      type: 'date',
    },
    {
      name: 'actualStartDate',
      type: 'date',
    },
    {
      name: 'actualEndDate',
      type: 'date',
    },
    {
      name: 'projectDurationDays',
      type: 'number',
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: PLACEMENT_STATUS_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined

        const placementCode = await resolveBusinessCode({
          collection: 'placements',
          data: typedData,
          fieldName: 'placementCode',
          originalDoc: typedOriginalDoc,
          prefix: 'PLC',
          req,
        })

        return {
          ...typedData,
          placementCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined
        const user = req.user as InternalUserLike
        const currentUserID = toNumericID(user?.id)

        const applicationID = extractRelationshipID(typedData.application ?? typedOriginalDoc?.application)

        if (!applicationID) {
          throw new APIError('Application is required for placement mapping.', 400)
        }

        const tentativeStartDate = toISOOrNull(String(typedData.tentativeStartDate ?? typedOriginalDoc?.tentativeStartDate ?? ''))
        const actualStartDate = toISOOrNull(String(typedData.actualStartDate ?? typedOriginalDoc?.actualStartDate ?? ''))
        const actualEndDate = toISOOrNull(String(typedData.actualEndDate ?? typedOriginalDoc?.actualEndDate ?? ''))

        if (actualStartDate && actualEndDate && new Date(actualEndDate).getTime() < new Date(actualStartDate).getTime()) {
          throw new APIError('Actual end date cannot be earlier than actual start date.', 400)
        }

        const application = await req.payload.findByID({
          collection: 'applications',
          depth: 1,
          id: applicationID,
          overrideAccess: true,
          req,
        })

        const candidateID = extractRelationshipID(application.candidate)
        const jobID = extractRelationshipID(application.job)
        const recruiterID = extractRelationshipID(application.recruiter)
        let clientID: number | string | null = null

        if (jobID) {
          const jobDoc = await req.payload.findByID({
            collection: 'jobs',
            depth: 0,
            id: jobID,
            overrideAccess: true,
            req,
          })
          clientID = extractRelationshipID(jobDoc.client)
        }

        const projectDurationDays = computeDurationDays({
          endDate: actualEndDate,
          startDate: actualStartDate,
        })

        return {
          ...typedData,
          actualEndDate: actualEndDate ?? undefined,
          actualStartDate: actualStartDate ?? undefined,
          application: applicationID,
          candidate: candidateID ?? undefined,
          client: clientID ?? undefined,
          createdBy: operation === 'create' ? typedData.createdBy ?? currentUserID ?? undefined : typedOriginalDoc?.createdBy,
          job: jobID ?? undefined,
          placementCode: typedData.placementCode ?? typedOriginalDoc?.placementCode,
          projectDurationDays: projectDurationDays ?? undefined,
          recruiter: recruiterID ?? undefined,
          tentativeStartDate: tentativeStartDate ?? undefined,
        }
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        const applicationID = extractRelationshipID(doc.application)
        const status = String(doc.status || 'active') as PlacementStatus

        if (!applicationID || !isPlacementLikeStatus(status)) {
          return doc
        }

        const placementMoment =
          toISOOrNull(String(doc.actualStartDate || '')) || toISOOrNull(String(doc.tentativeStartDate || '')) || new Date().toISOString()

        await req.payload.update({
          collection: 'applications',
          data: {
            latestComment: `Placement ${String(doc.placementCode || `PLC-${doc.id}`)} recorded with ${status} status.`,
            placedAt: placementMoment,
            stage: 'joined',
          },
          id: applicationID,
          overrideAccess: true,
          req,
        })

        return doc
      },
    ],
  },
  indexes: [
    {
      fields: ['placementCode'],
      unique: true,
    },
    {
      fields: ['application'],
      unique: true,
    },
    {
      fields: ['status', 'tentativeStartDate'],
    },
    {
      fields: ['candidate', 'status'],
    },
  ],
}
