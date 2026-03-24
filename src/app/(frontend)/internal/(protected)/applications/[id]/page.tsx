import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APPLICATION_STAGE_LABELS } from '@/lib/constants/recruitment'
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
      email?: string
      fullName?: string
      name?: string
      title?: string
    }

    return typed.fullName || typed.title || typed.name || typed.email || fallback
  }

  return fallback
}

type ApplicationDetailPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    success?: string
  }>
}

export default async function ApplicationDetailPage({ params, searchParams }: ApplicationDetailPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const { id } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const applicationID = /^\d+$/.test(id) ? Number(id) : null

  if (!applicationID) {
    notFound()
  }

  try {
    const [application, stageHistory] = await Promise.all([
      payload.findByID({
        collection: 'applications',
        depth: 1,
        id: applicationID,
        overrideAccess: false,
        select: {
          candidate: true,
          candidateAppliedAt: true,
          candidateInvitedAt: true,
          id: true,
          job: true,
          latestComment: true,
          notes: true,
          recruiter: true,
          reviewedAt: true,
          reviewedBy: true,
          stage: true,
          submittedAt: true,
        },
        user,
      }),
      payload.find({
        collection: 'application-stage-history',
        depth: 1,
        limit: 100,
        pagination: false,
        overrideAccess: false,
        select: {
          actor: true,
          changedAt: true,
          comment: true,
          fromStage: true,
          id: true,
          toStage: true,
        },
        sort: '-changedAt',
        user,
        where: {
          application: {
            equals: applicationID,
          },
        },
      }),
    ])

    return (
      <section className="dashboard-grid">
        <article className="panel panel-span-2">
          <p className="eyebrow">Application Detail</p>
          <h1>{readLabel(application.candidate)}</h1>
          <p className="panel-intro">
            Current stage: <strong>{APPLICATION_STAGE_LABELS[application.stage] || application.stage}</strong>
          </p>
          {resolvedSearchParams.success ? <p className="muted small">Application action completed.</p> : null}
          <div className="public-actions">
            <Link className="button button-secondary" href={APP_ROUTES.internal.applications.list}>
              Back to Applications
            </Link>
            <Link className="button button-secondary" href={APP_ROUTES.internal.applications.reviewQueue}>
              Open Review Queue
            </Link>
          </div>
        </article>

        <article className="panel">
          <h2>Mapping</h2>
          <p className="kanban-meta">Candidate: {readLabel(application.candidate)}</p>
          <p className="kanban-meta">Job: {readLabel(application.job)}</p>
          <p className="kanban-meta">Recruiter: {readLabel(application.recruiter)}</p>
          <p className="kanban-meta">
            Stage: {APPLICATION_STAGE_LABELS[application.stage] || application.stage}
          </p>
        </article>

        <article className="panel">
          <h2>Timeline Snapshot</h2>
          <p className="kanban-meta">Submitted At: {application.submittedAt || 'Not submitted yet'}</p>
          <p className="kanban-meta">Reviewed At: {application.reviewedAt || 'Not reviewed yet'}</p>
          <p className="kanban-meta">Reviewed By: {readLabel(application.reviewedBy, 'Not reviewed yet')}</p>
          <p className="kanban-meta">Candidate Invited At: {application.candidateInvitedAt || 'Not invited yet'}</p>
          <p className="kanban-meta">Candidate Applied At: {application.candidateAppliedAt || 'Not applied yet'}</p>
        </article>

        <article className="panel">
          <h2>Current Notes</h2>
          <p className="kanban-meta">Latest Comment: {application.latestComment || 'No comment'}</p>
          <p className="kanban-meta">Notes: {application.notes || 'No notes added'}</p>
        </article>

        <article className="panel panel-span-2">
          <h2>Stage Activity</h2>
          {stageHistory.docs.length === 0 ? (
            <p className="board-empty">No stage transitions recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transition</th>
                    <th>Actor</th>
                    <th>Comment</th>
                    <th>Changed At</th>
                  </tr>
                </thead>
                <tbody>
                  {stageHistory.docs.map((entry) => (
                    <tr key={`stage-entry-${entry.id}`}>
                      <td>
                        {entry.fromStage
                          ? `${APPLICATION_STAGE_LABELS[entry.fromStage] || entry.fromStage} -> ${
                              APPLICATION_STAGE_LABELS[entry.toStage] || entry.toStage
                            }`
                          : APPLICATION_STAGE_LABELS[entry.toStage] || entry.toStage}
                      </td>
                      <td>{readLabel(entry.actor, 'System')}</td>
                      <td>{entry.comment || 'No comment'}</td>
                      <td>{new Date(entry.changedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    )
  } catch {
    notFound()
  }
}
