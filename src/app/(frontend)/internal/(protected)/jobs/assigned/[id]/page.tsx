import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { ApplicationFlowProgress } from '@/components/internal/ApplicationFlowProgress'
import { JobApplicantsBoard } from '@/components/internal/JobApplicantsBoard'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APPLICATION_STAGE_LABELS, type ApplicationStage } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import type { InternalRole } from '@/lib/constants/roles'
import { extractRelationshipID } from '@/lib/utils/relationships'

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as {
      email?: string
      fullName?: string
      name?: string
      title?: string
    }

    return typed.fullName || typed.title || typed.name || typed.email || fallback
  }

  return fallback
}

const toNumericID = (value: string): number | null => {
  if (!/^\d+$/.test(value)) {
    return null
  }

  return Number(value)
}

const relationshipToNumericID = (value: unknown): number | null => {
  const id = extractRelationshipID(value)

  if (typeof id === 'number') {
    return id
  }

  if (typeof id === 'string' && /^\d+$/.test(id)) {
    return Number(id)
  }

  return null
}

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) {
    return 'Not set'
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return 'Not set'
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) {
    return 'Not set'
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return 'Not set'
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

type JobBoardPageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    q?: string
    stage?: string
    tab?: string
  }>
}

const TAB_OPTIONS = ['applicants', 'about', 'discussion', 'schedule'] as const
type JobTab = (typeof TAB_OPTIONS)[number]

const isJobTab = (value: string): value is JobTab => TAB_OPTIONS.includes(value as JobTab)

const TAB_LABELS: Record<JobTab, string> = {
  applicants: 'Applicants',
  about: 'About Job',
  discussion: 'Discussion',
  schedule: 'Schedule',
}

const STAGE_FILTER_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Sourced', value: 'sourced' },
  { label: 'Screened', value: 'screened' },
  { label: 'Submitted to Client', value: 'submittedToClient' },
  { label: 'Interview Scheduled', value: 'interviewScheduled' },
  { label: 'Interview Cleared', value: 'interviewCleared' },
  { label: 'Offer Released', value: 'offerReleased' },
  { label: 'Joined', value: 'joined' },
  { label: 'Rejected', value: 'rejected' },
]

const BOARD_ROLE: Record<InternalRole, 'admin' | 'leadRecruiter' | 'recruiter'> = {
  admin: 'admin',
  leadRecruiter: 'leadRecruiter',
  recruiter: 'recruiter',
}

