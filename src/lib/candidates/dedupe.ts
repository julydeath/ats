import { compactWhitespace, normalizeEmail, normalizePhone, normalizeText } from '@/lib/utils/normalization'

export const buildCandidateDuplicateSignals = (input: {
  email?: unknown
  fullName?: unknown
  phone?: unknown
}) => {
  const normalizedEmail = normalizeEmail(input.email)
  const normalizedPhone = normalizePhone(input.phone)
  const normalizedFullName = normalizeText(input.fullName)

  return {
    normalizedEmail: normalizedEmail || null,
    normalizedFullName: normalizedFullName || null,
    normalizedPhone: normalizedPhone || null,
    readableFullName: compactWhitespace(input.fullName),
  }
}
