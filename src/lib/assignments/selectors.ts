import type { PayloadRequest } from 'payload'

import { extractRelationshipID } from '@/lib/utils/relationships'

type ID = number | string

const assignmentCache = new WeakMap<PayloadRequest, Map<string, ID[]>>()

const getRequestCache = (req: PayloadRequest): Map<string, ID[]> => {
  const existing = assignmentCache.get(req)

  if (existing) {
    return existing
  }

  const created = new Map<string, ID[]>()
  assignmentCache.set(req, created)
  return created
}

const readCachedIDs = async ({
  cacheKey,
  req,
  resolver,
}: {
  cacheKey: string
  req: PayloadRequest
  resolver: () => Promise<ID[]>
}): Promise<ID[]> => {
  const requestCache = getRequestCache(req)
  const cached = requestCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const resolved = await resolver()
  requestCache.set(cacheKey, resolved)
  return resolved
}

const uniqueIDs = (values: Array<ID | null>): ID[] => {
  const deduped = new Set<string>()
  const result: ID[] = []

  for (const value of values) {
    if (value === null || value === undefined) {
      continue
    }

    const key = String(value)

    if (deduped.has(key)) {
      continue
    }

    deduped.add(key)
    result.push(value)
  }

  return result
}

export const getLeadAssignedClientIDs = async ({
  leadRecruiterID,
  req,
}: {
  leadRecruiterID: ID
  req: PayloadRequest
}): Promise<ID[]> =>
  readCachedIDs({
    cacheKey: `lead-client:${String(leadRecruiterID)}`,
    req,
    resolver: async () => {
      const { docs } = await req.payload.find({
        collection: 'client-lead-assignments',
        depth: 0,
        limit: 1000,
        pagination: false,
        overrideAccess: false,
        req,
        select: {
          client: true,
        },
        where: {
          and: [
            {
              leadRecruiter: {
                equals: leadRecruiterID,
              },
            },
            {
              status: {
                equals: 'active',
              },
            },
          ],
        },
      })

      return uniqueIDs(docs.map((doc) => extractRelationshipID(doc.client)))
    },
  })

export const getLeadAssignedJobIDs = async ({
  leadRecruiterID,
  req,
}: {
  leadRecruiterID: ID
  req: PayloadRequest
}): Promise<ID[]> =>
  readCachedIDs({
    cacheKey: `lead-job:${String(leadRecruiterID)}`,
    req,
    resolver: async () => {
      const { docs } = await req.payload.find({
        collection: 'job-lead-assignments',
        depth: 0,
        limit: 1000,
        pagination: false,
        overrideAccess: false,
        req,
        select: {
          job: true,
        },
        where: {
          and: [
            {
              leadRecruiter: {
                equals: leadRecruiterID,
              },
            },
            {
              status: {
                equals: 'active',
              },
            },
          ],
        },
      })

      return uniqueIDs(docs.map((doc) => extractRelationshipID(doc.job)))
    },
  })

export const getLeadVisibleClientIDs = async ({
  leadRecruiterID,
  req,
}: {
  leadRecruiterID: ID
  req: PayloadRequest
}): Promise<ID[]> =>
  readCachedIDs({
    cacheKey: `lead-visible-client:${String(leadRecruiterID)}`,
    req,
    resolver: async () => {
      const [fromClientAssignments, fromJobAssignments] = await Promise.all([
        getLeadAssignedClientIDs({ leadRecruiterID, req }),
        (async () => {
          const { docs } = await req.payload.find({
            collection: 'job-lead-assignments',
            depth: 0,
            limit: 1000,
            pagination: false,
            overrideAccess: false,
            req,
            select: {
              client: true,
            },
            where: {
              and: [
                {
                  leadRecruiter: {
                    equals: leadRecruiterID,
                  },
                },
                {
                  status: {
                    equals: 'active',
                  },
                },
              ],
            },
          })

          return uniqueIDs(docs.map((doc) => extractRelationshipID(doc.client)))
        })(),
      ])

      return uniqueIDs([...fromClientAssignments, ...fromJobAssignments])
    },
  })

export const getLeadVisibleJobIDs = async ({
  leadRecruiterID,
  req,
}: {
  leadRecruiterID: ID
  req: PayloadRequest
}): Promise<ID[]> =>
  readCachedIDs({
    cacheKey: `lead-visible-job:${String(leadRecruiterID)}`,
    req,
    resolver: async () => {
      const [directJobIDs, assignedClientIDs] = await Promise.all([
        getLeadAssignedJobIDs({ leadRecruiterID, req }),
        getLeadAssignedClientIDs({ leadRecruiterID, req }),
      ])

      if (assignedClientIDs.length === 0) {
        return uniqueIDs(directJobIDs.map((id) => id))
      }

      const { docs } = await req.payload.find({
        collection: 'jobs',
        depth: 0,
        limit: 1000,
        pagination: false,
        overrideAccess: false,
        req,
        select: {
          title: true,
        },
        where: {
          client: {
            in: assignedClientIDs,
          },
        },
      })

      const viaClientJobIDs = docs.map((doc) =>
        typeof doc.id === 'number' || typeof doc.id === 'string' ? doc.id : null,
      )

      return uniqueIDs([...directJobIDs, ...viaClientJobIDs])
    },
  })

export const getRecruiterAssignedJobIDs = async ({
  recruiterID,
  req,
}: {
  recruiterID: ID
  req: PayloadRequest
}): Promise<ID[]> =>
  readCachedIDs({
    cacheKey: `recruiter-job:${String(recruiterID)}`,
    req,
    resolver: async () => {
      const { docs } = await req.payload.find({
        collection: 'recruiter-job-assignments',
        depth: 0,
        limit: 1000,
        pagination: false,
        overrideAccess: false,
        req,
        select: {
          job: true,
        },
        where: {
          and: [
            {
              recruiter: {
                equals: recruiterID,
              },
            },
            {
              status: {
                equals: 'active',
              },
            },
          ],
        },
      })

      return uniqueIDs(docs.map((doc) => extractRelationshipID(doc.job)))
    },
  })
