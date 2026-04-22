'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { APP_ROUTES } from '@/lib/constants/routes'

type AttendanceMeResponse = {
  canPunch: boolean
  employeeCode: string | null
  hasOpenSession: boolean
  openSessionPunchInAt: string | null
  role: string | null
}

type AttendancePunchControlsProps = {
  missingProfile: boolean
}

const fetchAttendanceMe = async (): Promise<AttendanceMeResponse> => {
  const response = await fetch(APP_ROUTES.api.internal.hr.attendanceMe, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
    method: 'GET',
  })

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
  } & Partial<AttendanceMeResponse>

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to load attendance state.')
  }

  return {
    canPunch: Boolean(payload.canPunch),
    employeeCode: payload.employeeCode || null,
    hasOpenSession: Boolean(payload.hasOpenSession),
    openSessionPunchInAt: payload.openSessionPunchInAt || null,
    role: payload.role || null,
  }
}

const formatDateTime = (value?: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  })
}

const postJSON = async (path: string, body?: Record<string, unknown>) => {
  const response = await fetch(path, {
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    message?: string
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Action failed.')
  }

  return payload.message || 'Updated'
}

export const AttendancePunchControls = ({ missingProfile }: AttendancePunchControlsProps) => {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  const meQuery = useQuery({
    queryFn: fetchAttendanceMe,
    queryKey: ['attendance', 'me'],
  })

  const invalidateAttendance = () => {
    queryClient.invalidateQueries({ queryKey: ['attendance', 'me'] })
  }

  const punchInMutation = useMutation({
    mutationFn: () => postJSON(APP_ROUTES.api.internal.hr.attendancePunchIn, { source: 'web' }),
    onError: (error) => {
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Unable to punch in.',
      })
    },
    onSuccess: (message) => {
      setFeedback({
        kind: 'success',
        text: message,
      })
      invalidateAttendance()
    },
  })

  const punchOutMutation = useMutation({
    mutationFn: () => postJSON(APP_ROUTES.api.internal.hr.attendancePunchOut),
    onError: (error) => {
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Unable to punch out.',
      })
    },
    onSuccess: (message) => {
      setFeedback({
        kind: 'success',
        text: message,
      })
      invalidateAttendance()
    },
  })

  const isPending = punchInMutation.isPending || punchOutMutation.isPending || meQuery.isFetching
  const canPunch = Boolean(meQuery.data?.canPunch)
  const hasOpenSession = Boolean(meQuery.data?.hasOpenSession)

  const statusText = useMemo(() => {
    if (missingProfile) {
      return 'Employee profile is missing. Ask admin to map your employee profile to enable punch in/out.'
    }

    if (meQuery.isLoading) {
      return 'Loading attendance session...'
    }

    if (meQuery.error) {
      return meQuery.error instanceof Error ? meQuery.error.message : 'Unable to load attendance state.'
    }

    if (!canPunch) {
      return 'Punch controls are not available for this account.'
    }

    if (hasOpenSession) {
      return `Open session from ${formatDateTime(meQuery.data?.openSessionPunchInAt)}.`
    }

    return 'No active session. Start your day using punch-in.'
  }, [canPunch, hasOpenSession, meQuery.data?.openSessionPunchInAt, meQuery.error, meQuery.isLoading, missingProfile])

  return (
    <>
      <p className="panel-subtitle" style={statusText.includes('missing') ? { color: '#b91c1c' } : undefined}>
        {statusText}
      </p>

      {feedback ? (
        <p className="panel-subtitle" style={{ color: feedback.kind === 'error' ? '#b91c1c' : '#166534', marginTop: 8 }}>
          {feedback.kind === 'error' ? 'Error: ' : 'Success: '}
          {feedback.text}
        </p>
      ) : null}

      <div className="public-actions" style={{ marginTop: 12 }}>
        <button
          className="button"
          disabled={isPending || !canPunch || missingProfile || hasOpenSession}
          onClick={() => punchInMutation.mutate()}
          type="button"
        >
          {punchInMutation.isPending ? 'Punching In...' : 'Punch In'}
        </button>

        <button
          className="button button-secondary"
          disabled={isPending || !canPunch || missingProfile || !hasOpenSession}
          onClick={() => punchOutMutation.mutate()}
          type="button"
        >
          {punchOutMutation.isPending ? 'Punching Out...' : 'Punch Out'}
        </button>
      </div>
    </>
  )
}
