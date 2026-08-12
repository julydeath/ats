import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import {
  CANDIDATE_RESUME_IMPORT_BATCH_STATUS_LABELS,
  type CandidateResumeImportBatchStatus,
} from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

const toLabel = (value: unknown, fallback = 'Not provided'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  const typed = value as {
    batchCode?: string | null
    email?: string | null
    fullName?: string | null
    jobCode?: string | null
    name?: string | null
    title?: string | null
  }

  return typed.title || typed.name || typed.fullName || typed.email || typed.jobCode || typed.batchCode || fallback
}

const getStatusLabel = (value: unknown): string => {
  if (typeof value !== 'string') {
    return 'Unknown'
  }

  return CANDIDATE_RESUME_IMPORT_BATCH_STATUS_LABELS[value as CandidateResumeImportBatchStatus] || value
}

const formatDate = (value: string): string => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default async function CandidateImportsPage() {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })

  const batchesResult = await payload.find({
    collection: 'candidate-resume-import-batches',
    depth: 1,
    limit: 50,
    overrideAccess: false,
    pagination: false,
    sort: '-createdAt',
    user,
  })

  return (
    <section className="candidate-import-page">
      <header className="candidate-import-header">
        <div>
          <p className="candidate-import-kicker">Candidates</p>
          <h1>Resume Imports</h1>
          <p>Track bulk resume parsing batches and continue candidate review from one place.</p>
        </div>

        <div className="candidate-import-header-actions">
          <Link className="candidate-intake-head-btn" href={APP_ROUTES.internal.candidates.list}>
            Candidate Bank
          </Link>
          <Link className="candidate-intake-submit" href={APP_ROUTES.internal.candidates.importsNew}>
            New Import
          </Link>
        </div>
      </header>

      <section className="candidate-import-list-card">
        <header className="candidate-import-section-head">
          <h2>Recent Batches</h2>
          <p>{batchesResult.docs.length} import batches found.</p>
        </header>

        <div className="candidate-import-batch-list">
          {batchesResult.docs.length === 0 ? (
            <p className="candidate-import-empty">No import batches yet.</p>
          ) : (
            batchesResult.docs.map((batch) => {
              const totalCount = typeof batch.totalCount === 'number' ? batch.totalCount : 0
              const createdCount = typeof batch.createdCount === 'number' ? batch.createdCount : 0
              const reviewCount = typeof batch.parsedCount === 'number' ? batch.parsedCount : 0
              const failedCount = typeof batch.failedCount === 'number' ? batch.failedCount : 0
              const status = String(batch.status || 'queued')

              return (
                <Link
                  className="candidate-import-batch-row"
                  href={`${APP_ROUTES.internal.candidates.imports}/${batch.id}`}
                  key={`resume-import-batch-${batch.id}`}
                >
                  <div>
                    <span className={`candidate-import-status candidate-import-status-${status}`}>
                      {getStatusLabel(status)}
                    </span>
                    <h3>{batch.batchCode || `Batch ${batch.id}`}</h3>
                    <p>{toLabel(batch.sourceJob)} · {formatDate(batch.createdAt)}</p>
                  </div>
                  <div className="candidate-import-batch-metrics">
                    <span>{totalCount} total</span>
                    <span>{reviewCount} review</span>
                    <span>{createdCount} created</span>
                    <span>{failedCount} failed</span>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </section>
    </section>
  )
}
