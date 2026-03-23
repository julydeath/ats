import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getPayload } from 'payload'

import {
  getCandidateProfileID,
  isCandidateAuthenticated,
  type CandidateUserLike,
} from '@/access/candidateRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

type RawCandidateUser = {
  candidateProfile?: unknown
  email?: string | null
  fullName?: string | null
  id: number | string
  isActive?: boolean | null
  role?: unknown
}

export type CandidateSessionUser = {
  candidateProfile: number | string
  candidateProfileID: number | string
  email: string
  fullName?: string | null
  id: number | string
  isActive: boolean
  role: 'candidate'
}

const toCandidateSessionUser = (user: RawCandidateUser): CandidateSessionUser | null => {
  const candidateProfileID = getCandidateProfileID(user as CandidateUserLike)

  if (!candidateProfileID) {
    return null
  }

  return {
    candidateProfile: candidateProfileID,
    candidateProfileID,
    email: String(user.email || ''),
    fullName: user.fullName || null,
    id: user.id,
    isActive: user.isActive ?? true,
    role: 'candidate',
  }
}

export const getCurrentCandidateUser = cache(async (): Promise<CandidateSessionUser | null> => {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })
  const candidateUser = user as CandidateUserLike

  if (!isCandidateAuthenticated(candidateUser)) {
    return null
  }

  return toCandidateSessionUser(user as RawCandidateUser)
})

export const requireCandidateUser = async (): Promise<CandidateSessionUser> => {
  const user = await getCurrentCandidateUser()

  if (!user || !user.isActive) {
    redirect(APP_ROUTES.candidate.login)
  }

  return user
}
