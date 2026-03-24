'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'

import { APP_ROUTES } from '@/lib/constants/routes'
import { isInternalRole } from '@/lib/constants/roles'
import { getSafeInternalRedirect } from '@/lib/utils/safe-redirect'

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

export const InternalLoginForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nextRoute = useMemo(
    () => getSafeInternalRedirect(searchParams.get('next')),
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
      const loginResponse = await fetch('/api/users/login', {
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

      if (!isInternalRole(loginBody?.user?.role)) {
        await fetch('/api/users/logout', {
          method: 'POST',
          credentials: 'include',
        })

        setError('Your account is not permitted to access the internal operations portal.')
        return
      }

      setShowSuccessToast(true)

      window.setTimeout(() => {
        router.replace(nextRoute || APP_ROUTES.internal.dashboard)
        router.refresh()
      }, 850)
    } catch {
      setError('Unable to sign in right now. Please try again shortly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="internal-login-card">
        <div className="internal-login-card-main">
          <div className="internal-login-copy">
            <h2>Welcome back</h2>
            <p>Enter your credentials to access the dashboard</p>
          </div>

          <form className="internal-login-form" onSubmit={handleSubmit}>
            <label className="internal-login-field-label" htmlFor="email">
              Email Address
            </label>
            <input
              autoComplete="email"
              className="internal-login-input"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@inspirix.com"
              required
              type="email"
              value={email}
            />

            <div className="internal-login-password-row">
              <label className="internal-login-field-label" htmlFor="password">
                Password
              </label>
              <Link className="internal-login-forgot-link" href={APP_ROUTES.root}>
                Forgot Password?
              </Link>
            </div>
            <input
              autoComplete="current-password"
              className="internal-login-input"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="........"
              required
              type="password"
              value={password}
            />

            <label className="internal-login-remember-row" htmlFor="remember-device">
              <input
                checked={rememberDevice}
                id="remember-device"
                onChange={(event) => setRememberDevice(event.target.checked)}
                type="checkbox"
              />
              <span>Remember this device</span>
            </label>

            {error ? <p className="internal-login-error">{error}</p> : null}

            <button className="internal-login-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Logging in...' : 'Login ->'}
            </button>
          </form>
        </div>

        <div className="internal-login-card-footer">Secured by Inspirix Identity Services</div>
      </div>

      <div className="internal-login-footer-links">
        <Link href={APP_ROUTES.root}>Support Center</Link>
        <Link href={APP_ROUTES.root}>Privacy Policy</Link>
        <Link href={APP_ROUTES.root}>System Status</Link>
      </div>

      {showSuccessToast ? (
        <div className="internal-login-toast">
          <span className="internal-login-toast-icon" aria-hidden>
            ✓
          </span>
          <div>
            <p>Login Successful</p>
            <span>Redirecting to your dashboard...</span>
          </div>
          <button aria-label="Close notification" type="button" onClick={() => setShowSuccessToast(false)}>
            x
          </button>
        </div>
      ) : null}
    </>
  )
}
