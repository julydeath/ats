import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { MAX_RESUME_IMPORT_FILES } from '@/lib/candidates/resume-imports'

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as {
      clientCode?: string
      name?: string
      title?: string
    }

    return typed.title || typed.name || typed.clientCode || fallback
  }

  return fallback
}

type CandidateImportNewPageProps = {
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function CandidateImportNewPage({ searchParams }: CandidateImportNewPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}

  const jobsResult = await payload.find({
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
    where: {
      status: {
        in: ['active', 'onHold'],
      },
    },
  })

  const jobs = jobsResult.docs.map((job) => ({
    clientLabel: readLabel(job.client),
    id: job.id,
    jobCode: job.jobCode || '',
    priority: readLabel(job.priority, 'normal'),
    title: job.title,
  }))

  return (
    <section className="candidate-import-page">
      <header className="candidate-import-header">
        <div>
          <p className="candidate-import-kicker">Candidates</p>
          <h1>Bulk Resume Upload</h1>
          <p>
            Upload up to {MAX_RESUME_IMPORT_FILES} resumes and let parsing continue in the background while you keep
            working.
          </p>
        </div>

        <div className="candidate-import-header-actions">
          <Link className="candidate-intake-head-btn" href={APP_ROUTES.internal.candidates.list}>
            Candidate Bank
          </Link>
          <Link className="candidate-intake-head-btn" href={APP_ROUTES.internal.candidates.new}>
            Single Candidate
          </Link>
        </div>
      </header>

      {resolvedSearchParams.error ? (
        <p className="candidate-intake-message candidate-intake-message-error">
          {String(resolvedSearchParams.error)}
        </p>
      ) : null}

      <form
        action={APP_ROUTES.internal.candidates.importsCreate}
        className="candidate-import-form"
        encType="multipart/form-data"
        method="post"
      >
        <section className="candidate-import-card">
          <h2>Upload Bundle</h2>
          <div className="candidate-import-fields">
            <label>
              <span>Source Job</span>
              <select name="sourceJob">
                <option value="">No job selected</option>
                {jobs.map((job) => (
                  <option key={`import-job-${job.id}`} value={String(job.id)}>
                    {(job.jobCode || `JOB-${job.id}`)} | {job.title} | {job.clientLabel}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Resumes</span>
              <input
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                name="resumes"
                required
                type="file"
              />
            </label>
          </div>

          <div className="candidate-import-note-grid">
            <div>
              <strong>Limit</strong>
              <span>{MAX_RESUME_IMPORT_FILES} files per bundle</span>
            </div>
            <div>
              <strong>Formats</strong>
              <span>PDF, DOCX, or DOC</span>
            </div>
            <div>
              <strong>Review</strong>
              <span>Create candidates after parser review</span>
            </div>
          </div>
        </section>

        <footer className="candidate-intake-footer">
          <Link className="candidate-intake-cancel" href={APP_ROUTES.internal.candidates.list}>
            Cancel
          </Link>
          <button className="candidate-intake-submit" data-pending-label="Uploading..." type="submit">
            Start Import
          </button>
        </footer>
      </form>
    </section>
  )
}
