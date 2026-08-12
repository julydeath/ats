import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload, type Where } from 'payload'

import {
  CandidateCreateForm,
  type CandidateFormInitialData,
} from '@/components/internal/CandidateCreateForm'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

type ResumeImportReviewPageProps = {
  params: Promise<{
    id: string
    itemId: string
  }>
  searchParams?: Promise<{
    error?: string
  }>
}

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

const parseNumericID = (value: string): number | null => {
  if (!/^\d+$/.test(value)) {
    return null
  }

  return Number(value)
}

const toText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized ? normalized : null
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value.trim())
    return Number.isFinite(numeric) ? numeric : null
  }

  return null
}

const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (['true', 'yes', 'y', 'on'].includes(normalized)) {
      return true
    }

    if (['false', 'no', 'n', 'off'].includes(normalized)) {
      return false
    }
  }

  return null
}

const toList = (value: unknown): string[] | null => {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)

    return items.length > 0 ? Array.from(new Set(items)) : null
  }

  if (typeof value === 'string') {
    const items = value
      .split(/[,\n]/g)
      .map((item) => item.trim())
      .filter(Boolean)

    return items.length > 0 ? Array.from(new Set(items)) : null
  }

  return null
}

const buildInitialData = ({
  parsedData,
  sourceJobID,
}: {
  parsedData: unknown
  sourceJobID: string
}): CandidateFormInitialData => {
  const parsed = parsedData && typeof parsedData === 'object' ? (parsedData as Record<string, unknown>) : {}
  const firstName = toText(parsed.firstName)
  const middleName = toText(parsed.middleName)
  const lastName = toText(parsed.lastName)
  const fallbackFullName = [firstName, middleName, lastName].filter(Boolean).join(' ')
  const fullName = toText(parsed.fullName) || toText(parsed.name) || fallbackFullName

  return {
    additionalComments: toText(parsed.additionalComments),
    address: toText(parsed.address),
    alternateEmail: toText(parsed.alternateEmail),
    alternatePhone: toText(parsed.alternatePhone),
    applicantGroup: toText(parsed.applicantGroup),
    applicantStatus: toText(parsed.applicantStatus),
    city: toText(parsed.city),
    clearance: toBoolean(parsed.clearance),
    country: toText(parsed.country) || 'India',
    currentCompany: toText(parsed.currentCompany),
    currentLocation: toText(parsed.currentLocation) || toText(parsed.location),
    currentRole: toText(parsed.currentRole) || toText(parsed.currentDesignation),
    email: toText(parsed.email),
    expectedPayCurrency: toText(parsed.expectedPayCurrency),
    expectedPayMax: toNumber(parsed.expectedPayMax),
    expectedPayMin: toNumber(parsed.expectedPayMin),
    expectedPayType: toText(parsed.expectedPayType),
    expectedPayUnit: toText(parsed.expectedPayUnit),
    expectedSalary: toNumber(parsed.expectedSalary),
    facebookProfileURL: toText(parsed.facebookProfileURL),
    firstName,
    fullName: fullName || '',
    gpa: toText(parsed.gpa),
    homePhone: toText(parsed.homePhone),
    jobTitle: toText(parsed.jobTitle),
    lastName,
    linkedInURL: toText(parsed.linkedInURL),
    middleName,
    nationality: toText(parsed.nationality),
    nickName: toText(parsed.nickName),
    notes: toText(parsed.notes),
    noticePeriodDays: toNumber(parsed.noticePeriodDays),
    noticePeriodLabel: toText(parsed.noticePeriodLabel),
    otherPhone: toText(parsed.otherPhone),
    phone: toText(parsed.phone) || toText(parsed.mobile) || toText(parsed.phoneNumber),
    portfolioURL: toText(parsed.portfolioURL),
    postalCode: toText(parsed.postalCode),
    prefix: toText(parsed.prefix),
    primarySkills: toList(parsed.primarySkills),
    referenceID: toText(parsed.referenceID),
    referredBy: toText(parsed.referredBy),
    relocation: toBoolean(parsed.relocation),
    skypeID: toText(parsed.skypeID),
    source: 'database',
    sourceDetails: toText(parsed.sourceDetails) || 'Bulk resume import',
    sourceJobID,
    skills: toList(parsed.skills) || toList(parsed.keySkills) || toList(parsed.technicalSkills),
    state: toText(parsed.state),
    taxTerms: toText(parsed.taxTerms),
    technology: toText(parsed.technology),
    totalExperienceMonths: toNumber(parsed.totalExperienceMonths),
    totalExperienceYears: toNumber(parsed.totalExperienceYears),
    twitterProfileURL: toText(parsed.twitterProfileURL),
    videoReference: toText(parsed.videoReference),
    workAuthorization: toText(parsed.workAuthorization),
    workAuthorizationExpiry: toText(parsed.workAuthorizationExpiry),
    workPhone: toText(parsed.workPhone),
  }
}