export default async function JobBoardPage({ params, searchParams }: JobBoardPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const { id } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const jobID = toNumericID(id)

  if (!jobID) {
    notFound()
  }

  const tabRaw = String(resolvedSearchParams.tab || 'applicants').toLowerCase()
  const activeTab: JobTab = isJobTab(tabRaw) ? tabRaw : 'applicants'
  const searchQuery = (resolvedSearchParams.q || '').trim().toLowerCase()
  const stageFilter = (resolvedSearchParams.stage || '').trim()
  const canAddApplicant = user.role === 'admin' || user.role === 'leadRecruiter' || user.role === 'recruiter'
  const boardRole = BOARD_ROLE[user.role]

  try {
    const [job, applications, interviews, stageHistory] = await Promise.all([
      payload.findByID({
        collection: 'jobs',
        id: jobID,
        depth: 1,
        overrideAccess: false,
        select: {
          assignedTo: true,
          businessUnit: true,
          client: true,
          clientBillRate: true,
          clientJobID: true,
          createdAt: true,
          department: true,
          description: true,
          employmentType: true,
          experienceMax: true,
          experienceMin: true,
          id: true,
          jobCode: true,
          location: true,
          openings: true,
          owningHeadRecruiter: true,
          payRate: true,
          payType: true,
          primaryRecruiter: true,
          priority: true,
          recruitmentManager: true,
          requirementAssignedOn: true,
          requisitionTitle: true,
          requiredSkills: true,
          salaryRangeLabel: true,
          salaryMax: true,
          salaryMin: true,
          status: true,
          states: true,
          targetClosureDate: true,
          title: true,
          updatedAt: true,
        },
        user,
      }),
      payload.find({
        collection: 'applications',
        depth: 1,
        limit: 220,
        pagination: false,
        overrideAccess: false,
        select: {
          applicationCode: true,
          candidate: true,
          id: true,
          job: true,
          latestComment: true,
          notes: true,
          recruiter: true,
          stage: true,
          updatedAt: true,
        },
        sort: '-updatedAt',
        user,
        where: {
          job: {
            equals: jobID,
          },
        },
      }),
      payload.find({
        collection: 'interviews',
        depth: 1,
        limit: 120,
        pagination: false,
        overrideAccess: false,
        select: {
          candidate: true,
          id: true,
          interviewRound: true,
          interviewerName: true,
          mode: true,
          recruiter: true,
          startTime: true,
          status: true,
        },
        sort: 'startTime',
        user,
        where: {
          job: {
            equals: jobID,
          },
        },
      }),
      payload.find({
        collection: 'application-stage-history',
        depth: 1,
        limit: 600,
        pagination: false,
        overrideAccess: false,
        select: {
          actor: true,
          application: true,
          changedAt: true,
          toStage: true,
        },
        sort: '-changedAt',
        user,
        where: {
          job: {
            equals: jobID,
          },
        },
      }),
    ])

    const filteredApplications = applications.docs.filter((application) => {
      if (stageFilter && application.stage !== stageFilter) {
        return false
      }

      if (!searchQuery) {
        return true
      }

      const candidate = application.candidate as
        | {
            currentCompany?: string
            currentRole?: string
            email?: string
            fullName?: string
            phone?: string
          }
        | number
        | string
        | null

      const haystack = [
        readLabel(application.candidate),
        readLabel(application.recruiter),
        readLabel(application.job),
        typeof candidate === 'object' ? candidate?.currentCompany || '' : '',
        typeof candidate === 'object' ? candidate?.currentRole || '' : '',
        typeof candidate === 'object' ? candidate?.email || '' : '',
        typeof candidate === 'object' ? candidate?.phone || '' : '',
        application.latestComment || '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(searchQuery)
    })

    const boardCards = filteredApplications.map((application) => {
      const candidate = application.candidate as
        | {
            currentCompany?: string
            currentLocation?: string
            currentRole?: string
            email?: string
            fullName?: string
            linkedInURL?: string
            phone?: string
            portfolioURL?: string
            totalExperienceYears?: number
          }
        | number
        | string
        | null

      const normalizedCandidateID = relationshipToNumericID(application.candidate)

      return {
        applicationNotes: application.notes || '',
        candidateCompany:
          typeof candidate === 'object' && candidate?.currentCompany
            ? `Ex: ${candidate.currentCompany}`
            : 'Ex: Not provided',
        candidateEmail: (typeof candidate === 'object' && candidate?.email) || '',
        candidateExperience:
          typeof candidate === 'object' && typeof candidate?.totalExperienceYears === 'number'
            ? `${candidate.totalExperienceYears} years experience`
            : 'Experience not provided',
        candidateId: normalizedCandidateID,
        candidateLinkedIn: (typeof candidate === 'object' && candidate?.linkedInURL) || '',
        candidateLocation: (typeof candidate === 'object' && candidate?.currentLocation) || '',
        candidateName: readLabel(application.candidate, 'Candidate'),
        candidatePhone: (typeof candidate === 'object' && candidate?.phone) || '',
        candidatePortfolio: (typeof candidate === 'object' && candidate?.portfolioURL) || '',
        candidateRole:
          typeof candidate === 'object' && candidate?.currentRole ? candidate.currentRole : 'Role not provided',
        id: application.id,
        latestComment: application.latestComment || '',
        recruiterName: readLabel(application.recruiter),
        stage: application.stage as ApplicationStage,
        updatedAt: application.updatedAt,
      }
    })

    const teamMembers = Array.from(
      new Set(applications.docs.map((application) => readLabel(application.recruiter)).filter(Boolean)),
    ).slice(0, 4)

    const stageHistoryByApplication = new Map<
      string,
      Array<{
        actor?: unknown
        changedAt?: Date | string | null
        toStage?: unknown
      }>
    >()

    stageHistory.docs.forEach((entry) => {
      const applicationKey = String(extractRelationshipID(entry.application) || '')
      if (!applicationKey) {
        return
      }

      const bucket = stageHistoryByApplication.get(applicationKey) || []
      bucket.push({
        actor: entry.actor,
        changedAt: entry.changedAt,
        toStage: entry.toStage,
      })
      stageHistoryByApplication.set(applicationKey, bucket)
    })

    const flowFocusApplication = filteredApplications[0] || applications.docs[0] || null
    const flowFocusApplicationHistory = flowFocusApplication
      ? stageHistoryByApplication.get(String(flowFocusApplication.id)) || []
      : []

    const discussionItems = applications.docs
      .filter((application) => application.latestComment && application.latestComment.trim().length > 0)
      .slice(0, 25)

    const scheduleItems = interviews.docs.slice(0, 24)

    return (
      <section className="job-detail-page">
        <header className="job-detail-hero">
          <div className="job-detail-hero-copy">
            <p className="job-detail-kicker">Jobs / {job.title}</p>
            <h1>{job.title}</h1>
            <p className="job-detail-meta-line">
              <span>{job.jobCode || `JOB-${job.id}`}</span>
              <span>{job.location || 'Location not set'}</span>
              <span>Posted {formatDate(job.createdAt)}</span>
              <span>{applications.totalDocs} Applicants</span>
            </p>
          </div>

          <div className="job-detail-hero-actions">
            <div className="job-detail-avatars">
              {teamMembers.length === 0 ? (
                <span className="muted tiny">No assigned recruiters</span>
              ) : (
                teamMembers.map((member, index) => (
                  <span className="job-detail-avatar" key={`${member}-${index + 1}`} title={member}>
                    {member
                      .split(' ')
                      .map((part) => part[0] || '')
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                ))
              )}
            </div>

            <div className="job-detail-action-row">
              {canAddApplicant ? (
                <Link className="job-detail-button job-detail-button-primary" href={`${APP_ROUTES.internal.applications.new}?jobId=${job.id}`}>
                  Add Applicant
                </Link>
              ) : null}
              <Link className="job-detail-button" href={`${APP_ROUTES.internal.jobs.detailBase}/${job.id}?tab=schedule`}>
                Schedule
              </Link>
              <Link className="job-detail-button job-detail-button-ghost" href={APP_ROUTES.internal.jobs.assigned}>
                Back to Jobs
              </Link>
            </div>
          </div>
        </header>

        <nav className="job-detail-tabbar">
          {TAB_OPTIONS.map((tab) => (
            <Link
              className={`job-detail-tab ${activeTab === tab ? 'job-detail-tab-active' : ''}`}
              href={`${APP_ROUTES.internal.jobs.detailBase}/${job.id}?tab=${tab}`}
              key={tab}
            >
              {TAB_LABELS[tab]}
            </Link>
          ))}
        </nav>

        {flowFocusApplication ? (
          <section className="job-detail-content-card">
            <ApplicationFlowProgress
              applicationCode={flowFocusApplication.applicationCode || `APP-${flowFocusApplication.id}`}
              currentStage={flowFocusApplication.stage as ApplicationStage}
              detailHref={`${APP_ROUTES.internal.applications.detailBase}/${flowFocusApplication.id}`}
              entries={flowFocusApplicationHistory}
              fallbackOwnerName={readLabel(flowFocusApplication.recruiter, 'Unassigned')}
              fallbackOwnerRole="recruiter"
              fallbackTimestamp={flowFocusApplication.updatedAt}
              subtitle={`${readLabel(flowFocusApplication.candidate)} · Live job pipeline snapshot`}
              title="Job Flow Snapshot"
            />
          </section>
        ) : null}

        {activeTab === 'applicants' ? (
          <>
            <section className="job-detail-toolbar-card">
              <form className="job-detail-toolbar" method="get">
                <input name="tab" type="hidden" value="applicants" />
                <input
                  className="job-detail-search"
                  defaultValue={resolvedSearchParams.q || ''}
                  name="q"
                  placeholder="Search by candidate, recruiter, job, skill..."
                  type="search"
                />
                <select className="job-detail-select" defaultValue={stageFilter} name="stage">
                  <option value="">Filter by stage</option>
                  {STAGE_FILTER_OPTIONS.map((stage) => (
                    <option key={`board-stage-${stage.value}`} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
                <button className="job-detail-toolbar-button" type="submit">
                  Filter
                </button>
                <Link className="job-detail-toolbar-button job-detail-toolbar-button-secondary" href={`${APP_ROUTES.internal.jobs.detailBase}/${job.id}?tab=applicants`}>
                  Reset
                </Link>
              </form>
            </section>

            <section className="job-detail-board-card">
              <JobApplicantsBoard boardRole={boardRole} cards={boardCards} jobId={job.id} />
            </section>
          </>
        ) : null}

        {activeTab === 'about' ? (
          <section className="job-detail-content-card">
            <h2>About Job</h2>
            <div className="job-detail-about-grid">
              <p>
                <strong>Client:</strong> {readLabel(job.client)}
              </p>
              <p>
                <strong>Client Job ID:</strong> {job.clientJobID || 'Not set'}
              </p>
              <p>
                <strong>Requisition:</strong> {job.requisitionTitle || 'Not set'}
              </p>
              <p>
                <strong>Business Unit:</strong> {job.businessUnit || 'Not set'}
              </p>
              <p>
                <strong>Department:</strong> {job.department || 'Not set'}
              </p>
              <p>
                <strong>Employment:</strong> {job.employmentType}
              </p>
              <p>
                <strong>Location:</strong> {job.location || 'Not set'}
              </p>
              <p>
                <strong>Openings:</strong> {job.openings}
              </p>
              <p>
                <strong>Experience:</strong> {job.experienceMin ?? 0} - {job.experienceMax ?? 'Any'} years
              </p>
              <p>
                <strong>Salary:</strong> {job.salaryMin ?? 0} - {job.salaryMax ?? 'Not set'}
              </p>
              <p>
                <strong>Salary Label:</strong> {job.salaryRangeLabel || 'Not set'}
              </p>
              <p>
                <strong>Client Bill Rate:</strong> {job.clientBillRate || 'Not set'}
              </p>
              <p>
                <strong>Pay Rate:</strong> {job.payRate || 'Not set'}
              </p>
              <p>
                <strong>Pay Type:</strong> {job.payType || 'Not set'}
              </p>
              <p>
                <strong>Priority:</strong> {job.priority}
              </p>
              <p>
                <strong>Status:</strong> {job.status}
              </p>
              <p>
                <strong>States:</strong> {Array.isArray(job.states) && job.states.length > 0 ? job.states.join(', ') : 'Not set'}
              </p>
              <p>
                <strong>Lead Recruiter:</strong> {readLabel(job.owningHeadRecruiter)}
              </p>
              <p>
                <strong>Recruitment Manager:</strong> {readLabel(job.recruitmentManager, 'Not set')}
              </p>
              <p>
                <strong>Primary Recruiter:</strong> {readLabel(job.primaryRecruiter, 'Not set')}
              </p>
              <p>
                <strong>Assigned Team:</strong>{' '}
                {Array.isArray(job.assignedTo) && job.assignedTo.length > 0
                  ? job.assignedTo.map((member) => readLabel(member)).join(', ')
                  : 'Not set'}
              </p>
              <p>
                <strong>Requirement Assigned On:</strong> {formatDate(job.requirementAssignedOn)}
              </p>
              <p>
                <strong>Target Closure:</strong> {formatDate(job.targetClosureDate)}
              </p>
            </div>

            <p className="job-detail-section-title">Description</p>
            <p className="job-detail-paragraph">{job.description || 'Not provided'}</p>

            <p className="job-detail-section-title">Required Skills</p>
            {job.requiredSkills?.length ? (
              <div className="job-detail-skill-tags">
                {job.requiredSkills.map((item, index) => (
                  <span className="job-detail-skill-tag" key={`job-skill-${index + 1}`}>
                    {item.skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="job-detail-paragraph">No required skills added.</p>
            )}
          </section>
        ) : null}

        {activeTab === 'discussion' ? (
          <section className="job-detail-content-card">
            <div className="job-detail-content-head">
              <h2>Discussion</h2>
              <p>{discussionItems.length} conversation entries</p>
            </div>
            {discussionItems.length === 0 ? (
              <p className="job-detail-empty">No discussion notes yet for this job.</p>
            ) : (
              <div className="job-detail-discussion-list">
                {discussionItems.map((application) => (
                  <article className="job-detail-discussion-item" key={`discussion-${application.id}`}>
                    <p className="job-detail-discussion-title">{readLabel(application.candidate)}</p>
                    <p className="job-detail-discussion-meta">
                      {readLabel(application.recruiter)} · {APPLICATION_STAGE_LABELS[application.stage as ApplicationStage]}
                    </p>
                    <p className="job-detail-discussion-text">{application.latestComment}</p>
                    <Link
                      className="job-detail-inline-link"
                      href={`${APP_ROUTES.internal.applications.detailBase}/${application.id}`}
                    >
                      Open Application
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {activeTab === 'schedule' ? (
          <section className="job-detail-content-card">
            <div className="job-detail-content-head">
              <h2>Schedule</h2>
              <Link className="job-detail-inline-link" href={APP_ROUTES.internal.schedule}>
                Open Full Calendar
              </Link>
            </div>
            {scheduleItems.length === 0 ? (
              <p className="job-detail-empty">No upcoming schedule items for this job.</p>
            ) : (
              <div className="job-detail-schedule-list">
                {scheduleItems.map((interview) => (
                  <article className="job-detail-schedule-item" key={`job-schedule-${interview.id}`}>
                    <div>
                      <p className="job-detail-schedule-title">{readLabel(interview.candidate)}</p>
                      <p className="job-detail-schedule-meta">
                        {String(interview.interviewRound || 'screening')} · {String(interview.status || 'scheduled')} ·{' '}
                        {readLabel(interview.recruiter)} · {String(interview.mode || 'video')}
                      </p>
                      <p className="job-detail-schedule-meta">{interview.interviewerName || 'Interviewer not set'}</p>
                    </div>
                    <p className="job-detail-schedule-time">{formatDateTime(interview.startTime)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </section>
    )
  } catch {
    notFound()
  }
}
