import mammoth from 'mammoth'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Ollama } from 'ollama'
import { z } from 'zod'

export type ParsedResumeData = {
  currentCompany?: string
  currentLocation?: string
  currentRole?: string
  email?: string
  fullName?: string
  jobTitle?: string
  linkedInURL?: string
  notes?: string
  phone?: string
  portfolioURL?: string
  primarySkills?: string
  skills?: string
  technology?: string
  totalExperienceYears?: number
}

export type ResumeParseResult = {
  extractedTextPreview: string
  parsed: ParsedResumeData
  warnings: string[]
}

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'https://ollama.com'
const OLLAMA_RESUME_MODEL = process.env.OLLAMA_RESUME_MODEL || 'llama3.1:8b'
const RESUME_TEXT_PROMPT_LIMIT = 16000
const PDF_STANDARD_FONT_URL = pathToFileURL(
  path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/'),
).toString()

const ResumeLLMResponseSchema = z.object({
  currentCompany: z.string().nullable().optional(),
  currentLocation: z.string().nullable().optional(),
  currentRole: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  linkedInURL: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  portfolioURL: z.string().nullable().optional(),
  primarySkills: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  skills: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  technology: z.string().nullable().optional(),
  totalExperienceYears: z.union([z.number(), z.string()]).nullable().optional(),
})

const normalizeWhitespace = (value: string): string =>
  value
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const getFileExtension = (filename: string): string => {
  const idx = filename.lastIndexOf('.')
  if (idx < 0) {
    return ''
  }

  return filename.slice(idx + 1).toLowerCase()
}

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  if (!normalized || normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'n/a') {
    return undefined
  }

  return normalized
}

const normalizeURL = (value: unknown): string | undefined => {
  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return undefined
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized
  }

  if (/^(www\.|[a-z0-9.-]+\.[a-z]{2,})/i.test(normalized)) {
    return `https://${normalized}`
  }

  return normalized
}

const normalizeStringList = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => normalizeOptionalString(item))
      .filter((item): item is string => Boolean(item))

    return normalized.length > 0 ? normalized.join(', ') : undefined
  }

  return normalizeOptionalString(value)
}

const normalizeExperienceYears = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 50) {
    return Math.round(value * 10) / 10
  }

  if (typeof value === 'string') {
    const match = value.match(/(\d+(?:\.\d+)?)/)
    if (!match) {
      return undefined
    }

    const parsed = Number(match[1])
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 50) {
      return Math.round(parsed * 10) / 10
    }
  }

  return undefined
}

const selectBestPhone = (phones: string[]): string | undefined => {
  if (phones.length === 0) {
    return undefined
  }

  const cleaned = phones
    .map((phone) => phone.replace(/[^\d+]/g, ''))
    .map((phone) => (phone.startsWith('+') ? phone : phone.replace(/^0+/, '')))
    .filter((phone) => {
      const digits = phone.replace(/\D/g, '')
      return digits.length >= 10 && digits.length <= 15
    })

  return cleaned[0] || undefined
}

