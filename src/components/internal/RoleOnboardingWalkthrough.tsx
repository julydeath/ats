'use client'

import { useEffect, useMemo, useState } from 'react'

import type { InternalRole } from '@/lib/constants/roles'

type WalkthroughStep = {
  description: string
  title: string
}

type RoleOnboardingWalkthroughProps = {
  role: InternalRole
  roleLabel: string
}

const WALKTHROUGH_STEPS: Record<InternalRole, readonly WalkthroughStep[]> = {
  admin: [
    {
      title: 'Use Command Center first',
      description: 'Start from dashboard to check active gaps and bottlenecks.',
    },
    {
      title: 'Assign ownership',
      description: 'Set lead ownership, then recruiter allocation for each active job.',
    },
    {
      title: 'Monitor review health',
      description: 'Keep pending reviews and stale corrections under control.',
    },
  ],
  leadRecruiter: [
    {
      title: 'Allocate recruiters',
      description: 'Balance work across recruiters for your assigned jobs.',
    },
    {
      title: 'Review sourcing quality',
      description: 'Check candidate and application details before taking decisions.',
    },
    {
      title: 'Process review queue',
      description: 'Approve, reject, or send back with clear comments.',
    },
  ],
  recruiter: [
    {
      title: 'Pick assigned job',
      description: 'Start from Job Workspace and choose your target job.',
    },
    {
      title: 'Add candidate profile',
      description: 'Create complete master record with source and resume.',
    },
    {
      title: 'Create and submit application',
      description: 'Map candidate to job and submit for lead review.',
    },
  ],
}

export const RoleOnboardingWalkthrough = ({ role, roleLabel }: RoleOnboardingWalkthroughProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const steps = useMemo(() => WALKTHROUGH_STEPS[role] || [], [role])
  const storageKey = `internal-onboarding-complete:${role}`

  useEffect(() => {
    try {
      const completed = window.localStorage.getItem(storageKey) === '1'
      if (!completed) {
        setIsOpen(true)
      }
    } catch {
      setIsOpen(true)
    }
  }, [storageKey])

  const closeWalkthrough = (markComplete: boolean) => {
    if (markComplete) {
      try {
        window.localStorage.setItem(storageKey, '1')
      } catch {}
    }

    setIsOpen(false)
    setStepIndex(0)
  }

  if (!isOpen) {
    return (
      <button className="help-fab" onClick={() => setIsOpen(true)} type="button">
        Quick Guide
      </button>
    )
  }

  const currentStep = steps[stepIndex]
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === steps.length - 1

  return (
    <>
      <div className="walkthrough-backdrop" />
      <section aria-label="Onboarding guide" className="walkthrough-modal">
        <p className="eyebrow">{roleLabel}</p>
        <h2>How to use this portal</h2>
        <p className="muted small">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <div className="walkthrough-step">
          <p className="walkthrough-title">{currentStep.title}</p>
          <p className="walkthrough-desc">{currentStep.description}</p>
        </div>
        <div className="public-actions">
          <button className="button button-secondary" onClick={() => closeWalkthrough(true)} type="button">
            Skip for now
          </button>
          <button
            className="button button-secondary"
            disabled={isFirstStep}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            type="button"
          >
            Back
          </button>
          {isLastStep ? (
            <button className="button" onClick={() => closeWalkthrough(true)} type="button">
              Finish
            </button>
          ) : (
            <button
              className="button"
              onClick={() => setStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
              type="button"
            >
              Next
            </button>
          )}
        </div>
      </section>
    </>
  )
}
