'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useMemo, useState } from 'react'

import { isCandidateRole } from '@/access/candidateRoles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { getSafeCandidateRedirect } from '@/lib/utils/safe-redirect'

const getErrorMessage = (responseBody: unknown): string => {
  if (!responseBody || typeof responseBody !== 'object') {
    return 'Unable to sign in. Please try again.'
  }

  const body = responseBody as {
    errors?: Array<{ message?: string }>
    message?: string
  }

  if (body.errors?.[0]?.message) {
    return body.errors[0].message
  }

  if (body.message) {
    return body.message
  }

  return 'Unable to sign in. Please verify your credentials.'
}

export const CandidateLoginForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nextRoute = useMemo(
    () => getSafeCandidateRedirect(searchParams.get('next')),
    [searchParams],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const loginResponse = await fetch('/api/candidate-users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const loginBody = (await loginResponse.json().catch(() => null)) as
        | {
            user?: {
              role?: unknown
            }
          }
        | null

      if (!loginResponse.ok) {
        setError(getErrorMessage(loginBody))
        return
      }

      if (!isCandidateRole(loginBody?.user?.role)) {
        await fetch('/api/candidate-users/logout', {
          method: 'POST',
          credentials: 'include',
        })

        setError('This account is not configured for the candidate portal.')
        return
      }

      router.replace(nextRoute || APP_ROUTES.candidate.dashboard)
      router.refresh()
    } catch {
      setError('Unable to sign in right now. Please try again shortly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="form-field" htmlFor="email">
        Email
      </label>
      <input
        autoComplete="email"
        className="input"
        id="email"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        required
        type="email"
        value={email}
      />

      <label className="form-field" htmlFor="password">
        Password
      </label>
      <input
        autoComplete="current-password"
        className="input"
        id="password"
        name="password"
        onChange={(event) => setPassword(event.target.value)}
        required
        type="password"
        value={password}
      />

      {error ? <p className="error-text">{error}</p> : null}

      <button className="button" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
