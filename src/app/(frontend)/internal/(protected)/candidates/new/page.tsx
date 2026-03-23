import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { CANDIDATE_SOURCE_OPTIONS } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

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
  const selectedJobID = resolvedSearchParams.jobId || ''

  const jobs = await payload.find({
    collection: 'jobs',
    depth: 1,
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

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">Step 2: Add Candidate</p>
        <h1>Create Candidate Master Record</h1>
        <p className="panel-intro">
          Add one external candidate profile. Job-specific stage movement happens later in the application
          workflow.
        </p>
        {resolvedSearchParams.error ? <p className="error-text">{resolvedSearchParams.error}</p> : null}
        <div className="public-actions">
          <Link className="button button-secondary" href={APP_ROUTES.internal.jobs.assigned}>
            Back to Job Workspace
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.internal.candidates.list}>
            Candidate Bank
          </Link>
        </div>
      </article>

      <article className="panel">
        <h2>Before You Save</h2>
        <div className="workflow-steps">
          <div className="workflow-step">
            <span className="workflow-step-number">1</span>
            <div>
              <p className="workflow-step-title">Pick the source job</p>
              <p className="workflow-step-desc">Candidate can be added only against visible assigned jobs.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">2</span>
            <div>
              <p className="workflow-step-title">Capture at least one contact point</p>
              <p className="workflow-step-desc">Email or phone should be provided to avoid follow-up delays.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">3</span>
            <div>
              <p className="workflow-step-title">Upload resume if available</p>
              <p className="workflow-step-desc">PDF, DOC, or DOCX accepted.</p>
            </div>
          </div>
        </div>
      </article>

      <article className="panel">
        <h2>Visible Jobs</h2>
        <p className="panel-subtitle">Only jobs you are allowed to source for are shown here.</p>
        <div className="kanban-cards">
          {jobs.docs.length === 0 ? (
            <p className="board-empty">No eligible jobs available in your current scope.</p>
          ) : (
            jobs.docs.slice(0, 8).map((job) => (
              <article className="kanban-card" key={`candidate-job-preview-${job.id}`}>
                <p className="kanban-title">{job.title}</p>
                <p className="kanban-meta">Client: {readLabel(job.client)}</p>
                <p className="kanban-meta">Priority: {job.priority}</p>
              </article>
            ))
          )}
        </div>
      </article>

      <article className="panel panel-span-2">
        {jobs.docs.length === 0 ? (
          <p className="board-empty">No eligible jobs found for candidate sourcing.</p>
        ) : (
          <form
            action={APP_ROUTES.internal.candidates.create}
            className="auth-form"
            encType="multipart/form-data"
            method="post"
          >
            <h3>Job and Source</h3>
            <div className="split-grid">
              <div>
                <label className="form-field" htmlFor="sourceJob">
                  Source Job
                </label>
                <select className="input" defaultValue={selectedJobID} id="sourceJob" name="sourceJob" required>
                  <option value="">Select a job</option>
                  {jobs.docs.map((job) => (
                    <option key={`candidate-job-${job.id}`} value={job.id}>
                      {job.title} | {readLabel(job.client)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-field" htmlFor="source">
                  Candidate Source
                </label>
                <select className="input" defaultValue="linkedin" id="source" name="source" required>
                  {CANDIDATE_SOURCE_OPTIONS.map((option) => (
                    <option key={`candidate-source-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="form-field" htmlFor="sourceDetails">
              Source Details
            </label>
            <input
              className="input"
              id="sourceDetails"
              name="sourceDetails"
              placeholder="Example: Employee referral by Rahul"
              type="text"
            />

            <h3>Basic Candidate Profile</h3>
            <div className="split-grid">
              <div>
                <label className="form-field" htmlFor="fullName">
                  Full Name
                </label>
                <input className="input" id="fullName" name="fullName" required type="text" />

                <label className="form-field" htmlFor="email">
                  Email
                </label>
                <input className="input" id="email" name="email" type="email" />

                <label className="form-field" htmlFor="phone">
                  Phone
                </label>
                <input className="input" id="phone" name="phone" type="tel" />

                <label className="form-field" htmlFor="alternatePhone">
                  Alternate Phone
                </label>
                <input className="input" id="alternatePhone" name="alternatePhone" type="tel" />
              </div>

              <div>
                <label className="form-field" htmlFor="currentLocation">
                  Current Location
                </label>
                <input className="input" id="currentLocation" name="currentLocation" type="text" />

                <label className="form-field" htmlFor="currentCompany">
                  Current Company
                </label>
                <input className="input" id="currentCompany" name="currentCompany" type="text" />

                <label className="form-field" htmlFor="currentRole">
                  Current Role
                </label>
                <input className="input" id="currentRole" name="currentRole" type="text" />

                <label className="form-field" htmlFor="totalExperienceYears">
                  Total Experience (Years)
                </label>
                <input
                  className="input"
                  id="totalExperienceYears"
                  min={0}
                  name="totalExperienceYears"
                  type="number"
                />
              </div>
            </div>

            <h3>Compensation and Documents</h3>
            <div className="split-grid">
              <div>
                <label className="form-field" htmlFor="expectedSalary">
                  Expected Salary
                </label>
                <input className="input" id="expectedSalary" min={0} name="expectedSalary" type="number" />

                <label className="form-field" htmlFor="noticePeriodDays">
                  Notice Period (Days)
                </label>
                <input className="input" id="noticePeriodDays" min={0} name="noticePeriodDays" type="number" />
              </div>
              <div>
                <label className="form-field" htmlFor="resume">
                  Resume (PDF/DOC/DOCX)
                </label>
                <input
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="input"
                  id="resume"
                  name="resume"
                  type="file"
                />
              </div>
            </div>

            <label className="form-field" htmlFor="notes">
              Notes
            </label>
            <textarea className="input" id="notes" name="notes" rows={4} />

            <button className="button" data-pending-label="Saving..." type="submit">
              Save Candidate
            </button>
          </form>
        )}
      </article>
    </section>
  )
}
