import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { CandidateCreateForm } from '@/components/internal/CandidateCreateForm'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import { extractRelationshipID } from '@/lib/utils/relationships'

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as {
      name?: string
      title?: string
    }

    return typed.title || typed.name || fallback
  }

  return fallback
}

const toRelationshipKey = (value: unknown): string | null => {
  const id = extractRelationshipID(value)

  if (typeof id === 'number' || typeof id === 'string') {
    return String(id)
  }

  return null
}

type CandidateNewPageProps = {
  searchParams?: Promise<{
    error?: string
    jobId?: string
  }>
}

export default async function CandidateNewPage({ searchParams }: CandidateNewPageProps) {
  const user = await requireInternalRole(['admin', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const selectedJobID = String(resolvedSearchParams.jobId || '')

  const jobsResult = await payload.find({
    collection: 'jobs',
    depth: 0,
    limit: 120,
    pagination: false,
    overrideAccess: false,
    select: {
      client: true,
      id: true,
      priority: true,
      title: true,
    },
    sort: '-updatedAt',
    user,
    where: {
      status: {
        in: ['active', 'onHold'],
      },
    },
  })

  const unresolvedClientIDs = Array.from(
    new Set(
      jobsResult.docs
        .map((job) => toRelationshipKey(job.client))
        .filter((id): id is string => Boolean(id)),
    ),
  )

  const fallbackClientsResult =
    unresolvedClientIDs.length === 0
      ? { docs: [] as Array<{ id: number | string; name?: string }> }
      : await payload.find({
          collection: 'clients',
          depth: 0,
          limit: unresolvedClientIDs.length,
          overrideAccess: true,
          pagination: false,
          select: {
            id: true,
            name: true,
          },
          where: {
            id: {
              in: unresolvedClientIDs,
            },
          },
        })

  const fallbackClientNameByID = new Map(
    fallbackClientsResult.docs.map((client) => [String(client.id), client.name || String(client.id)]),
  )

  const jobs = jobsResult.docs.map((job) => {
    const clientKey = toRelationshipKey(job.client)
    const clientLabel =
      typeof job.client === 'object'
        ? readLabel(job.client)
        : clientKey
          ? fallbackClientNameByID.get(clientKey) || readLabel(job.client)
          : readLabel(job.client)

    return {
      clientLabel,
      id: job.id,
      priority: readLabel(job.priority, 'normal'),
      title: job.title,
    }
  })

  const normalizedSelectedJobID = jobs.some((job) => String(job.id) === selectedJobID) ? selectedJobID : ''
  const errorMessage = resolvedSearchParams.error ? String(resolvedSearchParams.error) : undefined

  return <CandidateCreateForm errorMessage={errorMessage} jobs={jobs} selectedJobID={normalizedSelectedJobID} />
}
