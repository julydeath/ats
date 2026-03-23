import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { requireCandidateUser } from '@/lib/auth/candidate-auth'
import { APPLICATION_STAGE_LABELS, type ApplicationStage } from '@/lib/constants/recruitment'

const readStageLabel = (stage: unknown): string => {
  if (!stage || typeof stage !== 'string') {
    return 'Unknown'
  }

  return APPLICATION_STAGE_LABELS[stage as ApplicationStage] || stage
}

const readJobLabel = (value: unknown): string => {
  if (!value) {
    return 'Unknown Job'
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as {
      title?: string
    }

    return typed.title || 'Unknown Job'
  }

  return 'Unknown Job'
}

export default async function CandidateApplicationsPage() {
  const user = await requireCandidateUser()
  const payload = await getPayload({ config: configPromise })

  const [applications, stageHistory] = await Promise.all([
    payload.find({
      collection: 'applications',
      depth: 1,
      limit: 100,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'application-stage-history',
      depth: 0,
      limit: 300,
      overrideAccess: false,
      sort: '-changedAt',
      user,
    }),
  ])

  const historyByApplication = new Map<string, Array<{ changedAt: string; toStage: string }>>()

  for (const entry of stageHistory.docs) {
    const applicationID = String(
      typeof entry.application === 'number' || typeof entry.application === 'string'
        ? entry.application
        : (entry.application as { id?: number | string })?.id || '',
    )

    if (!applicationID) {
      continue
    }

    const current = historyByApplication.get(applicationID) || []
    current.push({
      changedAt: entry.changedAt,
      toStage: entry.toStage,
    })
    historyByApplication.set(applicationID, current)
  }

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Application Status</h1>
        <p className="muted">
          This page only shows applications mapped to your candidate account.
        </p>
      </article>

      <article className="panel panel-span-2">
        <h2>My Applications</h2>
        {applications.docs.length === 0 ? (
          <p className="board-empty">No applications found for your account.</p>
        ) : (
          <div className="kanban-cards">
            {applications.docs.map((application) => (
              <article className="kanban-card" key={`candidate-status-${application.id}`}>
                <p className="kanban-title">{readJobLabel(application.job)}</p>
                <p className="kanban-meta">Current Stage: {readStageLabel(application.stage)}</p>
                <p className="kanban-meta">Last Comment: {application.latestComment || 'No comment available'}</p>
                <p className="kanban-meta">
                  Last Updated: {new Date(application.updatedAt).toLocaleString()}
                </p>
                <p className="kanban-meta">
                  Recent Stage Updates:{' '}
                  {(historyByApplication.get(String(application.id)) || [])
                    .slice(0, 3)
                    .map((entry) => `${readStageLabel(entry.toStage)} (${new Date(entry.changedAt).toLocaleDateString()})`)
                    .join(' | ') || 'No stage history yet'}
                </p>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
