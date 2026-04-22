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
  applicationNotes: string
  candidateEmail: string
  candidateCompany: string
  candidateExperience: string
  candidateId: number | null
  candidateLinkedIn: string
  candidateLocation: string
  candidateName: string
  candidatePhone: string
  candidatePortfolio: string
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
  tone: 'gray' | 'orange' | 'teal' | 'purple' | 'blue' | 'green' | 'red'
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
  { key: 'sourced', label: 'Sourced', tone: 'gray' },
  { key: 'screened', label: 'Screened', tone: 'orange' },
  { key: 'submittedToClient', label: 'Submitted to Client', tone: 'teal' },
  { key: 'interviewScheduled', label: 'Interview Scheduled', tone: 'purple' },
  { key: 'interviewCleared', label: 'Interview Cleared', tone: 'blue' },
  { key: 'offerReleased', label: 'Offer Released', tone: 'green' },
  { key: 'joined', label: 'Joined', tone: 'green' },
  { key: 'rejected', label: 'Rejected', tone: 'red' },
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
    if (fromStage === 'screened') return ['submittedToClient']
    if (fromStage === 'submittedToClient') return ['interviewScheduled', 'rejected']
    if (fromStage === 'interviewScheduled') return ['interviewCleared', 'rejected']
    if (fromStage === 'interviewCleared') return ['offerReleased', 'rejected']
    if (fromStage === 'offerReleased') return ['joined', 'rejected']
    return []
  }

  if (boardRole === 'leadRecruiter') {
    if (fromStage === 'sourced') return ['screened', 'rejected']
    if (fromStage === 'screened') return ['sourced', 'submittedToClient', 'rejected']

    const recruiterTargets = getAllowedTransitionTargets({ boardRole: 'recruiter', fromStage })
    if (fromStage !== 'rejected' && !recruiterTargets.includes('rejected')) {
      return [...recruiterTargets, 'rejected']
    }

    return recruiterTargets
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
    return 'You can move any applicant and update stage directly from the detail panel.'
  }

  if (role === 'recruiter') {
    return 'Recruiter can update downstream stages after lead screening and keep interview/offer status current.'
  }

  return 'Lead screens sourced candidates and can also step in for full pipeline movement when needed.'
}

const getInitials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

const getPreferredNextStage = ({
  boardRole,
  fromStage,
}: {
  boardRole: JobApplicantsBoardProps['boardRole']
  fromStage: ApplicationStage
}): ApplicationStage | null => {
  const allowed = getAllowedTransitionTargets({ boardRole, fromStage }).filter((stage) => stage !== fromStage)

  if (allowed.length === 0) {
    return null
  }

  const orderedStages = STAGE_COLUMNS.map((column) => column.key)
  const currentIndex = orderedStages.indexOf(fromStage)

  for (let index = currentIndex + 1; index < orderedStages.length; index += 1) {
    const stage = orderedStages[index]
    if (allowed.includes(stage)) {
      return stage
    }
  }

  return allowed[0] || null
}

const formatUpdatedAt = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Updated recently'
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
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
  isSelected,
  isSaving,
  onSelect,
}: {
  canDrag: boolean
  card: BoardCard
  isSelected: boolean
  isSaving: boolean
  onSelect: (applicationId: number) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `app-${card.id}`,
    data: {
      applicationId: card.id,
      fromStage: card.stage,
    },
    disabled: !canDrag || isSaving,
  })

  const initials = getInitials(card.candidateName)

  return (
    <article
      className={[
        'job-kanban-card',
        isSelected ? 'job-kanban-card-selected' : '',
        isDragging ? 'job-kanban-card-dragging' : '',
        !canDrag ? 'job-kanban-card-static' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect(card.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(card.id)
        }
      }}
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      <div className="job-kanban-card-head">
        <div className="job-kanban-card-avatar">{initials}</div>
        <div>
          <p className="job-kanban-card-name">{card.candidateName}</p>
          <p className="job-kanban-card-role">{card.candidateRole}</p>
        </div>
        <button aria-label="More options" className="job-kanban-card-menu" type="button">
          •••
        </button>
      </div>

      <div className="job-kanban-card-details">
        <p className="job-kanban-card-meta">{card.candidateExperience}</p>
        <p className="job-kanban-card-meta">{card.candidateCompany}</p>
        <p className="job-kanban-card-meta">Recruiter: {card.recruiterName}</p>
      </div>

      <div className="job-kanban-card-footer">
        <p className="job-kanban-card-updated">{formatUpdatedAt(card.updatedAt)}</p>
        <span className="job-kanban-card-stage">{APPLICATION_STAGE_LABELS[card.stage]}</span>
      </div>

      {card.latestComment ? <p className="job-kanban-card-comment">{card.latestComment}</p> : null}
    </article>
  )
}

