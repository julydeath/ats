import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireCandidateUser } from '@/lib/auth/candidate-auth'
import { APPLICATION_STAGE_LABELS, type ApplicationStage } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

const readStageLabel = (stage: unknown): string => {
  if (!stage || typeof stage !== 'string') {
    return 'Unknown'
  }

  return APPLICATION_STAGE_LABELS[stage as ApplicationStage] || stage
}

export default async function CandidateDashboardPage() {
  const user = await requireCandidateUser()
  const payload = await getPayload({ config: configPromise })

  const [candidateProfile, applications] = await Promise.all([
    payload.findByID({
      collection: 'candidates',
      depth: 0,
      id: user.candidateProfileID,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'applications',
      depth: 1,
      limit: 50,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
    }),
  ])

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Candidate Dashboard</h1>
        <p className="muted">Track your application progress and review updates from recruitment teams.</p>
        <div className="public-actions">
          <Link className="button" href={APP_ROUTES.candidate.applications}>
            View Application Status
          </Link>
        </div>
      </article>

      <article className="panel">
        <h2>Your Profile</h2>
        <p className="kanban-meta">Name: {candidateProfile.fullName}</p>
        <p className="kanban-meta">Email: {candidateProfile.email || 'Not provided'}</p>
        <p className="kanban-meta">Phone: {candidateProfile.phone || 'Not provided'}</p>
        <p className="kanban-meta">Location: {candidateProfile.currentLocation || 'Not provided'}</p>
      </article>

      <article className="panel panel-span-2">
        <h2>Recent Application Updates</h2>
        {applications.docs.length === 0 ? (
          <p className="board-empty">No application records are visible yet.</p>
        ) : (
          <div className="kanban-cards">
            {applications.docs.slice(0, 6).map((application) => (
              <article className="kanban-card" key={`candidate-dashboard-app-${application.id}`}>
                <p className="kanban-title">{readStageLabel(application.stage)}</p>
                <p className="kanban-meta">Job: {String((application.job as { title?: string })?.title || application.job)}</p>
                <p className="kanban-meta">
                  Last Updated: {new Date(application.updatedAt).toLocaleString()}
                </p>
                <p className="kanban-meta">Comment: {application.latestComment || 'No comments yet.'}</p>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
