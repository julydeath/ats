import { APIError, type CollectionSlug, type PayloadRequest } from 'payload'

const pad = (value: number, size: number): string => String(value).padStart(size, '0')

const buildCodeStamp = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = pad(now.getMonth() + 1, 2)
  const day = pad(now.getDate(), 2)
  const hour = pad(now.getHours(), 2)
  const minute = pad(now.getMinutes(), 2)
  return `${year}${month}${day}${hour}${minute}`
}

const randomChunk = (): string => pad(Math.floor(Math.random() * 10000), 4)

const createCandidateCode = (prefix: string): string => `${prefix}-${buildCodeStamp()}-${randomChunk()}`

const readCurrentValue = ({
  data,
  fieldName,
  originalDoc,
}: {
  data?: Record<string, unknown>
  fieldName: string
  originalDoc?: Record<string, unknown>
}): string | null => {
  const fromData = data?.[fieldName]
  if (typeof fromData === 'string' && fromData.trim().length > 0) {
    return fromData.trim().toUpperCase()
  }

  const fromOriginalDoc = originalDoc?.[fieldName]
  if (typeof fromOriginalDoc === 'string' && fromOriginalDoc.trim().length > 0) {
    return fromOriginalDoc.trim().toUpperCase()
  }

  return null
}

export const resolveBusinessCode = async ({
  collection,
  data,
  fieldName,
  originalDoc,
  prefix,
  req,
}: {
  collection: CollectionSlug
  data?: Record<string, unknown>
  fieldName: string
  originalDoc?: Record<string, unknown>
  prefix: string
  req: PayloadRequest
}): Promise<string> => {
  const existing = readCurrentValue({ data, fieldName, originalDoc })

  if (existing) {
    return existing
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = createCandidateCode(prefix)

    const existingDoc = await req.payload.find({
      collection,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        [fieldName]: {
          equals: candidate,
        },
      },
    })

    if (existingDoc.totalDocs === 0) {
      return candidate
    }
  }

  throw new APIError(`Unable to generate a unique ${fieldName}. Please retry.`, 500)
}
