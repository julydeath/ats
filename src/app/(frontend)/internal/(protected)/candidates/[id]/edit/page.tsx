import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload, type Where } from 'payload'

import { CandidateCreateForm, type CandidateFormInitialData } from '@/components/internal/CandidateCreateForm'
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
    const typed = value as { clientCode?: string; email?: string; fullName?: string; name?: string; title?: string }
    return typed.fullName || typed.title || typed.name || typed.email || typed.clientCode || fallback
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

type CandidateEditPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function CandidateEditPage({ params, searchParams }: CandidateEditPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter'])
  const payload = await getPayload({ config: configPromise })
  const { id } = await params
  const resolvedSearchParams = (await searchParams) ?? {}

  if (!/^\d+$/.test(id)) {
    notFound()
  }

  const candidateID = Number(id)

  try {
    const candidate = await payload.findByID({
      collection: 'candidates',
      depth: 1,
      id: candidateID,
      overrideAccess: false,
      select: {
        aadhaarNumber: true,
        additionalComments: true,
        address: true,
        alternateEmail: true,
        alternatePhone: true,
        applicantGroup: true,
        applicantStatus: true,
        city: true,
        clearance: true,
        country: true,
        currentCompany: true,
        currentLocation: true,
        currentRole: true,
        disabilityStatus: true,
        email: true,
        expectedPayCurrency: true,
        expectedPayMax: true,
        expectedPayMin: true,
        expectedPayType: true,
        expectedPayUnit: true,
        expectedSalary: true,
        facebookProfileURL: true,
        firstName: true,
        fullName: true,
        gender: true,
        gpa: true,
        homePhone: true,
        id: true,
        jobTitle: true,
        lastName: true,
        linkedInURL: true,
        middleName: true,
        nationality: true,
        nickName: true,
        notes: true,
        noticePeriodDays: true,
        noticePeriodLabel: true,
        otherPhone: true,
        ownership: true,
        phone: true,
        portfolioURL: true,
        postalCode: true,
        prefix: true,
        primarySkills: true,
        raceEthnicity: true,
        referenceID: true,
        referredBy: true,
        relocation: true,
        skypeID: true,
        source: true,
        sourceDetails: true,
        sourceJob: true,
        skills: true,
        state: true,
        taxTerms: true,
        technology: true,
        totalExperienceMonths: true,
        totalExperienceYears: true,
        twitterProfileURL: true,
        veteranStatus: true,
        videoReference: true,
        workAuthorization: true,
        workAuthorizationExpiry: true,
        workPhone: true,
      },
      user,
    })

    const selectedJobID = toRelationshipKey(candidate.sourceJob)
    const jobsWhere: Where = selectedJobID
      ? {
          or: [
            {
              status: {
                in: ['active', 'onHold'],
              },
            },
            {
              id: {
                equals: Number(selectedJobID),
              },
            },
          ],
        }
      : {
          status: {
            in: ['active', 'onHold'],
          },
        }

    const [jobsResult, ownersResult] = await Promise.all([
      payload.find({
        collection: 'jobs',
        depth: 1,
        limit: 160,
        pagination: false,
        overrideAccess: false,
        select: {
          client: true,
          id: true,
          jobCode: true,
          priority: true,
          title: true,
        },
        sort: '-updatedAt',
        user,
        where: jobsWhere,
      }),
      payload.find({
        collection: 'users',
        depth: 0,
        limit: 180,
        pagination: false,
        overrideAccess: false,
        select: {
          email: true,
          fullName: true,
          id: true,
        },
        sort: 'fullName',
        user,
        where: {
          isActive: {
            equals: true,
          },
        },
      }),
    ])

    const jobs = jobsResult.docs.map((job) => ({
      clientLabel: readLabel(job.client),
      id: job.id,
      jobCode: job.jobCode || '',
      priority: readLabel(job.priority, 'normal'),
      title: job.title,
    }))
    const owners = ownersResult.docs.map((member) => ({
      id: member.id,
      label: member.fullName || member.email || String(member.id),
    }))
    const initialData: CandidateFormInitialData = {
      ...candidate,
      ownershipID: extractRelationshipID(candidate.ownership),
      sourceJobID: selectedJobID,
    }

    return (
      <CandidateCreateForm
        errorMessage={resolvedSearchParams.error ? String(resolvedSearchParams.error) : undefined}
        initialData={initialData}
        jobs={jobs}
        mode="edit"
        owners={owners}
        selectedJobID={selectedJobID || ''}
      />
    )
  } catch {
    notFound()
  }
}
