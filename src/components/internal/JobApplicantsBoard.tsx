'use client'

import Link from 'next/link'
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { APPLICATION_STAGE_LABELS, type ApplicationStage } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

type BoardCard = {
  candidateCompany: string
  candidateExperience: string
  candidateName: string
  candidateRole: string
  id: number
  latestComment: string
  recruiterName: string
  stage: ApplicationStage
  updatedAt: string
}

type StageColumn = {
  key: ApplicationStage
  label: string
  tone: 'gray' | 'orange' | 'teal' | 'purple' | 'green' | 'red'
}

type JobApplicantsBoardProps = {
  boardRole: 'admin' | 'leadRecruiter' | 'recruiter'
  cards: BoardCard[]
  jobId: number
}

type MoveArgs = {
  applicationId: number
  fromStage: ApplicationStage
  latestComment?: string
  toStage: ApplicationStage
}

const STAGE_COLUMNS: readonly StageColumn[] = [
  { key: 'sourcedByRecruiter', label: 'Applied', tone: 'gray' },
  { key: 'internalReviewPending', label: 'Screening', tone: 'orange' },
  { key: 'internalReviewApproved', label: 'Skill Test', tone: 'teal' },
  { key: 'candidateInvited', label: 'Interview', tone: 'purple' },
  { key: 'candidateApplied', label: 'Hired', tone: 'green' },
  { key: 'sentBackForCorrection', label: 'Needs Fix', tone: 'purple' },
  { key: 'internalReviewRejected', label: 'Rejected', tone: 'red' },
]

const initializeBoard = (cards: BoardCard[]) =>
  STAGE_COLUMNS.reduce<Record<ApplicationStage, BoardCard[]>>((acc, column) => {
    acc[column.key] = cards.filter((card) => card.stage === column.key)
    return acc
  }, {} as Record<ApplicationStage, BoardCard[]>)

const parseStageFromDropID = (value: string | null): ApplicationStage | null => {
  if (!value || !value.startsWith('stage-')) {
    return null
  }

  const stage = value.replace('stage-', '')
  const matched = STAGE_COLUMNS.find((column) => column.key === stage)
  return matched ? matched.key : null
}

const getAllowedTransitionTargets = ({
  boardRole,
  fromStage,
}: {
  boardRole: JobApplicantsBoardProps['boardRole']
  fromStage: ApplicationStage
}): ApplicationStage[] => {
  if (boardRole === 'admin') {
    return STAGE_COLUMNS.map((column) => column.key)
  }

  if (boardRole === 'recruiter') {
    if (fromStage === 'sourcedByRecruiter' || fromStage === 'sentBackForCorrection') {
      return ['internalReviewPending']
    }

    if (['internalReviewApproved', 'candidateInvited', 'candidateApplied'].includes(fromStage)) {
      return ['internalReviewApproved', 'candidateInvited', 'candidateApplied']
    }

    return []
  }

  if (boardRole === 'leadRecruiter' && fromStage === 'internalReviewPending') {
    return ['internalReviewApproved', 'internalReviewRejected', 'sentBackForCorrection']
  }

  return []
}

const canTransition = ({
  boardRole,
  fromStage,
  toStage,
}: {
  boardRole: JobApplicantsBoardProps['boardRole']
  fromStage: ApplicationStage
  toStage: ApplicationStage
}): boolean => {
  if (fromStage === toStage) {
    return true
  }

  return getAllowedTransitionTargets({ boardRole, fromStage }).includes(toStage)
}

const getRoleDragHint = (role: JobApplicantsBoardProps['boardRole']) => {
  if (role === 'admin') {
    return 'Drag or manually update any card to any stage.'
  }

  if (role === 'recruiter') {
    return 'Move sourced/correction cards to screening, and manage post-approval pipeline stages.'
  }

  return 'Review screening cards to approve, reject, or send back for correction.'
}

const DroppableStage = ({
  children,
  id,
  isOverClassName,
}: {
  children: ReactNode
  id: string
  isOverClassName: string
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  })

  return (
    <div className={isOver ? isOverClassName : ''} ref={setNodeRef}>
      {children}
    </div>
  )
}

