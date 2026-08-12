import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import {
  CANDIDATE_RESUME_IMPORT_BATCH_STATUS_LABELS,
  CANDIDATE_RESUME_IMPORT_ITEM_STATUS_LABELS,
  type CandidateResumeImportBatchStatus,
  type CandidateResumeImportItemStatus,
} from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

type ResumeImportBatchPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    success?: string
  }>
}

const toLabel = (value: unknown, fallback = 'Not provided'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  const typed = value as {
    batchCode?: string | null
    candidateCode?: string | null
    clientCode?: string | null
    email?: string | null
    filename?: string | null
    fullName?: string | null
    jobCode?: string | null
    name?: string | null
    title?: string | null
  }

  return (
    typed.fullName ||
    typed.title ||
    typed.name ||
    typed.filename ||
    typed.email ||
    typed.jobCode ||
    typed.clientCode ||
    typed.candidateCode ||
    typed.batchCode ||
    fallback
  )
}

const getStatusLabel = (
  value: unknown,
  labels: Record<string, string>,
  fallback = 'Unknown',
): string => {
  if (typeof value !== 'string') {
    return fallback
  }

  return labels[value] || value
}

const getWarnings = (warnings: unknown): string[] => {
  if (!Array.isArray(warnings)) {
    return []
  }

  return warnings
    .map((warning) => {
      if (typeof warning === 'string') {
        return warning
      }

      if (warning && typeof warning === 'object' && 'message' in warning) {
        return String(warning.message || '')
      }

      return ''
    })
    .map((warning) => warning.trim())
    .filter(Boolean)
}

const getParsedSummary = (parsedData: unknown): string[] => {
  if (!parsedData || typeof parsedData !== 'object') {
    return []
  }

  const typed = parsedData as Record<string, unknown>
  const fields = [
    ['Name', typed.fullName || typed.name],
    ['Email', typed.email],
    ['Phone', typed.phone || typed.mobile || typed.phoneNumber],
    ['Role', typed.currentRole || typed.jobTitle],
    ['Skills', typed.primarySkills || typed.skills || typed.keySkills],
  ] as const

  return fields
    .map(([label, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0 ? `${label}: ${value.join(', ')}` : ''
      }

      return typeof value === 'string' && value.trim() ? `${label}: ${value.trim()}` : ''
    })
    .filter(Boolean)
}

