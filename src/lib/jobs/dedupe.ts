import { compactWhitespace, buildStableHash, normalizeText } from '@/lib/utils/normalization'
import { extractRelationshipID } from '@/lib/utils/relationships'

type JobDedupeInput = {
  client: unknown
  department?: unknown
  description?: unknown
  employmentType?: unknown
  location?: unknown
  requiredSkills?: unknown
  title?: unknown
}

const normalizeSkills = (skills: unknown): string[] => {
  if (!Array.isArray(skills)) {
    return []
  }

  return skills
    .map((item) => {
      if (typeof item === 'string') {
        return normalizeText(item)
      }

      if (!item || typeof item !== 'object') {
        return ''
      }

      const typed = item as { skill?: unknown }
      return normalizeText(typed.skill)
    })
    .filter(Boolean)
    .sort()
}

export const buildJobDedupeKey = (input: JobDedupeInput): string | null => {
  const clientID = extractRelationshipID(input.client)
  const title = normalizeText(input.title)
  const description = normalizeText(input.description)

  if (!clientID || !title || !description) {
    return null
  }

  const payload = JSON.stringify({
    clientID: String(clientID),
    department: normalizeText(input.department),
    description,
    employmentType: normalizeText(input.employmentType),
    location: normalizeText(input.location),
    requiredSkills: normalizeSkills(input.requiredSkills),
    title,
  })

  return buildStableHash(payload)
}

export const buildClientDuplicateSignals = (input: {
  email?: unknown
  name?: unknown
  phone?: unknown
}) => {
  const normalizedName = normalizeText(input.name)
  const normalizedEmail = normalizeText(input.email)
  const normalizedPhone = String(input.phone || '').replace(/\D/g, '')

  return {
    normalizedEmail: normalizedEmail || null,
    normalizedName: compactWhitespace(input.name),
    normalizedNameKey: normalizedName || null,
    normalizedPhone: normalizedPhone || null,
  }
}
