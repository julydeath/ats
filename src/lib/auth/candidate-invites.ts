import { randomBytes } from 'crypto'

import { buildStableHash } from '@/lib/utils/normalization'

const DEFAULT_INVITE_TTL_HOURS = 72
const MIN_INVITE_TTL_HOURS = 1
const MAX_INVITE_TTL_HOURS = 24 * 30
const INVITE_TOKEN_BYTES = 32

export const readCandidateInviteTTLHours = (): number => {
  const rawValue = process.env.CANDIDATE_INVITE_TOKEN_TTL_HOURS
  const parsed = Number(rawValue)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_INVITE_TTL_HOURS
  }

  const normalized = Math.floor(parsed)

  if (normalized < MIN_INVITE_TTL_HOURS || normalized > MAX_INVITE_TTL_HOURS) {
    return DEFAULT_INVITE_TTL_HOURS
  }

  return normalized
}

export const buildCandidateInviteTokenHash = (token: string): string => buildStableHash(token.trim())

export const buildCandidateInviteExpiryDate = (): Date => {
  const ttlHours = readCandidateInviteTTLHours()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + ttlHours)
  return expiresAt
}

export const generateCandidateInviteToken = (): { token: string; tokenHash: string } => {
  const token = randomBytes(INVITE_TOKEN_BYTES).toString('base64url')

  return {
    token,
    tokenHash: buildCandidateInviteTokenHash(token),
  }
}

export const hasInviteExpired = (expiresAt: unknown, now: Date = new Date()): boolean => {
  if (typeof expiresAt !== 'string') {
    return true
  }

  const expiresDate = new Date(expiresAt)

  if (Number.isNaN(expiresDate.getTime())) {
    return true
  }

  return expiresDate.getTime() <= now.getTime()
}