export const JobApplicantsBoard = ({ boardRole, cards, jobId }: JobApplicantsBoardProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [board, setBoard] = useState<Record<ApplicationStage, BoardCard[]>>(() => initializeBoard(cards))
  const [activeApplicationID, setActiveApplicationID] = useState<number | null>(null)
  const [pendingApplicationID, setPendingApplicationID] = useState<number | null>(null)
  const [selectedApplicationID, setSelectedApplicationID] = useState<number | null>(cards[0]?.id || null)
  const [drawerStage, setDrawerStage] = useState<ApplicationStage | null>(cards[0]?.stage || null)
  const [drawerComment, setDrawerComment] = useState('')
  const [drawerTab, setDrawerTab] = useState<'overview' | 'experience' | 'feedback' | 'files'>('overview')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBoard(initializeBoard(cards))
  }, [cards])

  const allCards = useMemo(() => STAGE_COLUMNS.flatMap((column) => board[column.key]), [board])

  useEffect(() => {
    if (allCards.length === 0) {
      setSelectedApplicationID(null)
      setDrawerStage(null)
      return
    }

    if (!selectedApplicationID || !allCards.some((card) => card.id === selectedApplicationID)) {
      const defaultCard = allCards[0]
      setSelectedApplicationID(defaultCard?.id || null)
      setDrawerStage(defaultCard?.stage || null)
    }
  }, [allCards, selectedApplicationID])

  const selectedCard = useMemo(
    () => allCards.find((card) => card.id === selectedApplicationID) || null,
    [allCards, selectedApplicationID],
  )

  const selectedTransitionTargets = useMemo(() => {
    if (!selectedCard) {
      return []
    }

    return getAllowedTransitionTargets({
      boardRole,
      fromStage: selectedCard.stage,
    })
  }, [boardRole, selectedCard])

  const selectedPreferredNextStage = useMemo(() => {
    if (!selectedCard) {
      return null
    }

    return getPreferredNextStage({
      boardRole,
      fromStage: selectedCard.stage,
    })
  }, [boardRole, selectedCard])

  useEffect(() => {
    if (!selectedCard) {
      setDrawerStage(null)
      setDrawerComment('')
      return
    }

    setDrawerStage(selectedCard.stage)
    setDrawerComment('')
  }, [selectedCard])

  const totalCards = useMemo(
    () => STAGE_COLUMNS.reduce((sum, column) => sum + board[column.key].length, 0),
    [board],
  )

  const moveApplication = ({
    applicationId,
    fromStage,
    latestComment,
    toStage,
  }: {
    applicationId: number
    fromStage: ApplicationStage
    latestComment?: string
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
        latestComment: latestComment || movingCard.latestComment,
        stage: toStage,
        updatedAt: new Date().toISOString(),
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
    moveApplication({ applicationId, fromStage, latestComment, toStage })

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
    setSelectedApplicationID(applicationId)
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

  const handleManualStageUpdate = async () => {
    if (!selectedCard || !drawerStage || drawerStage === selectedCard.stage || pendingApplicationID === selectedCard.id) {
      return
    }

    await persistMove({
      applicationId: selectedCard.id,
      fromStage: selectedCard.stage,
      latestComment: drawerComment.trim() || undefined,
      toStage: drawerStage,
    })
    setDrawerComment('')
  }

  const handleArchive = async () => {
    if (
      !selectedCard ||
      selectedCard.stage === 'rejected' ||
      pendingApplicationID === selectedCard.id ||
      !selectedTransitionTargets.includes('rejected')
    ) {
      return
    }

    await persistMove({
      applicationId: selectedCard.id,
      fromStage: selectedCard.stage,
      latestComment: drawerComment.trim() || 'Moved to rejected',
      toStage: 'rejected',
    })
    setDrawerComment('')
  }

  const handleNextStage = async () => {
    if (
      !selectedCard ||
      !selectedPreferredNextStage ||
      pendingApplicationID === selectedCard.id ||
      selectedPreferredNextStage === selectedCard.stage
    ) {
      return
    }

    await persistMove({
      applicationId: selectedCard.id,
      fromStage: selectedCard.stage,
      latestComment: drawerComment.trim() || undefined,
      toStage: selectedPreferredNextStage,
    })
    setDrawerComment('')
  }

  return (
    <section className="job-kanban-shell">
      <div className="job-kanban-main">
        <div className="job-kanban-meta">
          <p>
            Total applicants <strong>{totalCards}</strong>
          </p>
          <p>{getRoleDragHint(boardRole)}</p>
        </div>

        {notice ? <p className="job-kanban-notice">{notice}</p> : null}
        {error ? <p className="job-kanban-error">{error}</p> : null}

        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} sensors={sensors}>
          <div className="job-kanban-columns">
            {STAGE_COLUMNS.map((column) => (
              <section className="job-kanban-column" key={column.key}>
                <header className="job-kanban-column-header">
                  <div className="job-kanban-column-title">
                    <span className={`job-stage-dot job-stage-dot-${column.tone}`} />
                    <h3>{column.label}</h3>
                    <span className="job-kanban-column-count">{board[column.key].length}</span>
                  </div>
                  <button aria-label="Column options" className="job-kanban-column-menu" type="button">
                    •••
                  </button>
                </header>

                <DroppableStage id={`stage-${column.key}`} isOverClassName="job-stage-over">
                  <div className="job-kanban-card-list">
                    {board[column.key].length === 0 ? (
                      <p className="job-kanban-empty">No applicants</p>
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
                            isSelected={selectedApplicationID === card.id}
                            key={card.id}
                            onSelect={setSelectedApplicationID}
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

      <aside className="job-candidate-drawer">
        {!selectedCard ? (
          <div className="job-candidate-empty">Select a candidate card to view full profile details.</div>
        ) : (
          <>
            <header className="job-candidate-drawer-head">
              <button
                className="job-candidate-action-button job-candidate-action-ghost"
                disabled={
                  pendingApplicationID === selectedCard.id ||
                  selectedCard.stage === 'rejected' ||
                  !selectedTransitionTargets.includes('rejected')
                }
                onClick={handleArchive}
                type="button"
              >
                Archive
              </button>
              <button
                className="job-candidate-action-button"
                disabled={
                  pendingApplicationID === selectedCard.id ||
                  !selectedPreferredNextStage ||
                  selectedPreferredNextStage === selectedCard.stage
                }
                onClick={handleNextStage}
                type="button"
              >
                Next Stage
              </button>
            </header>

            <div className="job-candidate-profile">
              <div className="job-candidate-avatar">{getInitials(selectedCard.candidateName)}</div>
              <h3>{selectedCard.candidateName}</h3>
              <p>{selectedCard.candidateRole}</p>
              <p>{selectedCard.candidateExperience}</p>
            </div>

            <div className="job-candidate-contact">
              <span>{selectedCard.candidateEmail || 'No email'}</span>
              <span>{selectedCard.candidatePhone || 'No phone'}</span>
              <span>{selectedCard.candidatePortfolio || selectedCard.candidateLinkedIn || 'No profile URL'}</span>
            </div>

            <nav className="job-candidate-tabs">
              {(['overview', 'experience', 'feedback', 'files'] as const).map((tab) => (
                <button
                  className={`job-candidate-tab ${drawerTab === tab ? 'job-candidate-tab-active' : ''}`}
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  type="button"
                >
                  {tab === 'overview'
                    ? 'Overview'
                    : tab === 'experience'
                      ? 'Experience'
                      : tab === 'feedback'
                        ? 'Feedback'
                        : 'Files'}
                </button>
              ))}
            </nav>

            <div className="job-candidate-tab-panel">
              {drawerTab === 'overview' ? (
                <div className="job-candidate-panel-content">
                  <p className="job-candidate-section-label">Recruiter Summary</p>
                  <blockquote>{selectedCard.latestComment || 'No recruiter summary added yet.'}</blockquote>
                  <p className="job-candidate-section-label">Current Stage</p>
                  <p className="job-candidate-stage-pill">{APPLICATION_STAGE_LABELS[selectedCard.stage]}</p>
                  <p className="job-candidate-section-label">Location</p>
                  <p>{selectedCard.candidateLocation || 'Not provided'}</p>
                  <p className="job-candidate-section-label">Current Company</p>
                  <p>{selectedCard.candidateCompany.replace(/^Ex:\s*/, '')}</p>
                </div>
              ) : null}

              {drawerTab === 'experience' ? (
                <div className="job-candidate-panel-content">
                  <p className="job-candidate-section-label">Role</p>
                  <p>{selectedCard.candidateRole}</p>
                  <p className="job-candidate-section-label">Total Experience</p>
                  <p>{selectedCard.candidateExperience}</p>
                  <p className="job-candidate-section-label">Last Updated</p>
                  <p>{formatUpdatedAt(selectedCard.updatedAt)}</p>
                  <p className="job-candidate-section-label">Recruiter</p>
                  <p>{selectedCard.recruiterName}</p>
                </div>
              ) : null}

              {drawerTab === 'feedback' ? (
                <div className="job-candidate-panel-content">
                  <p className="job-candidate-section-label">Latest Comment</p>
                  <p>{selectedCard.latestComment || 'No latest comment yet.'}</p>
                  <p className="job-candidate-section-label">Application Notes</p>
                  <p>{selectedCard.applicationNotes || 'No additional notes.'}</p>
                </div>
              ) : null}

              {drawerTab === 'files' ? (
                <div className="job-candidate-panel-content">
                  <p className="job-candidate-section-label">Quick Links</p>
                  <div className="job-candidate-links">
                    {selectedCard.candidateId ? (
                      <Link
                        className="job-candidate-link"
                        href={`${APP_ROUTES.internal.candidates.detailBase}/${selectedCard.candidateId}`}
                      >
                        Open candidate profile
                      </Link>
                    ) : null}
                    <Link className="job-candidate-link" href={`${APP_ROUTES.internal.applications.detailBase}/${selectedCard.id}`}>
                      Open application
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="job-candidate-stage-controls">
              <p className="job-candidate-section-label">Manual Stage Update</p>
              <select
                className="job-candidate-select"
                disabled={pendingApplicationID === selectedCard.id}
                onChange={(event) => setDrawerStage(event.target.value as ApplicationStage)}
                value={drawerStage || selectedCard.stage}
              >
                <option value={selectedCard.stage}>{APPLICATION_STAGE_LABELS[selectedCard.stage]}</option>
                {selectedTransitionTargets
                  .filter((stage) => stage !== selectedCard.stage)
                  .map((stage) => (
                    <option key={`drawer-${selectedCard.id}-${stage}`} value={stage}>
                      {APPLICATION_STAGE_LABELS[stage]}
                    </option>
                  ))}
              </select>

              <input
                className="job-candidate-input"
                disabled={pendingApplicationID === selectedCard.id}
                onChange={(event) => setDrawerComment(event.target.value)}
                placeholder="Add stage note (optional)"
                type="text"
                value={drawerComment}
              />

              <button
                className="job-candidate-update"
                disabled={
                  pendingApplicationID === selectedCard.id ||
                  !drawerStage ||
                  drawerStage === selectedCard.stage
                }
                onClick={handleManualStageUpdate}
                type="button"
              >
                {pendingApplicationID === selectedCard.id ? 'Saving...' : 'Update Stage'}
              </button>
            </div>
          </>
        )}
      </aside>
    </section>
  )
}