const BoardCardItem = ({
  canDrag,
  card,
  isSaving,
  onManualMove,
  transitionTargets,
}: {
  canDrag: boolean
  card: BoardCard
  isSaving: boolean
  onManualMove: (args: MoveArgs) => Promise<void>
  transitionTargets: ApplicationStage[]
}) => {
  const [manualStage, setManualStage] = useState<ApplicationStage>(card.stage)
  const [manualComment, setManualComment] = useState('')

  useEffect(() => {
    setManualStage(card.stage)
  }, [card.stage])

  const stopDragOnInput = (event: React.MouseEvent | React.PointerEvent) => {
    event.stopPropagation()
  }

  const handleManualSubmit = async () => {
    if (manualStage === card.stage || isSaving) {
      return
    }

    await onManualMove({
      applicationId: card.id,
      fromStage: card.stage,
      latestComment: manualComment.trim() || undefined,
      toStage: manualStage,
    })
    setManualComment('')
  }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `app-${card.id}`,
    data: {
      applicationId: card.id,
      fromStage: card.stage,
    },
    disabled: !canDrag || isSaving,
  })

  const initials = card.candidateName
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <article
      className={`applicant-card ${isDragging ? 'applicant-card-dragging' : ''} ${!canDrag ? 'applicant-card-static' : ''}`}
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      <div className="applicant-card-headline">
        <div className="applicant-card-avatar">{initials}</div>
        <div>
          <p className="applicant-card-name">{card.candidateName}</p>
          <p className="applicant-card-role">{card.candidateRole}</p>
        </div>
      </div>

      <div className="applicant-card-details">
        <p className="applicant-card-meta">{card.candidateExperience}</p>
        <p className="applicant-card-meta">{card.candidateCompany}</p>
        <p className="applicant-card-meta">Sourced by {card.recruiterName}</p>
      </div>

      <div className="applicant-card-footer">
        <p className="applicant-card-updated">{new Date(card.updatedAt).toLocaleString('en-IN')}</p>
        <span className="applicant-card-stage">{APPLICATION_STAGE_LABELS[card.stage]}</span>
      </div>

      {card.latestComment ? <p className="applicant-card-comment">{card.latestComment}</p> : null}

      <div className="public-actions">
        <Link className="button button-secondary" href={`${APP_ROUTES.internal.applications.detailBase}/${card.id}`}>
          Open
        </Link>
      </div>

      {transitionTargets.length > 0 ? (
        <div
          className="applicant-manual-controls"
          onMouseDown={stopDragOnInput}
          onPointerDown={stopDragOnInput}
        >
          <select
            className="input table-input"
            disabled={isSaving}
            onChange={(event) => setManualStage(event.target.value as ApplicationStage)}
            value={manualStage}
          >
            <option value={card.stage}>{APPLICATION_STAGE_LABELS[card.stage]}</option>
            {transitionTargets
              .filter((stage) => stage !== card.stage)
              .map((stage) => (
                <option key={`${card.id}-${stage}`} value={stage}>
                  {APPLICATION_STAGE_LABELS[stage]}
                </option>
              ))}
          </select>
          <input
            className="input table-input"
            disabled={isSaving}
            onChange={(event) => setManualComment(event.target.value)}
            placeholder="Comment (optional)"
            type="text"
            value={manualComment}
          />
          <button
            className="button button-secondary"
            disabled={manualStage === card.stage || isSaving}
            onClick={handleManualSubmit}
            type="button"
          >
            {isSaving ? 'Saving...' : 'Update Stage'}
          </button>
        </div>
      ) : null}
    </article>
  )
}

