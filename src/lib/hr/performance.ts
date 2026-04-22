import { APIError, type PayloadRequest } from 'payload'

import { readRelationID } from '@/lib/hr/common'
import type { PerformanceCycle } from '@/payload-types'

const toDateOnlyISO = (date: string | Date): string => {
  const value = typeof date === 'string' ? new Date(date) : new Date(date)
  value.setHours(0, 0, 0, 0)
  return value.toISOString()
}

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

const calculateKpiScore = ({
  interviewCount,
  placementCount,
  screenedCount,
  submissionsCount,
}: {
  interviewCount: number
  placementCount: number
  screenedCount: number
  submissionsCount: number
}): number => {
  const submissionsScore = Math.min(30, submissionsCount * 3)
  const interviewsScore = Math.min(20, interviewCount * 2)
  const placementScore = Math.min(30, placementCount * 10)
  const screeningScore = Math.min(20, screenedCount * 2)

  return Math.round(submissionsScore + interviewsScore + placementScore + screeningScore)
}

export const generatePerformanceSnapshotsForCycle = async ({
  cycleID,
  req,
}: {
  cycleID: number
  req: PayloadRequest
}): Promise<{ generated: number }> => {
  const cycle: PerformanceCycle = await req.payload.findByID({
    collection: 'performance-cycles',
    depth: 0,
    id: cycleID,
    overrideAccess: true,
    req,
  })

  const startDate = typeof cycle.startDate === 'string' ? cycle.startDate : null
  const endDate = typeof cycle.endDate === 'string' ? cycle.endDate : null

  if (!startDate || !endDate) {
    throw new APIError('Performance cycle start and end dates are required.', 400)
  }

  const employees = await req.payload.find({
    collection: 'employee-profiles',
    depth: 1,
    limit: 500,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        {
          employmentStatus: {
            equals: 'active',
          },
        },
        {
          isPayrollEligible: {
            equals: true,
          },
        },
      ],
    },
  })

  let generated = 0

  for (const employee of employees.docs) {
    const employeeID = readRelationID(employee.id)
    const userID = readRelationID(employee.user)

    if (!employeeID || !userID) {
      continue
    }

    const submissions = await req.payload.find({
      collection: 'applications',
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          {
            recruiter: {
              equals: userID,
            },
          },
          {
            createdAt: {
              greater_than_equal: toDateOnlyISO(startDate),
            },
          },
          {
            createdAt: {
              less_than_equal: toDateOnlyISO(endDate),
            },
          },
        ],
      },
    })

    const screened = await req.payload.find({
      collection: 'applications',
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          {
            recruiter: {
              equals: userID,
            },
          },
          {
            stage: {
              in: ['screened', 'submittedToClient', 'interviewScheduled', 'interviewCleared', 'offerReleased', 'joined'],
            },
          },
          {
            updatedAt: {
              greater_than_equal: toDateOnlyISO(startDate),
            },
          },
          {
            updatedAt: {
              less_than_equal: toDateOnlyISO(endDate),
            },
          },
        ],
      },
    })

    const interviews = await req.payload.find({
      collection: 'interviews',
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          {
            recruiter: {
              equals: userID,
            },
          },
          {
            startTime: {
              greater_than_equal: toDateOnlyISO(startDate),
            },
          },
          {
            startTime: {
              less_than_equal: toDateOnlyISO(endDate),
            },
          },
        ],
      },
    })

    const placements = await req.payload.find({
      collection: 'placements',
      depth: 0,
      limit: 0,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          {
            recruiter: {
              equals: userID,
            },
          },
          {
            createdAt: {
              greater_than_equal: toDateOnlyISO(startDate),
            },
          },
          {
            createdAt: {
              less_than_equal: toDateOnlyISO(endDate),
            },
          },
        ],
      },
    })

    const submissionsCount = submissions.totalDocs
    const screenedCount = screened.totalDocs
    const interviewCount = interviews.totalDocs
    const placementCount = placements.totalDocs

    const kpiScore = calculateKpiScore({
      interviewCount,
      placementCount,
      screenedCount,
      submissionsCount,
    })

    const existingSnapshot = await req.payload.find({
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

    const data = {
      approvalsCount: screenedCount,
      avgTurnaroundHours: 24,
      cycle: cycle.id,
      employee: employeeID,
      generatedAt: new Date().toISOString(),
      generatedBy: readRelationID(req.user?.id) || undefined,
      interviewCount,
      kpiScore,
      placementCount,
      rejectionCount: Math.max(0, submissionsCount - screenedCount),
      slaBreachesCount: 0,
      submissionsCount,
    }

    if (existingSnapshot.docs[0]?.id) {
      await req.payload.update({
        collection: 'performance-snapshots',
        data,
        id: existingSnapshot.docs[0].id,
        overrideAccess: true,
        req,
      })
    } else {
      await req.payload.create({
        collection: 'performance-snapshots',
        data,
        draft: false,
        overrideAccess: true,
        req,
      })
    }

    generated += 1
  }

  return { generated }
}

export const computePerformanceFinalScore = ({
  kpiScore,
  kpiWeight,
  managerRating,
  managerWeight,
}: {
  kpiScore: number
  kpiWeight: number
  managerRating: number
  managerWeight: number
}): number => {
  const normalizedKpi = Math.max(0, Math.min(100, toNumber(kpiScore, 0)))
  const normalizedManager = Math.max(0, Math.min(100, toNumber(managerRating, 0) * 20))
  const safeKpiWeight = Math.max(0, Math.min(100, toNumber(kpiWeight, 70)))
  const safeManagerWeight = Math.max(0, Math.min(100, toNumber(managerWeight, 30)))
  const total = safeKpiWeight + safeManagerWeight || 100

  const weighted = (normalizedKpi * safeKpiWeight + normalizedManager * safeManagerWeight) / total
  return Math.round(weighted * 100) / 100
}
