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

  const topJobs = jobs.docs.slice(0, 8)

  return (
    <section className="dashboard-grid candidate-create-page">
      <article className="panel panel-span-2 candidate-create-hero">
        <div>
          <p className="eyebrow">Candidates</p>
          <h1>Add New Candidate</h1>
          <p className="panel-intro">
            Create one candidate master profile. Application stage movement will happen only in the application workflow.
          </p>
        </div>
        <div className="public-actions">
          <Link className="button button-secondary" href={APP_ROUTES.internal.jobs.assigned}>
            Jobs
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.internal.candidates.list}>
            Candidate Bank
          </Link>
        </div>
      </article>

      {resolvedSearchParams.error ? (
        <article className="panel panel-span-2">
          <p className="error-text">{resolvedSearchParams.error}</p>
        </article>
      ) : null}

      <article className="panel panel-span-2">
        {jobs.docs.length === 0 ? (
          <p className="board-empty">No eligible jobs found for candidate sourcing.</p>
        ) : (
          <form
            action={APP_ROUTES.internal.candidates.create}
            className="candidate-create-form"
            encType="multipart/form-data"
            method="post"
          >
            <div className="candidate-create-layout">
              <div className="candidate-create-main">
                <section className="candidate-section">
                  <div className="candidate-section-header">
                    <h3>1. Job and Source</h3>
                    <p className="muted small">Select job and source details before profile entry.</p>
                  </div>
                  <div className="candidate-grid-2">
                    <div>
                      <label className="form-field" htmlFor="sourceJob">
                        Source Job *
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
                        Candidate Source *
                      </label>
                      <select className="input" defaultValue="linkedin" id="source" name="source" required>
                        {CANDIDATE_SOURCE_OPTIONS.map((option) => (
                          <option key={`candidate-source-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="candidate-grid-span-2">
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
                    </div>
                  </div>
                </section>

                <section className="candidate-section">
                  <div className="candidate-section-header">
                    <h3>2. Contact Details</h3>
                    <p className="muted small">Provide at least one contact method (email or phone).</p>
                  </div>
                  <div className="candidate-grid-2">
                    <div>
                      <label className="form-field" htmlFor="fullName">
                        Full Name *
                      </label>
                      <input className="input" id="fullName" name="fullName" required type="text" />
                    </div>
                    <div>
                      <label className="form-field" htmlFor="email">
                        Email
                      </label>
                      <input className="input" id="email" name="email" type="email" />
                    </div>
                    <div>
                      <label className="form-field" htmlFor="phone">
                        Phone
                      </label>
                      <input className="input" id="phone" name="phone" type="tel" />
                    </div>
                    <div>
                      <label className="form-field" htmlFor="alternatePhone">
                        Alternate Phone
                      </label>
                      <input className="input" id="alternatePhone" name="alternatePhone" type="tel" />
                    </div>
                    <div className="candidate-grid-span-2">
                      <label className="form-field" htmlFor="currentLocation">
                        Current Location
                      </label>
                      <input className="input" id="currentLocation" name="currentLocation" type="text" />
                    </div>
                  </div>
                </section>

                <section className="candidate-section">
                  <div className="candidate-section-header">
                    <h3>3. Professional Details</h3>
                    <p className="muted small">Role and experience details improve shortlisting quality.</p>
                  </div>
                  <div className="candidate-grid-2">
                    <div>
                      <label className="form-field" htmlFor="currentCompany">
                        Current Company
                      </label>
                      <input className="input" id="currentCompany" name="currentCompany" type="text" />
                    </div>
                    <div>
                      <label className="form-field" htmlFor="currentRole">
                        Current Role
                      </label>
                      <input className="input" id="currentRole" name="currentRole" type="text" />
                    </div>
                    <div>
                      <label className="form-field" htmlFor="totalExperienceYears">
                        Total Experience (Years)
                      </label>
                      <input className="input" id="totalExperienceYears" min={0} name="totalExperienceYears" type="number" />
                    </div>
                  </div>
                </section>

                <section className="candidate-section">
                  <div className="candidate-section-header">
                    <h3>4. Compensation and Resume</h3>
                    <p className="muted small">Resume accepts PDF, DOC, or DOCX.</p>
                  </div>
                  <div className="candidate-grid-2">
                    <div>
                      <label className="form-field" htmlFor="expectedSalary">
                        Expected Salary
                      </label>
                      <input className="input" id="expectedSalary" min={0} name="expectedSalary" type="number" />
                    </div>
                    <div>
                      <label className="form-field" htmlFor="noticePeriodDays">
                        Notice Period (Days)
                      </label>
                      <input className="input" id="noticePeriodDays" min={0} name="noticePeriodDays" type="number" />
                    </div>
                    <div className="candidate-grid-span-2">
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
                </section>

                <section className="candidate-section">
                  <div className="candidate-section-header">
                    <h3>5. Notes</h3>
                  </div>
                  <label className="form-field" htmlFor="notes">
                    Notes
                  </label>
                  <textarea className="input" id="notes" name="notes" rows={4} />
                </section>
              </div>

              <aside className="candidate-create-side">
                <article className="candidate-side-card">
                  <p className="candidate-side-title">Checklist</p>
                  <p className="candidate-side-item">1. Source Job selected</p>
                  <p className="candidate-side-item">2. Full name entered</p>
                  <p className="candidate-side-item">3. Email or phone provided</p>
                  <p className="candidate-side-item">4. Resume uploaded (optional)</p>
                </article>

                <article className="candidate-side-card">
                  <p className="candidate-side-title">Visible Jobs</p>
                  <div className="candidate-job-list">
                    {topJobs.length === 0 ? (
                      <p className="board-empty">No visible jobs.</p>
                    ) : (
                      topJobs.map((job) => (
                        <div className="candidate-job-item" key={`candidate-job-preview-${job.id}`}>
                          <p className="candidate-job-title">{job.title}</p>
                          <p className="candidate-job-meta">
                            {readLabel(job.client)} | {job.priority}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              </aside>
            </div>

            <div className="candidate-create-footer">
              <Link className="button button-secondary" href={APP_ROUTES.internal.candidates.list}>
                Cancel
              </Link>
              <button className="button" data-pending-label="Saving..." type="submit">
                Save Candidate
              </button>
            </div>
          </form>
        )}
      </article>
    </section>
  )
}