export const JobApplicantsBoard = ({ boardRole, cards, jobId }: JobApplicantsBoardProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [board, setBoard] = useState<Record<ApplicationStage, BoardCard[]>>(() => initializeBoard(cards))
  const [activeApplicationID, setActiveApplicationID] = useState<number | null>(null)
  const [pendingApplicationID, setPendingApplicationID] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBoard(initializeBoard(cards))
  }, [cards])

  const totalCards = useMemo(
    () => STAGE_COLUMNS.reduce((sum, column) => sum + board[column.key].length, 0),
    [board],
  )

  const moveApplication = ({
    applicationId,
    fromStage,
    toStage,
  }: {
    applicationId: number
    fromStage: ApplicationStage
    toStage: ApplicationStage
  }) => {
    if (fromStage === toStage) {
      return
    }

    setBoard((previous) => {
      const source = previous[fromStage]
      const target = previous[toStage]
      const movingCard = source.find((card) => card.id === applicationId)

      if (!movingCard) {
        return previous
      }

      const updatedCard: BoardCard = {
        ...movingCard,
        stage: toStage,
      }

      return {
        ...previous,
        [fromStage]: source.filter((card) => card.id !== applicationId),
        [toStage]: [updatedCard, ...target],
      }
    })
  }

  const persistMove = async ({
    applicationId,
    fromStage,
    latestComment,
    toStage,
  }: MoveArgs) => {
    if (pendingApplicationID === applicationId) {
      return
    }

    if (!canTransition({ boardRole, fromStage, toStage })) {
      setNotice(null)
      setError('This stage movement is not allowed for your role.')
      return
    }

    const previousBoard = board
    setPendingApplicationID(applicationId)
    moveApplication({ applicationId, fromStage, toStage })

    try {
      const response = await fetch(`${APP_ROUTES.internal.jobs.detailBase}/${jobId}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          applicationId,
          latestComment,
          toStage,
        }),
      })

      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(responseBody?.message || 'Unable to move card.')
      }

      setNotice(`Moved application to ${APPLICATION_STAGE_LABELS[toStage]}.`)
      setError(null)
    } catch (err) {
      setBoard(previousBoard)
      setNotice(null)
      setError(err instanceof Error ? err.message : 'Unable to move card.')
    } finally {
      setPendingApplicationID((current) => (current === applicationId ? null : current))
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const applicationId = Number(event.active.data.current?.applicationId || 0)
    if (!Number.isFinite(applicationId) || applicationId <= 0) {
      return
    }

    setActiveApplicationID(applicationId)
    setNotice(null)
    setError(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveApplicationID(null)

    const applicationId = Number(event.active.data.current?.applicationId || 0)
    const fromStage = String(event.active.data.current?.fromStage || '') as ApplicationStage
    const toStage = parseStageFromDropID(String(event.over?.id || ''))

    if (!applicationId || !toStage || !fromStage || fromStage === toStage) {
      return
    }

    await persistMove({
      applicationId,
      fromStage,
      toStage,
    })
  }

  return (
    <div className="job-board">
      <div className="job-board-meta">
        <p className="muted small">
          Total applicants: <strong>{totalCards}</strong>
        </p>
        <p className="muted tiny">{getRoleDragHint(boardRole)}</p>
      </div>
      {notice ? <p className="muted small">{notice}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} sensors={sensors}>
        <div className="job-board-columns">
          {STAGE_COLUMNS.map((column) => (
            <section className="job-stage-column" key={column.key}>
              <header className="job-stage-header">
                <div className="job-stage-title-wrap">
                  <span className={`job-stage-dot job-stage-dot-${column.tone}`} />
                  <h3>{column.label}</h3>
                </div>
                <span className="job-stage-count">{board[column.key].length}</span>
              </header>

              <DroppableStage id={`stage-${column.key}`} isOverClassName="job-stage-over">
                <div className="job-stage-cards">
                  {board[column.key].length === 0 ? (
                    <p className="board-empty">No applicants</p>
                  ) : (
                    board[column.key].map((card) => {
                      const transitionTargets = getAllowedTransitionTargets({
                        boardRole,
                        fromStage: card.stage,
                      })

                      return (
                        <BoardCardItem
                          canDrag={
                            activeApplicationID !== card.id &&
                            pendingApplicationID !== card.id &&
                            transitionTargets.length > 0
                          }
                          card={card}
                          isSaving={pendingApplicationID === card.id}
                          key={card.id}
                          onManualMove={persistMove}
                          transitionTargets={transitionTargets}
                        />
                      )
                    })
                  )}
                </div>
              </DroppableStage>
            </section>
          ))}
        </div>
      </DndContext>
    </div>
  )
}