export default async function ResumeImportReviewPage({
  params,
  searchParams,
}: ResumeImportReviewPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const { id, itemId } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const batchID = parseNumericID(id)
  const importItemID = parseNumericID(itemId)

  if (!batchID || !importItemID) {
    notFound()
  }

  const [batch, itemsResult] = await Promise.all([
    payload.findByID({
      collection: 'candidate-resume-import-batches',
      depth: 1,
      id: batchID,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'candidate-resume-import-items',
      depth: 1,
      limit: 1,
      overrideAccess: false,
      pagination: false,
      user,
      where: {
        and: [
          {
            id: {
              equals: importItemID,
            },
          },
          {
            batch: {
              equals: batchID,
            },
          },
        ],
      },
    }),
  ]).catch(() => {
    notFound()
  })

  const item = itemsResult.docs[0]

  if (!item) {
    notFound()
  }

  const resumeID = extractRelationshipID(item.resume)
  const candidateID = extractRelationshipID(item.candidate)
  const sourceJobID = extractRelationshipID(item.sourceJob) || extractRelationshipID(batch.sourceJob)
  const selectedJobID = sourceJobID ? String(sourceJobID) : ''

  if (item.status === 'candidateCreated' && candidateID) {
    return (
      <section className="candidate-import-page">
        <header className="candidate-import-header">
          <div>
            <p className="candidate-import-kicker">Resume Import</p>
            <h1>Candidate Already Created</h1>
            <p>{item.itemCode || `Item ${item.id}`} has already been converted into a candidate.</p>
          </div>
          <div className="candidate-import-header-actions">
            <Link className="candidate-intake-head-btn" href={`${APP_ROUTES.internal.candidates.detailBase}/${candidateID}`}>
              Open Candidate
            </Link>
            <Link className="candidate-intake-head-btn" href={`${APP_ROUTES.internal.candidates.imports}/${batchID}`}>
              Back to Batch
            </Link>
          </div>
        </header>
      </section>
    )
  }

  if (item.status !== 'needsReview') {
    return (
      <section className="candidate-import-page">
        <header className="candidate-import-header">
          <div>
            <p className="candidate-import-kicker">Resume Import</p>
            <h1>Resume Not Ready</h1>
            <p>{item.error || 'This resume is still queued or processing. Try continuing the batch.'}</p>
          </div>
          <div className="candidate-import-header-actions">
            <form action={`${APP_ROUTES.internal.candidates.imports}/${batchID}/process`} method="post">
              <input name="itemId" type="hidden" value={String(item.id)} />
              <button className="candidate-intake-submit" type="submit">
                Continue Processing
              </button>
            </form>
            <Link className="candidate-intake-head-btn" href={`${APP_ROUTES.internal.candidates.imports}/${batchID}`}>
              Back to Batch
            </Link>
          </div>
        </header>
      </section>
    )
  }

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
      overrideAccess: false,
      pagination: false,
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
      overrideAccess: false,
      pagination: false,
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

  return (
    <CandidateCreateForm
      cancelHref={`${APP_ROUTES.internal.candidates.imports}/${batchID}`}
      descriptionOverride="Review parser results, fix missing details, then save this imported resume as a candidate."
      errorMessage={resolvedSearchParams.error ? String(resolvedSearchParams.error) : undefined}
      hiddenFields={[
        { name: 'importBatchId', value: batchID },
        { name: 'importItemId', value: item.id },
        ...(resumeID ? [{ name: 'resumeId', value: resumeID }] : []),
      ]}
      initialData={buildInitialData({
        parsedData: item.parsedData,
        sourceJobID: jobs.some((job) => String(job.id) === selectedJobID) ? selectedJobID : '',
      })}
      jobs={jobs}
      owners={owners}
      selectedJobID={jobs.some((job) => String(job.id) === selectedJobID) ? selectedJobID : ''}
      showParser={false}
      submitLabelOverride="Create Candidate"
      titleOverride="Review Parsed Resume"
    />
  )
}
