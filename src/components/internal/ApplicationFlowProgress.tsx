import Link from 'next/link'

import { APPLICATION_STAGES, APPLICATION_STAGE_LABELS, type ApplicationStage } from '@/lib/constants/recruitment'
import { INTERNAL_ROLE_LABELS, type InternalRole } from '@/lib/constants/roles'

type FlowEntry = {
  actor?: unknown
  changedAt?: Date | string | null
  toStage?: unknown
}

type ApplicationFlowProgressProps = {
  applicationCode: string
  currentStage: ApplicationStage
  detailHref?: string
  entries: FlowEntry[]
  fallbackOwnerName?: string
  fallbackOwnerRole?: InternalRole
  fallbackTimestamp?: Date | string | null
  subtitle?: string
  title?: string
}

type FlowEvent = {
  actor?: unknown
  changedAt?: Date | string | null
}

const formatDateTime = (value: Date | string | null | undefined): string => {
  if (!value) {
    return 'Pending'
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return 'Pending'
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const readActorName = (value: unknown): string => {
  if (!value) {
    return 'Not assigned'
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return `User ${String(value)}`
  }

  if (typeof value === 'object') {
    const typed = value as { email?: string; fullName?: string; name?: string }
    return typed.fullName || typed.name || typed.email || 'Not assigned'
  }

  return 'Not assigned'
}

const readActorRole = (value: unknown): string => {
  if (!value || typeof value !== 'object') {
    return ''
  }

  const typed = value as { role?: unknown }
  if (typed.role === 'admin' || typed.role === 'leadRecruiter' || typed.role === 'recruiter') {
    return INTERNAL_ROLE_LABELS[typed.role]
  }

  return ''
}

const stageToneClass = ({
  currentStage,
  stage,
  stageEvent,
}: {
  currentStage: ApplicationStage
  stage: ApplicationStage
  stageEvent?: FlowEvent
}): string => {
  if (stage === currentStage) {
    return 'flow-progress-step-current'
  }

  if (stageEvent) {
    return 'flow-progress-step-done'
  }

  return 'flow-progress-step-pending'
}

export const ApplicationFlowProgress = ({
  applicationCode,
  currentStage,
  detailHref,
  entries,
  fallbackOwnerName,
  fallbackOwnerRole,
  fallbackTimestamp,
  subtitle,
  title = 'Flow Progress',
}: ApplicationFlowProgressProps) => {
  const latestByStage = new Map<ApplicationStage, FlowEvent>()

  entries.forEach((entry) => {
    if (!entry.toStage || typeof entry.toStage !== 'string') {
      return
    }

    if (!APPLICATION_STAGES.includes(entry.toStage as ApplicationStage)) {
      return
    }

    const stage = entry.toStage as ApplicationStage
    const previous = latestByStage.get(stage)
    const currentTime = entry.changedAt ? new Date(entry.changedAt).getTime() : 0
    const previousTime = previous?.changedAt ? new Date(previous.changedAt).getTime() : -1

    if (!previous || currentTime >= previousTime) {
      latestByStage.set(stage, {
        actor: entry.actor,
        changedAt: entry.changedAt,
      })
    }
  })

  if (!latestByStage.has(currentStage)) {
    latestByStage.set(currentStage, {
      actor: fallbackOwnerName
        ? {
            fullName: fallbackOwnerName,
            role: fallbackOwnerRole,
          }
        : undefined,
      changedAt: fallbackTimestamp,
    })
  }

  return (
    <article className="flow-progress-card">
      <header className="flow-progress-head">
        <div>
          <p className="flow-progress-kicker">Application Pipeline</p>
          <h3>{title}</h3>
          {subtitle ? <p className="flow-progress-subtitle">{subtitle}</p> : null}
        </div>
        <div className="flow-progress-head-meta">
          <span>{applicationCode}</span>
          {detailHref ? <Link href={detailHref}>Open Application</Link> : null}
        </div>
      </header>

      <div className="flow-progress-steps">
        {APPLICATION_STAGES.map((stage) => {
          const stageEvent = latestByStage.get(stage)
          const actorName = stageEvent ? readActorName(stageEvent.actor) : 'Pending'
          const actorRole = stageEvent ? readActorRole(stageEvent.actor) : ''
          const roleText = actorRole ? ` · ${actorRole}` : ''

          return (
            <article className={`flow-progress-step ${stageToneClass({ currentStage, stage, stageEvent })}`} key={`flow-stage-${stage}`}>
              <div className="flow-progress-step-top">
                <p>{APPLICATION_STAGE_LABELS[stage]}</p>
                {stage === currentStage ? <span>Current</span> : null}
              </div>
              <p className="flow-progress-step-time">{formatDateTime(stageEvent?.changedAt)}</p>
              <p className="flow-progress-step-owner">
                {actorName}
                {roleText}
              </p>
            </article>
          )
        })}
      </div>
    </article>
  )
}