const parseYears = (text: string): number | undefined => {
  const patterns = [
    /(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi,
    /experience\s*[:\-]?\s*(\d{1,2})\+?\s*(?:years?|yrs?)/gi,
  ]

  const hits: number[] = []

  patterns.forEach((pattern) => {
    let match = pattern.exec(text)
    while (match) {
      const value = Number(match[1])
      if (Number.isFinite(value) && value >= 0 && value <= 50) {
        hits.push(value)
      }
      match = pattern.exec(text)
    }
  })

  if (hits.length === 0) {
    return undefined
  }

  return Math.max(...hits)
}

const parseName = (text: string): string | undefined => {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (const line of lines.slice(0, 12)) {
    if (line.length < 4 || line.length > 64) {
      continue
    }

    if (line.includes('@') || /\d/.test(line) || /^resume$/i.test(line)) {
      continue
    }

    const words = line.split(/\s+/)
    if (words.length < 2 || words.length > 5) {
      continue
    }

    if (!words.every((word) => /^[A-Za-z][A-Za-z.'-]*$/.test(word))) {
      continue
    }

    return words.join(' ')
  }

  return undefined
}

const parseRoleCompany = (text: string): { currentCompany?: string; currentRole?: string } => {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const roleKeyRegex = /^(?:current\s+role|role|position|designation)\s*[:\-]\s*(.+)$/i
  const companyKeyRegex = /^(?:current\s+company|company|organization)\s*[:\-]\s*(.+)$/i

  for (const line of lines) {
    const roleMatch = roleKeyRegex.exec(line)
    if (roleMatch?.[1]) {
      return { currentRole: roleMatch[1].trim() }
    }
  }

  for (const line of lines) {
    const companyMatch = companyKeyRegex.exec(line)
    if (companyMatch?.[1]) {
      return { currentCompany: companyMatch[1].trim() }
    }
  }

  for (const line of lines.slice(0, 40)) {
    const atIdx = line.toLowerCase().indexOf(' at ')
    if (atIdx > 2 && atIdx < line.length - 4) {
      const role = line.slice(0, atIdx).trim()
      const company = line.slice(atIdx + 4).trim()
      if (role.length > 2 && company.length > 2) {
        return {
          currentCompany: company,
          currentRole: role,
        }
      }
    }
  }

  return {}
}

const inferURLs = (text: string): { linkedInURL?: string; portfolioURL?: string } => {
  const urlMatches = text.match(/\b(?:https?:\/\/|www\.)[^\s<>()]+/gi) || []
  const normalizedURLs = urlMatches.map((url) => (url.startsWith('http') ? url : `https://${url}`))

  const linkedInURL = normalizedURLs.find((url) => /linkedin\.com/i.test(url))
  const portfolioURL = normalizedURLs.find((url) => !/linkedin\.com/i.test(url))

  return { linkedInURL, portfolioURL }
}

const parseTextHeuristically = (rawText: string): ResumeParseResult => {
  const text = normalizeWhitespace(rawText)
  const warnings: string[] = []

  if (!text) {
    return {
      extractedTextPreview: '',
      parsed: {},
      warnings: ['No readable text was extracted from the resume.'],
    }
  }

  const emailMatches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []
  const phoneMatches = text.match(/(?:\+?\d[\d\s().-]{8,}\d)/g) || []
  const years = parseYears(text)
  const fullName = parseName(text)
  const roleCompany = parseRoleCompany(text)
  const links = inferURLs(text)

  if (!fullName) {
    warnings.push('Could not confidently detect full name. Please review manually.')
  }

  if (!emailMatches[0]) {
    warnings.push('No email found in resume text.')
  }

  const selectedPhone = selectBestPhone(phoneMatches)
  if (!selectedPhone) {
    warnings.push('No valid phone number detected.')
  }

  if (years === undefined) {
    warnings.push('Experience years were not clearly detected.')
  }

  return {
    extractedTextPreview: text.slice(0, 1200),
    parsed: {
      ...links,
      ...roleCompany,
      email: emailMatches[0] || undefined,
      fullName,
      notes: 'Auto-filled from resume parser. Please verify before saving.',
      phone: selectedPhone,
      totalExperienceYears: years,
    },
    warnings,
  }
}

const extractJSONObject = (value: string): string => {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const source = fenced?.[1] || value
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')

  if (start < 0 || end <= start) {
    throw new Error('Model response did not contain a JSON object.')
  }

  return source.slice(start, end + 1)
}

const normalizeLLMParsedData = (
  payload: z.infer<typeof ResumeLLMResponseSchema>,
): ParsedResumeData => ({
  currentCompany: normalizeOptionalString(payload.currentCompany),
  currentLocation: normalizeOptionalString(payload.currentLocation),
  currentRole: normalizeOptionalString(payload.currentRole),
  email: normalizeOptionalString(payload.email),
  fullName: normalizeOptionalString(payload.fullName),
  jobTitle: normalizeOptionalString(payload.jobTitle),
  linkedInURL: normalizeURL(payload.linkedInURL),
  notes: normalizeOptionalString(payload.notes),
  phone: normalizeOptionalString(payload.phone),
  portfolioURL: normalizeURL(payload.portfolioURL),
  primarySkills: normalizeStringList(payload.primarySkills),
  skills: normalizeStringList(payload.skills),
  technology: normalizeOptionalString(payload.technology),
  totalExperienceYears: normalizeExperienceYears(payload.totalExperienceYears),
})

const extractStructuredResumeDataWithLLM = async (
  extractedText: string,
): Promise<ParsedResumeData> => {
  if (!process.env.OLLAMA_API_KEY) {
    throw new Error('OLLAMA_API_KEY is not configured.')
  }

  const ollama = new Ollama({ host: OLLAMA_HOST })
  const prompt = [
    'You are an ATS resume extraction service.',
    'Return only a valid JSON object. Do not wrap it in markdown.',
    'Use null when a field is not clearly available.',
    'The JSON object must contain exactly these keys:',
    '{"fullName":null,"email":null,"phone":null,"currentRole":null,"currentCompany":null,"jobTitle":null,"currentLocation":null,"totalExperienceYears":null,"linkedInURL":null,"portfolioURL":null,"technology":null,"skills":[],"primarySkills":[],"notes":null}',
    'Rules:',
    '- `skills` and `primarySkills` must be arrays of short strings.',
    '- `totalExperienceYears` must be a number if clearly inferred, otherwise null.',
    '- `notes` must be a brief one-line recruiter summary.',
    '- Never add extra keys.',
    '',
    '<resume_text>',
    extractedText.slice(0, RESUME_TEXT_PROMPT_LIMIT),
    '</resume_text>',
  ].join('\n')

  const response = await ollama.chat({
    model: OLLAMA_RESUME_MODEL,
    stream: false,
    messages: [
      {
        role: 'system',
        content: 'Extract structured facts from resume text and respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    options: {
      temperature: 0,
    },
  })

  const rawContent = response.message?.content || ''
  const parsedJSON = JSON.parse(extractJSONObject(rawContent))
  return normalizeLLMParsedData(ResumeLLMResponseSchema.parse(parsedJSON))
}

const mergeParsedData = (base: ParsedResumeData, override: ParsedResumeData): ParsedResumeData => {
  const mergedEntries = Object.entries({ ...base, ...override }).filter(([, value]) => {
    if (typeof value === 'string') {
      return value.trim().length > 0
    }

    return value !== undefined && value !== null
  })

  return Object.fromEntries(mergedEntries) as ParsedResumeData
}

const extractTextFromPDF = async (buffer: Buffer): Promise<string> => {
  const pdfJS = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = pdfJS.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: PDF_STANDARD_FONT_URL,
    verbosity: pdfJS.VerbosityLevel.ERRORS,
  } as Parameters<typeof pdfJS.getDocument>[0])

  try {
    const doc = await task.promise
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber)
      const textContent = await page.getTextContent()

      const pageText = textContent.items
        .map((item) => {
          if (typeof item !== 'object' || item === null || !('str' in item)) {
            return ''
          }

          return String(item.str || '')
        })
        .join(' ')

      pages.push(pageText)
      page.cleanup()
    }

    await doc.destroy().catch(() => undefined)
    return normalizeWhitespace(pages.join('\n'))
  } finally {
    await task.destroy().catch(() => undefined)
  }
}

