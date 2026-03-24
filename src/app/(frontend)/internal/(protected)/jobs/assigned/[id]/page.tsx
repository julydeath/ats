import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { JobApplicantsBoard } from '@/components/internal/JobApplicantsBoard'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APPLICATION_STAGE_LABELS, type ApplicationStage } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import type { InternalRole } from '@/lib/constants/roles'

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

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) {
    return 'Not set'
  }

  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
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
  { label: 'Applied', value: 'sourcedByRecruiter' },
  { label: 'Screening', value: 'internalReviewPending' },
  { label: 'Skill Test', value: 'internalReviewApproved' },
  { label: 'Interview', value: 'candidateInvited' },
  { label: 'Hired', value: 'candidateApplied' },
  { label: 'Needs Correction', value: 'sentBackForCorrection' },
  { label: 'Rejected', value: 'internalReviewRejected' },
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
  const canAddApplicant = user.role === 'admin' || user.role === 'recruiter'
  const boardRole = BOARD_ROLE[user.role]

  try {
    const [job, applications] = await Promise.all([
      payload.findByID({
        collection: 'jobs',
        id: jobID,
        depth: 1,
        overrideAccess: false,
        select: {
          client: true,
          createdAt: true,
          department: true,
          description: true,
          employmentType: true,
          experienceMax: true,
          experienceMin: true,
          id: true,
          location: true,
          openings: true,
          priority: true,
          requiredSkills: true,
          salaryMax: true,
          salaryMin: true,
          status: true,
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
            fullName?: string
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
            currentRole?: string
            fullName?: string
            totalExperienceYears?: number
          }
        | number
        | string
        | null

      return {
        candidateCompany:
          typeof candidate === 'object' && candidate?.currentCompany
            ? `Ex: ${candidate.currentCompany}`
            : 'Ex: Not provided',
        candidateExperience:
          typeof candidate === 'object' && typeof candidate?.totalExperienceYears === 'number'
            ? `${candidate.totalExperienceYears} years experience`
            : 'Experience not provided',
        candidateName: readLabel(application.candidate, 'Candidate'),
        candidateRole:
          typeof candidate === 'object' && candidate?.currentRole ? candidate.currentRole : 'Role not provided',
        id: application.id,
        latestComment: application.latestComment || '',
        recruiterName: readLabel(application.recruiter),
        stage: application.stage as ApplicationStage,
        updatedAt: application.updatedAt,
      }
    })

    const stageCountMap = new Map<string, number>()
    STAGE_FILTER_OPTIONS.forEach((option) => stageCountMap.set(option.value, 0))
    applications.docs.forEach((application) => {
      stageCountMap.set(application.stage, (stageCountMap.get(application.stage) || 0) + 1)
    })

    const teamMembers = Array.from(
      new Set(applications.docs.map((application) => readLabel(application.recruiter)).filter(Boolean)),
    ).slice(0, 4)

    const discussionItems = applications.docs
      .filter((application) => application.latestComment && application.latestComment.trim().length > 0)
      .slice(0, 25)

    const scheduleItems = applications.docs
      .filter((application) =>
        ['internalReviewPending', 'candidateInvited', 'candidateApplied'].includes(application.stage),
      )
      .slice(0, 24)

    return (
      <section className="dashboard-grid">
        <article className="panel panel-span-2">
          <div className="job-detail-header">
            <div>
              <h1>{job.title}</h1>
              <p className="panel-subtitle">
                Published on {formatDate(job.createdAt)} | End on {formatDate(job.targetClosureDate)}
              </p>
            </div>
            <div className="job-detail-top-actions">
              <span className={`status-chip ${job.status === 'active' ? 'status-chip-active' : ''}`}>
                {job.status === 'active' ? 'Actively hiring' : job.status}
              </span>
              <Link className="button button-secondary" href={APP_ROUTES.internal.jobs.assigned}>
                Back to Jobs
              </Link>
            </div>
          </div>

          <div className="job-detail-subheader">
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
            <div className="public-actions">
              {canAddApplicant ? (
                <Link className="button" href={`${APP_ROUTES.internal.applications.new}?jobId=${job.id}`}>
                  Add Applicant
                </Link>
              ) : null}
              <Link className="button button-secondary" href={`${APP_ROUTES.internal.jobs.detailBase}/${job.id}?tab=schedule`}>
                Open Schedule
              </Link>
            </div>
          </div>
        </article>

        <article className="panel panel-span-2">
          <div className="job-tab-nav">
            {TAB_OPTIONS.map((tab) => (
              <Link
                className={`job-tab-link ${activeTab === tab ? 'job-tab-link-active' : ''}`}
                href={`${APP_ROUTES.internal.jobs.detailBase}/${job.id}?tab=${tab}`}
                key={tab}
              >
                {TAB_LABELS[tab]}
              </Link>
            ))}
          </div>
        </article>

        {activeTab === 'applicants' ? (
          <>
            <article className="panel panel-span-2">
              <form className="job-board-toolbar" method="get">
                <input name="tab" type="hidden" value="applicants" />
                <input
                  className="input"
                  defaultValue={resolvedSearchParams.q || ''}
                  name="q"
                  placeholder="Search candidate, recruiter, company"
                  type="search"
                />
                <select className="input" defaultValue={stageFilter} name="stage">
                  <option value="">All stages</option>
                  {STAGE_FILTER_OPTIONS.map((stage) => (
                    <option key={`board-stage-${stage.value}`} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
                <button className="button button-secondary" type="submit">
                  Filter
                </button>
                <Link className="button button-secondary" href={`${APP_ROUTES.internal.jobs.detailBase}/${job.id}?tab=applicants`}>
                  Reset
                </Link>
                <div className="job-board-view-toggle">
                  <span className="job-board-view-toggle-item job-board-view-toggle-item-active" />
                  <span className="job-board-view-toggle-item" />
                  <span className="job-board-view-toggle-item" />
                </div>
              </form>
            </article>

            <article className="panel panel-span-2">
              <div className="job-stage-summary">
                {STAGE_FILTER_OPTIONS.map((stage) => (
                  <div className="job-stage-summary-item" key={stage.value}>
                    <p className="job-stage-summary-label">{stage.label}</p>
                    <p className="job-stage-summary-value">{stageCountMap.get(stage.value) || 0}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel panel-span-2">
              <JobApplicantsBoard boardRole={boardRole} cards={boardCards} jobId={job.id} />
            </article>
          </>
        ) : null}

        {activeTab === 'about' ? (
          <article className="panel panel-span-2">
            <h2>About Job</h2>
            <div className="about-job-grid">
              <p>
                <strong>Client:</strong> {readLabel(job.client)}
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
                <strong>Priority:</strong> {job.priority}
              </p>
            </div>
            <p className="panel-subtitle">
              <strong>Description:</strong> {job.description || 'Not provided'}
            </p>
            {job.requiredSkills?.length ? (
              <div className="skill-tags">
                {job.requiredSkills.map((item, index) => (
                  <span className="skill-tag" key={`job-skill-${index + 1}`}>
                    {item.skill}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ) : null}

        {activeTab === 'discussion' ? (
          <article className="panel panel-span-2">
            <h2>Discussion</h2>
            {discussionItems.length === 0 ? (
              <p className="board-empty">No discussion notes yet for this job.</p>
            ) : (
              <div className="discussion-list">
                {discussionItems.map((application) => (
                  <article className="discussion-item" key={`discussion-${application.id}`}>
                    <p className="discussion-title">{readLabel(application.candidate)}</p>
                    <p className="discussion-meta">
                      {readLabel(application.recruiter)} |{' '}
                      {APPLICATION_STAGE_LABELS[application.stage as ApplicationStage]}
                    </p>
                    <p className="discussion-text">{application.latestComment}</p>
                    <div className="public-actions">
                      <Link
                        className="button button-secondary"
                        href={`${APP_ROUTES.internal.applications.detailBase}/${application.id}`}
                      >
                        Open Application
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        ) : null}

        {activeTab === 'schedule' ? (
          <article className="panel panel-span-2">
            <div className="recruiter-card-header">
              <h2>Schedule</h2>
              <Link className="admin-link" href={APP_ROUTES.internal.schedule}>
                Open Full Calendar
              </Link>
            </div>
            {scheduleItems.length === 0 ? (
              <p className="board-empty">No upcoming schedule items for this job.</p>
            ) : (
              <div className="schedule-list">
                {scheduleItems.map((application) => (
                  <article className="schedule-item" key={`job-schedule-${application.id}`}>
                    <p className="schedule-title">{readLabel(application.candidate)}</p>
                    <p className="schedule-meta">
                      {APPLICATION_STAGE_LABELS[application.stage as ApplicationStage]} |{' '}
                      {readLabel(application.recruiter)}
                    </p>
                    <p className="schedule-time">{new Date(application.updatedAt).toLocaleString('en-IN')}</p>
                  </article>
                ))}
              </div>
            )}
          </article>
        ) : null}
      </section>
    )
  } catch {
    notFound()
  }
}
