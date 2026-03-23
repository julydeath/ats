'use client'

import { useEffect } from 'react'

export const FormUXEnhancer = () => {
  useEffect(() => {
    const handleSubmit = (event: Event) => {
      const submitEvent = event as SubmitEvent
      const form = submitEvent.target as HTMLFormElement | null

      if (!form) {
        return
      }

      const submitter = submitEvent.submitter as HTMLButtonElement | HTMLInputElement | null

      const confirmMessage =
        submitter?.dataset.confirmMessage || form.dataset.confirmMessage || ''

      if (confirmMessage && !window.confirm(confirmMessage)) {
        event.preventDefault()
        return
      }

      if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
        if (submitter.dataset.pendingLabel) {
          submitter.dataset.originalLabel = submitter.textContent || ''
          submitter.textContent = submitter.dataset.pendingLabel
        }
        submitter.disabled = true
      }
    }

    document.addEventListener('submit', handleSubmit, true)

    return () => {
      document.removeEventListener('submit', handleSubmit, true)
    }
  }, [])

  return null
}