const extractTextFromDOCX = async (buffer: Buffer): Promise<string> => {
  const result = await mammoth.extractRawText({ buffer })
  return normalizeWhitespace(result.value || '')
}

const extractResumeText = async ({
  buffer,
  filename,
  mimeType,
}: {
  buffer: Buffer
  filename: string
  mimeType: string
}): Promise<string> => {
  const fileExt = getFileExtension(filename)
  const lowerMime = mimeType.toLowerCase()

  if (lowerMime.includes('pdf') || fileExt === 'pdf') {
    return extractTextFromPDF(buffer)
  }

  if (
    lowerMime.includes('officedocument.wordprocessingml.document') ||
    fileExt === 'docx'
  ) {
    return extractTextFromDOCX(buffer)
  }

  if (lowerMime.includes('msword') || fileExt === 'doc') {
    return ''
  }

  throw new Error('Unsupported resume format for parsing. Use PDF, DOCX, or DOC.')
}

export const parseResumeBuffer = async ({
  buffer,
  filename,
  mimeType,
}: {
  buffer: Buffer
  filename: string
  mimeType: string
}): Promise<ResumeParseResult> => {
  const extractedText = await extractResumeText({ buffer, filename, mimeType })
  const heuristicResult = parseTextHeuristically(extractedText)
  const warnings = [...heuristicResult.warnings]

  let parsed = heuristicResult.parsed

  if (!extractedText) {
    warnings.push(
      'This file did not expose usable text. PDF and DOCX work best; scanned PDFs may still need OCR support.',
    )
  } else {
    try {
      const llmParsed = await extractStructuredResumeDataWithLLM(extractedText)
      parsed = mergeParsedData(parsed, llmParsed)
    } catch (error) {
      warnings.push(
        error instanceof Error && error.message === 'OLLAMA_API_KEY is not configured.'
          ? 'Ollama Cloud API key is not configured. Used fallback parser only.'
          : 'LLM extraction was unavailable, so fallback parser results were used.',
      )
    }
  }

  return {
    extractedTextPreview: extractedText.slice(0, 1200),
    parsed,
    warnings: Array.from(new Set(warnings)),
  }
}
