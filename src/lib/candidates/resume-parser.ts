import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

export type ParsedResumeData = {
  currentCompany?: string
  currentRole?: string
  email?: string
  fullName?: string
  linkedInURL?: string
  notes?: string
  phone?: string
  portfolioURL?: string
  totalExperienceYears?: number
}

export type ResumeParseResult = {
  extractedTextPreview: string
  parsed: ParsedResumeData
  warnings: string[]
}

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
    if (words.length < 2 || words.length > 4) {
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

const parseTextToCandidateData = (rawText: string): ResumeParseResult => {
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

  const parsed: ParsedResumeData = {
    ...links,
    ...roleCompany,
    email: emailMatches[0] || undefined,
    fullName,
    notes: 'Auto-filled from resume parser. Please verify before saving.',
    phone: selectedPhone,
    totalExperienceYears: years,
  }

  return {
    extractedTextPreview: text.slice(0, 1200),
    parsed,
    warnings,
  }
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
  const fileExt = getFileExtension(filename)
  const lowerMime = mimeType.toLowerCase()

  if (lowerMime.includes('pdf') || fileExt === 'pdf') {
    const parser = new PDFParse({ data: buffer })
    try {
      const parsed = await parser.getText()
      return parseTextToCandidateData(parsed.text || '')
    } finally {
      await parser.destroy().catch(() => undefined)
    }
  }

  if (
    lowerMime.includes('officedocument.wordprocessingml.document') ||
    fileExt === 'docx'
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return parseTextToCandidateData(result.value || '')
  }

  if (lowerMime.includes('msword') || fileExt === 'doc') {
    return {
      extractedTextPreview: '',
      parsed: {},
      warnings: [
        'DOC files are supported for upload but parser works best with PDF or DOCX. Convert and retry for auto-fill.',
      ],
    }
  }

  throw new Error('Unsupported resume format for parsing. Use PDF, DOCX, or DOC.')
}