export default async function ResumeImportBatchPage({ params, searchParams }: ResumeImportBatchPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const { id } = await params
  const resolvedSearchParams = (await searchParams) ?? {}

  if (!/^\d+$/.test(id)) {
    notFound()
  }

  const batchID = Number(id)

  try {
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
        limit: 80,
        overrideAccess: false,
        pagination: false,
        sort: 'createdAt',
        user,
        where: {
          batch: {
            equals: batchID,
          },
        },
      }),
    ])

    const totalCount = typeof batch.totalCount === 'number' ? batch.totalCount : itemsResult.docs.length
    const parsedCount = typeof batch.parsedCount === 'number' ? batch.parsedCount : 0
    const failedCount = typeof batch.failedCount === 'number' ? batch.failedCount : 0
    const createdCount = typeof batch.createdCount === 'number' ? batch.createdCount : 0
    const processingCount = typeof batch.processingCount === 'number' ? batch.processingCount : 0
    const queuedCount = typeof batch.queuedCount === 'number' ? batch.queuedCount : 0
    const completedUnits = parsedCount + failedCount + createdCount
    const progress = totalCount > 0 ? Math.round((completedUnits / totalCount) * 100) : 0
    const batchStatus = String(batch.status || 'queued') as CandidateResumeImportBatchStatus
    const canContinue = queuedCount > 0 || processingCount > 0 || failedCount > 0

    return (
      <section className="candidate-import-page">
        <header className="candidate-import-header">
          <div>
            <p className="candidate-import-kicker">Resume Import</p>
            <h1>{batch.batchCode || `Batch ${batch.id}`}</h1>
            <p>
              {getStatusLabel(batchStatus, CANDIDATE_RESUME_IMPORT_BATCH_STATUS_LABELS)} ·{' '}
              {toLabel(batch.sourceJob)}
            </p>
          </div>

          <div className="candidate-import-header-actions">
            <Link className="candidate-intake-head-btn" href={APP_ROUTES.internal.candidates.importsNew}>
              New Import
            </Link>
            <Link className="candidate-intake-head-btn" href={APP_ROUTES.internal.candidates.list}>
              Candidate Bank
            </Link>
          </div>
        </header>

        {resolvedSearchParams.success === 'batchCreated' ? (
          <p className="candidate-intake-message candidate-intake-message-success">
            Upload saved. Parsing is running in the background.
          </p>
        ) : null}

        <section className="candidate-import-progress-card">
          <div className="candidate-import-progress-top">
            <div>
              <span>Status</span>
              <strong>{getStatusLabel(batchStatus, CANDIDATE_RESUME_IMPORT_BATCH_STATUS_LABELS)}</strong>
            </div>
            <div>
              <span>Progress</span>
              <strong>{progress}%</strong>
            </div>
          </div>

          <div className="candidate-import-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="candidate-import-stat-grid">
            <div>
              <strong>{totalCount}</strong>
              <span>Total</span>
            </div>
            <div>
              <strong>{queuedCount + processingCount}</strong>
              <span>Pending</span>
            </div>
            <div>
              <strong>{parsedCount}</strong>
              <span>Review</span>
            </div>
            <div>
              <strong>{createdCount}</strong>
              <span>Created</span>
            </div>
            <div>
              <strong>{failedCount}</strong>
              <span>Failed</span>
            </div>
          </div>

          <div className="candidate-import-progress-actions">
            <Link className="candidate-intake-cancel" href={`${APP_ROUTES.internal.candidates.imports}/${batch.id}`}>
              Refresh
            </Link>
            {canContinue ? (
              <form action={`${APP_ROUTES.internal.candidates.imports}/${batch.id}/process`} method="post">
                <button className="candidate-intake-submit" data-pending-label="Processing..." type="submit">
                  Continue Processing
                </button>
              </form>
            ) : null}
          </div>
        </section>

        <section className="candidate-import-list-card">
          <header className="candidate-import-section-head">
            <h2>Imported Resumes</h2>
            <p>Open review for parsed resumes, then save as a candidate.</p>
          </header>

          <div className="candidate-import-item-list">
            {itemsResult.docs.length === 0 ? (
              <p className="candidate-import-empty">No resumes found in this import.</p>
            ) : (
              itemsResult.docs.map((item) => {
                const itemStatus = String(item.status || 'queued') as CandidateResumeImportItemStatus
                const resumeID = extractRelationshipID(item.resume)
                const candidateID = extractRelationshipID(item.candidate)
                const summary = getParsedSummary(item.parsedData)
                const warnings = getWarnings(item.warnings)

                return (
                  <article className="candidate-import-item" key={`resume-import-item-${item.id}`}>
                    <div className="candidate-import-item-main">
                      <span className={`candidate-import-status candidate-import-status-${itemStatus}`}>
                        {getStatusLabel(itemStatus, CANDIDATE_RESUME_IMPORT_ITEM_STATUS_LABELS)}
                      </span>
                      <h3>{toLabel(item.resume, `Resume ${resumeID || item.id}`)}</h3>
                      <p>{item.itemCode || `Item ${item.id}`}</p>

                      {summary.length > 0 ? (
                        <ul className="candidate-import-summary">
                          {summary.map((summaryLine) => (
                            <li key={`${item.id}-${summaryLine}`}>{summaryLine}</li>
                          ))}
                        </ul>
                      ) : null}

                      {item.error ? <p className="candidate-import-error">{item.error}</p> : null}
                      {warnings.length > 0 ? (
                        <p className="candidate-import-warning">{warnings.slice(0, 2).join(' ')}</p>
                      ) : null}
                    </div>

                    <div className="candidate-import-item-actions">
                      {itemStatus === 'needsReview' ? (
                        <Link
                          className="candidate-mgmt-action-link candidate-mgmt-action-link-secondary"
                          href={`${APP_ROUTES.internal.candidates.imports}/${batch.id}/items/${item.id}/review`}
                        >
                          Review
                        </Link>
                      ) : null}

                      {itemStatus === 'candidateCreated' && candidateID ? (
                        <Link
                          className="candidate-mgmt-action-link"
                          href={`${APP_ROUTES.internal.candidates.detailBase}/${candidateID}`}
                        >
                          Open Candidate
                        </Link>
                      ) : null}

                      {itemStatus === 'failed' ? (
                        <form action={`${APP_ROUTES.internal.candidates.imports}/${batch.id}/process`} method="post">
                          <input name="itemId" type="hidden" value={String(item.id)} />
                          <button className="candidate-mgmt-action-link" type="submit">
                            Retry
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>
      </section>
    )
  } catch {
    notFound()
  }
}
