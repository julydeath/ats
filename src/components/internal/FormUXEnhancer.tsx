'use client'

import { useEffect } from 'react'

export const FormUXEnhancer = () => {
  useEffect(() => {
    const inferPendingLabel = (currentLabel: string): string => {
      const normalized = currentLabel.trim().toLowerCase()

      if (normalized.includes('delete') || normalized.includes('remove')) return 'Deleting...'
      if (normalized.includes('approve')) return 'Approving...'
      if (normalized.includes('reject')) return 'Rejecting...'
      if (normalized.includes('create') || normalized.includes('add')) return 'Creating...'
      if (normalized.includes('update') || normalized.includes('save')) return 'Saving...'
      if (normalized.includes('generate')) return 'Generating...'
      if (normalized.includes('disburse')) return 'Disbursing...'
      if (normalized.includes('lock')) return 'Locking...'
      if (normalized.includes('punch')) return 'Processing...'

      return 'Working...'
    }

    const setPendingOnControl = (control: HTMLButtonElement | HTMLInputElement) => {
      control.classList.add('is-pending')
      control.setAttribute('aria-disabled', 'true')
      control.disabled = true

      if (control instanceof HTMLButtonElement) {
        const currentLabel = control.textContent || ''
        if (!control.dataset.originalLabel) {
          control.dataset.originalLabel = currentLabel
        }

        const pendingLabel = control.dataset.pendingLabel || inferPendingLabel(currentLabel)
        control.textContent = pendingLabel
      } else if (control instanceof HTMLInputElement && control.type === 'submit') {
        const currentValue = control.value || ''
        if (!control.dataset.originalLabel) {
          control.dataset.originalLabel = currentValue
        }
        control.value = control.dataset.pendingLabel || inferPendingLabel(currentValue)
      }
    }

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
        if (submitter.name && submitter.value) {
          const hiddenInput = document.createElement('input')
          hiddenInput.type = 'hidden'
          hiddenInput.name = submitter.name
          hiddenInput.value = submitter.value
          hiddenInput.dataset.submitterMirror = 'true'
          form.appendChild(hiddenInput)
        }
      }

      form.classList.add('is-submitting')

      const formSubmitControls = Array.from(
        form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
          'button[type="submit"], input[type="submit"]',
        ),
      )

      for (const control of formSubmitControls) {
        setPendingOnControl(control)
      }
    }

    document.addEventListener('submit', handleSubmit, true)

    return () => {
      document.removeEventListener('submit', handleSubmit, true)
    }
  }, [])

  return null
}
