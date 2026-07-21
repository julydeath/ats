import mammoth from 'mammoth'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Ollama } from 'ollama'
import { z } from 'zod'

export type ParsedResumeData = {
  additionalComments?: string
  address?: string
  alternateEmail?: string
  alternatePhone?: string
  applicantGroup?: string
  applicantStatus?: string
  city?: string
  clearance?: boolean
  country?: string
  currentCompany?: string
  currentLocation?: string
  currentRole?: string
  email?: string
  expectedPayCurrency?: string
  expectedPayMax?: number
  expectedPayMin?: number
  expectedPayType?: string
  expectedPayUnit?: string
  expectedSalary?: number
  facebookProfileURL?: string
  firstName?: string
  fullName?: string
  gpa?: string
  homePhone?: string
  jobTitle?: string
  lastName?: string
  linkedInURL?: string
  middleName?: string
  nationality?: string
  nickName?: string
  notes?: string
  noticePeriodDays?: number
  noticePeriodLabel?: string
  otherPhone?: string
  phone?: string
  portfolioURL?: string
  postalCode?: string
  prefix?: string
  primarySkills?: string
  referenceID?: string
  referredBy?: string
  relocation?: boolean
  skypeID?: string
  skills?: string
  sourceDetails?: string
  state?: string
  taxTerms?: string
  technology?: string
  totalExperienceMonths?: number
  totalExperienceYears?: number
  twitterProfileURL?: string
  videoReference?: string
  workAuthorization?: string
  workAuthorizationExpiry?: string
  workPhone?: string
}

export type ResumeParseResult = {
  extractedTextPreview: string
  parsed: ParsedResumeData
  warnings: string[]
}

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'https://ollama.com'
const OLLAMA_RESUME_MODEL = process.env.OLLAMA_RESUME_MODEL || 'qwen3.5:cloud'
const RESUME_TEXT_PROMPT_LIMIT = 16000
const PDF_STANDARD_FONT_URL = pathToFileURL(
  path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/'),
).toString()

const nullableStringSchema = z.string().nullable().optional()
const nullableNumberSchema = z.union([z.number(), z.string()]).nullable().optional()
const nullableBooleanSchema = z.union([z.boolean(), z.string()]).nullable().optional()
const nullableStringListSchema = z.union([z.string(), z.array(z.string())]).nullable().optional()

const ResumeLLMResponseSchema = z.object({
  additionalComments: nullableStringSchema,
  address: nullableStringSchema,
  alternateEmail: nullableStringSchema,
  alternatePhone: nullableStringSchema,
  applicantGroup: nullableStringSchema,
  applicantStatus: nullableStringSchema,
  city: nullableStringSchema,
  clearance: nullableBooleanSchema,
  country: nullableStringSchema,
  currentCompany: nullableStringSchema,
  currentDesignation: nullableStringSchema,
  currentLocation: nullableStringSchema,
  currentRole: nullableStringSchema,
  email: nullableStringSchema,
  expectedPayCurrency: nullableStringSchema,
  expectedPayMax: nullableNumberSchema,
  expectedPayMin: nullableNumberSchema,
  expectedPayType: nullableStringSchema,
  expectedPayUnit: nullableStringSchema,
  expectedSalary: nullableNumberSchema,
  facebookProfileURL: nullableStringSchema,
  firstName: nullableStringSchema,
  fullName: nullableStringSchema,
  gpa: nullableStringSchema,
  homePhone: nullableStringSchema,
  jobTitle: nullableStringSchema,
  keySkills: nullableStringListSchema,
  lastName: nullableStringSchema,
  linkedInURL: nullableStringSchema,
  location: nullableStringSchema,
  middleName: nullableStringSchema,
  mobile: nullableStringSchema,
  name: nullableStringSchema,
  nationality: nullableStringSchema,
  nickName: nullableStringSchema,
  notes: nullableStringSchema,
  noticePeriodDays: nullableNumberSchema,
  noticePeriodLabel: nullableStringSchema,
  otherPhone: nullableStringSchema,
  phone: nullableStringSchema,
  phoneNumber: nullableStringSchema,
  portfolioURL: nullableStringSchema,
  postalCode: nullableStringSchema,
  prefix: nullableStringSchema,
  primarySkills: nullableStringListSchema,
  referenceID: nullableStringSchema,
  referredBy: nullableStringSchema,
  relocation: nullableBooleanSchema,
  skypeID: nullableStringSchema,
  skills: nullableStringListSchema,
  sourceDetails: nullableStringSchema,
  state: nullableStringSchema,
  taxTerms: nullableStringSchema,
  technology: nullableStringSchema,
  technicalSkills: nullableStringListSchema,
  totalExperienceMonths: nullableNumberSchema,
  totalExperienceYears: nullableNumberSchema,
  twitterProfileURL: nullableStringSchema,
  videoReference: nullableStringSchema,
  workAuthorization: nullableStringSchema,
  workAuthorizationExpiry: nullableStringSchema,
  workPhone: nullableStringSchema,
})

const nullableStringJSONSchema = { anyOf: [{ type: 'string' }, { type: 'null' }] } as const
const nullableNumberJSONSchema = { anyOf: [{ type: 'number' }, { type: 'null' }] } as const
const nullableBooleanJSONSchema = { anyOf: [{ type: 'boolean' }, { type: 'null' }] } as const
const nullableStringListJSONSchema = {
  anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }],
} as const

const RESUME_LLM_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    additionalComments: nullableStringJSONSchema,
    address: nullableStringJSONSchema,
    alternateEmail: nullableStringJSONSchema,
    alternatePhone: nullableStringJSONSchema,
    applicantGroup: nullableStringJSONSchema,
    applicantStatus: nullableStringJSONSchema,
    city: nullableStringJSONSchema,
    clearance: nullableBooleanJSONSchema,
    country: nullableStringJSONSchema,
    currentCompany: nullableStringJSONSchema,
    currentDesignation: nullableStringJSONSchema,
    currentLocation: nullableStringJSONSchema,
    currentRole: nullableStringJSONSchema,
    email: nullableStringJSONSchema,
    expectedPayCurrency: nullableStringJSONSchema,
    expectedPayMax: nullableNumberJSONSchema,
    expectedPayMin: nullableNumberJSONSchema,
    expectedPayType: nullableStringJSONSchema,
    expectedPayUnit: nullableStringJSONSchema,
    expectedSalary: nullableNumberJSONSchema,
    facebookProfileURL: nullableStringJSONSchema,
    firstName: nullableStringJSONSchema,
    fullName: nullableStringJSONSchema,
    gpa: nullableStringJSONSchema,
    homePhone: nullableStringJSONSchema,
    jobTitle: nullableStringJSONSchema,
    keySkills: nullableStringListJSONSchema,
    lastName: nullableStringJSONSchema,
    linkedInURL: nullableStringJSONSchema,
    location: nullableStringJSONSchema,
    middleName: nullableStringJSONSchema,
    mobile: nullableStringJSONSchema,
    name: nullableStringJSONSchema,
    nationality: nullableStringJSONSchema,
    nickName: nullableStringJSONSchema,
    notes: nullableStringJSONSchema,
    noticePeriodDays: nullableNumberJSONSchema,
    noticePeriodLabel: nullableStringJSONSchema,
    otherPhone: nullableStringJSONSchema,
    phone: nullableStringJSONSchema,
    phoneNumber: nullableStringJSONSchema,
    portfolioURL: nullableStringJSONSchema,
    postalCode: nullableStringJSONSchema,
    prefix: nullableStringJSONSchema,
    primarySkills: nullableStringListJSONSchema,
    referenceID: nullableStringJSONSchema,
    referredBy: nullableStringJSONSchema,
    relocation: nullableBooleanJSONSchema,
    skypeID: nullableStringJSONSchema,
    skills: nullableStringListJSONSchema,
    sourceDetails: nullableStringJSONSchema,
    state: nullableStringJSONSchema,
    taxTerms: nullableStringJSONSchema,
    technology: nullableStringJSONSchema,
    technicalSkills: nullableStringListJSONSchema,
    totalExperienceMonths: nullableNumberJSONSchema,
    totalExperienceYears: nullableNumberJSONSchema,
    twitterProfileURL: nullableStringJSONSchema,
    videoReference: nullableStringJSONSchema,
    workAuthorization: nullableStringJSONSchema,
    workAuthorizationExpiry: nullableStringJSONSchema,
    workPhone: nullableStringJSONSchema,
  },
  required: [
    'additionalComments',
    'address',
    'alternateEmail',
    'alternatePhone',
    'applicantGroup',
    'applicantStatus',
    'city',
    'clearance',
    'country',
    'currentCompany',
    'currentLocation',
    'currentRole',
    'email',
    'expectedPayCurrency',
    'expectedPayMax',
    'expectedPayMin',
    'expectedPayType',
    'expectedPayUnit',
    'expectedSalary',
    'facebookProfileURL',
    'firstName',
    'fullName',
    'gpa',
    'homePhone',
    'jobTitle',
    'lastName',
    'linkedInURL',
    'middleName',
    'nationality',
    'nickName',
    'notes',
    'noticePeriodDays',
    'noticePeriodLabel',
    'otherPhone',
    'phone',
    'portfolioURL',
    'postalCode',
    'prefix',
    'primarySkills',
    'referenceID',
    'referredBy',
    'relocation',
    'skypeID',
    'skills',
    'sourceDetails',
    'state',
    'taxTerms',
    'technology',
    'totalExperienceMonths',
    'totalExperienceYears',
    'twitterProfileURL',
    'videoReference',
    'workAuthorization',
    'workAuthorizationExpiry',
    'workPhone',
  ],
} as const

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
  const lowered = normalized.toLowerCase()
  if (
    !normalized ||
    ['null', 'n/a', 'na', 'none', 'nil', 'unknown', 'not available', 'not specified'].includes(
      lowered,
    )
  ) {
    return undefined
  }

  return normalized
}

const normalizeEmail = (value: unknown): string | undefined => {
  const normalized = normalizeOptionalString(value)
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return undefined
  }

  return normalized
}

const normalizePhone = (value: unknown): string | undefined => {
  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return undefined
  }

  const cleaned = normalized.replace(/[^\d+]/g, '')
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) {
    return undefined
  }

  return cleaned.startsWith('+') ? cleaned : cleaned.replace(/^0+/, '')
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

const normalizeNumberValue = (
  value: unknown,
  options: { max?: number; min?: number; precision?: number } = {},
): number | undefined => {
  const { max, min = 0, precision = 0 } = options
  let numeric: number | undefined

  if (typeof value === 'number') {
    numeric = value
  } else if (typeof value === 'string') {
    const normalized = normalizeOptionalString(value)

    if (!normalized) {
      return undefined
    }

    const match = normalized.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
    if (!match) {
      return undefined
    }

    numeric = Number(match[0])

    if (/lpa|lakhs?|lacs?/i.test(normalized)) {
      numeric *= 100000
    } else if (/crores?|cr\b/i.test(normalized)) {
      numeric *= 10000000
    } else if (/\bk\b/i.test(normalized)) {
      numeric *= 1000
    }
  }

  if (numeric === undefined || !Number.isFinite(numeric) || numeric < min) {
    return undefined
  }

  if (max !== undefined && numeric > max) {
    return undefined
  }

  const factor = 10 ** precision
  return Math.round(numeric * factor) / factor
}

const normalizeBooleanValue = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value
  }

  const normalized = normalizeOptionalString(value)?.toLowerCase()
  if (!normalized) {
    return undefined
  }

  if (/^(true|yes|y|available|willing|open|authorized|active)$/i.test(normalized)) {
    return true
  }

  if (/^(false|no|n|not available|not willing|not open|unauthorized|inactive)$/i.test(normalized)) {
    return false
  }

  return undefined
}

const normalizeDateValue = (value: unknown): string | undefined => {
  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return undefined
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }

  const slashDate = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (slashDate) {
    const [, first, second, year] = slashDate
    const day = first.padStart(2, '0')
    const month = second.padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed.toISOString().slice(0, 10)
}

const normalizeExperienceYears = (value: unknown): number | undefined => {
  return normalizeNumberValue(value, { max: 50, min: 0, precision: 1 })
}

const selectBestPhone = (phones: string[]): string | undefined => {
  if (phones.length === 0) {
    return undefined
  }

  const cleaned = phones.map(normalizePhone).filter((phone): phone is string => Boolean(phone))

  return cleaned[0] || undefined
}

const selectBestPhones = (phones: string[]): string[] =>
  Array.from(new Set(phones.map(normalizePhone).filter((phone): phone is string => Boolean(phone))))

const splitNameParts = (
  fullName?: string,
): Pick<ParsedResumeData, 'firstName' | 'lastName' | 'middleName' | 'prefix'> => {
  if (!fullName) {
    return {}
  }

  const prefixMatch = fullName.match(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i)
  const prefix = prefixMatch?.[1]
  const nameWithoutPrefix = fullName.replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, '').trim()
  const parts = nameWithoutPrefix.split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return prefix ? { prefix } : {}
  }

  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts[parts.length - 1] : undefined,
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : undefined,
    prefix,
  }
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildLoosePattern = (value: string): string =>
  escapeRegex(value).replace(/\\ /g, '\\s+').replace(/\\-/g, '[-\\s]?')

const FIELD_BOUNDARY_LABELS = [
  'address',
  'availability',
  'candidate name',
  'city',
  'company',
  'contact',
  'country',
  'current company',
  'current location',
  'current role',
  'designation',
  'desired compensation',
  'desired pay',
  'desired salary',
  'email',
  'e-mail',
  'employer',
  'expected compensation',
  'expected ctc',
  'expected pay',
  'expected salary',
  'experience',
  'full name',
  'github',
  'job title',
  'key skills',
  'linked in',
  'linkedin',
  'location',
  'mobile',
  'name',
  'notice period',
  'organization',
  'phone',
  'portfolio',
  'position',
  'primary skills',
  'role',
  'skills',
  'state',
  'tech stack',
  'technical skills',
  'technologies',
  'technology',
  'title',
  'tools',
  'total experience',
  'visa status',
  'work authorization',
].sort((a, b) => b.length - a.length)

const SECTION_BOUNDARY_LABELS = [
  'achievements',
  'certifications',
  'education',
  'employment',
  'experience',
  'objective',
  'professional experience',
  'professional summary',
  'projects',
  'summary',
  'work experience',
]

const FIELD_BOUNDARY_PATTERN = FIELD_BOUNDARY_LABELS.map(buildLoosePattern).join('|')
const SECTION_BOUNDARY_PATTERN = SECTION_BOUNDARY_LABELS.map(buildLoosePattern).join('|')

const cleanExtractedValue = (value: string, maxLength = 180): string | undefined => {
  const cleaned = normalizeWhitespace(value)
    .replace(/^[\s:|/\\-]+/, '')
    .replace(/\s+(?:\||•|·|-)\s*$/, '')
    .replace(/[.;,\s]+$/, '')
    .slice(0, maxLength)
    .trim()

  return normalizeOptionalString(cleaned)
}

const extractLabeledValue = (
  text: string,
  labels: string[],
  options: { maxLength?: number } = {},
): string | undefined => {
  const maxLength = options.maxLength || 180
  const normalizedText = normalizeWhitespace(text).replace(/\n/g, ' ')
  const labelPattern = labels.map(buildLoosePattern).join('|')
  const boundary = `(?=\\s+(?:${FIELD_BOUNDARY_PATTERN})\\s*[:\\-]|\\s+(?:${SECTION_BOUNDARY_PATTERN})\\b|$)`
  const pattern = new RegExp(
    `\\b(?:${labelPattern})\\s*[:\\-]\\s*([\\s\\S]{1,${maxLength}}?)${boundary}`,
    'i',
  )
  const match = pattern.exec(normalizedText)

  return cleanExtractedValue(match?.[1] || '', maxLength)
}

const NAME_REJECT_WORDS = new Set(
  [
    'address',
    'analyst',
    'architect',
    'backend',
    'candidate',
    'contact',
    'curriculum',
    'developer',
    'devops',
    'education',
    'email',
    'engineer',
    'experience',
    'frontend',
    'fullstack',
    'generated',
    'github',
    'hr',
    'lead',
    'linkedin',
    'location',
    'manager',
    'mobile',
    'phone',
    'portfolio',
    'principal',
    'profile',
    'project',
    'resume',
    'seed',
    'senior',
    'skills',
    'software',
    'summary',
    'technical',
    'technology',
    'testing',
    'vitae',
  ].map((word) => word.toLowerCase()),
)

const looksLikeNameWord = (word: string): boolean => {
  const normalized = word.replace(/[.'-]/g, '')
  return /^[A-Z][A-Za-z]{1,}$/.test(normalized) && !NAME_REJECT_WORDS.has(normalized.toLowerCase())
}

const extractLikelyNameFromText = (value: string): string | undefined => {
  const withoutContactData = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ' ')
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, ' ')
    .replace(/(?:\+?\d[\d\s().-]{8,}\d)/g, ' ')
    .replace(/^(?:resume|curriculum\s+vitae|cv|candidate\s+profile|profile)\b\s*[:\-]?\s*/i, '')

  const words = withoutContactData.split(/\s+/).filter(Boolean)

  for (let start = 0; start < Math.min(words.length, 16); start += 1) {
    const candidateWords: string[] = []

    for (let index = start; index < Math.min(words.length, start + 5); index += 1) {
      const word = words[index]?.replace(/^[^A-Za-z]+|[^A-Za-z.'-]+$/g, '') || ''

      if (!looksLikeNameWord(word)) {
        break
      }

      candidateWords.push(word)
    }

    if (candidateWords.length >= 2) {
      return candidateWords.join(' ')
    }
  }

  return undefined
}

const KNOWN_LOCATIONS = [
  'Ahmedabad',
  'Bangalore',
  'Bengaluru',
  'Chennai',
  'Coimbatore',
  'Delhi',
  'Gurgaon',
  'Gurugram',
  'Hyderabad',
  'Kochi',
  'Kolkata',
  'Mumbai',
  'Noida',
  'Pune',
  'Trivandrum',
  'Visakhapatnam',
  'Vijayawada',
  'India',
  'United States',
  'USA',
  'UAE',
  'Dubai',
  'Singapore',
  'London',
  'New York',
  'California',
  'Texas',
]

const inferKnownLocation = (text: string): string | undefined =>
  KNOWN_LOCATIONS.find((location) => new RegExp(`\\b${escapeRegex(location)}\\b`, 'i').test(text))

const parseLocationValue = (
  value: string,
  label = 'location',
): Pick<ParsedResumeData, 'address' | 'city' | 'country' | 'currentLocation' | 'postalCode' | 'state'> => {
  const normalizedValue = cleanExtractedValue(value, 220)

  if (!normalizedValue) {
    return {}
  }

  const postalCode = normalizedValue.match(/\b\d{5,6}(?:-\d{4})?\b/)?.[0]
  const parts = normalizedValue
    .replace(/\b\d{5,6}(?:-\d{4})?\b/g, '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const isAddress = label.includes('address')
  const currentLocation = isAddress ? undefined : normalizedValue
  const inferredCity = inferKnownLocation(parts[0] || normalizedValue)
  const city = label === 'city' ? normalizedValue : inferredCity || parts[0]
  const country = parts.length > 1 ? parts[parts.length - 1] : undefined
  const state = parts.length > 2 ? parts[parts.length - 2] : undefined

  return {
    address: isAddress ? normalizedValue : undefined,
    city,
    country,
    currentLocation,
    postalCode,
    state,
  }
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
  const labeledName = extractLabeledValue(text, ['full name', 'candidate name', 'name'], {
    maxLength: 96,
  })
  const labeledNameCandidate = labeledName ? extractLikelyNameFromText(labeledName) : undefined

  if (labeledNameCandidate) {
    return labeledNameCandidate
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (const line of lines.slice(0, 12)) {
    const cleanedLine = line
      .replace(/^(?:resume|curriculum\s+vitae|cv|candidate\s+profile|profile)\b\s*[:\-]?\s*/i, '')
      .replace(/^(?:full\s+name|candidate\s+name|name)\s*[:\-]\s*/i, '')
      .trim()

    if (cleanedLine.length < 4 || cleanedLine.length > 96) {
      continue
    }

    if (cleanedLine.includes('@') || /\d/.test(cleanedLine) || /^resume$/i.test(cleanedLine)) {
      continue
    }

    const words = cleanedLine.split(/\s+/)
    if (words.length < 2 || words.length > 5) {
      continue
    }

    if (!words.every((word) => looksLikeNameWord(word))) {
      continue
    }

    return words.join(' ')
  }

  const firstContactIndex = [
    text.search(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i),
    text.search(/(?:\+?\d[\d\s().-]{8,}\d)/),
    text.search(/\b(?:linkedin|github|portfolio|location|email|phone|mobile)\b/i),
  ]
    .filter((index) => index > 0)
    .sort((a, b) => a - b)[0]

  const introText = text.slice(0, firstContactIndex || 500)
  return extractLikelyNameFromText(introText)
}

const parseRoleCompany = (text: string): { currentCompany?: string; currentRole?: string } => {
  const labeledRole = extractLabeledValue(
    text,
    ['current role', 'role', 'position', 'designation', 'job title'],
    { maxLength: 120 },
  )
  const labeledCompany = extractLabeledValue(text, ['current company', 'company', 'organization', 'employer'], {
    maxLength: 140,
  })

  if (labeledRole || labeledCompany) {
    return {
      currentCompany: labeledCompany,
      currentRole: labeledRole,
    }
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const roleKeyRegex = /^(?:current\s+role|role|position|designation)\s*[:\-]\s*(.+)$/i
  const companyKeyRegex = /^(?:current\s+company|company|organization)\s*[:\-]\s*(.+)$/i
  let currentCompany: string | undefined
  let currentRole: string | undefined

  for (const line of lines) {
    const roleMatch = roleKeyRegex.exec(line)
    if (roleMatch?.[1] && !currentRole) {
      currentRole = roleMatch[1].trim()
    }
    const companyMatch = companyKeyRegex.exec(line)
    if (companyMatch?.[1] && !currentCompany) {
      currentCompany = companyMatch[1].trim()
    }
  }

  if (currentRole || currentCompany) {
    return { currentCompany, currentRole }
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

const inferURLs = (
  text: string,
): Pick<
  ParsedResumeData,
  'facebookProfileURL' | 'linkedInURL' | 'portfolioURL' | 'twitterProfileURL' | 'videoReference'
> => {
  const urlMatches =
    text.match(
      /\b(?:(?:https?:\/\/|www\.)[^\s<>()]+|(?:linkedin|github|gitlab|bitbucket|behance|dribbble|medium|facebook|twitter|youtube|youtu|loom)\.[^\s<>()]+|(?:x\.com|[a-z0-9][a-z0-9.-]+\.(?:dev|io|me|ai|app|in)\/)[^\s<>()]*)/gi,
    ) || []
  const normalizedURLs = Array.from(
    new Set(
      urlMatches
        .map((url) => url.replace(/[),.;]+$/g, ''))
        .map((url) => (url.startsWith('http') ? url : `https://${url}`)),
    ),
  )

  const linkedInURL = normalizedURLs.find((url) => /linkedin\.com/i.test(url))
  const facebookProfileURL = normalizedURLs.find((url) => /facebook\.com/i.test(url))
  const twitterProfileURL = normalizedURLs.find((url) => /(?:twitter\.com|x\.com)/i.test(url))
  const videoReference = normalizedURLs.find((url) => /(?:youtube\.com|youtu\.be|loom\.com)/i.test(url))
  const portfolioURL = normalizedURLs.find(
    (url) => !/(?:linkedin|facebook|twitter|x\.com|youtube|youtu\.be|loom)\./i.test(url),
  )

  return { facebookProfileURL, linkedInURL, portfolioURL, twitterProfileURL, videoReference }
}

const parseLocation = (
  text: string,
): Pick<ParsedResumeData, 'address' | 'city' | 'country' | 'currentLocation' | 'postalCode' | 'state'> => {
  const labeledLocation = extractLabeledValue(text, ['current location', 'location', 'address', 'city'], {
    maxLength: 220,
  })

  if (labeledLocation) {
    const labelMatch = text.match(/\b(current\s+location|location|address|city)\s*[:\-]/i)
    return parseLocationValue(labeledLocation, labelMatch?.[1]?.toLowerCase() || 'location')
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const locationLine = lines.find((line) =>
    /^(?:current\s+location|location|address|city)\s*[:\-]/i.test(line),
  )

  if (!locationLine) {
    const knownLocation = inferKnownLocation(text.slice(0, 1200))
    return knownLocation ? { city: knownLocation, currentLocation: knownLocation } : {}
  }

  const label = locationLine.split(/[:\-]/)[0]?.trim().toLowerCase() || ''
  const value = normalizeOptionalString(locationLine.replace(/^[^:\-]+[:\-]\s*/i, ''))

  if (!value) {
    return {}
  }

  return parseLocationValue(value, label)
}

const parseDelimitedList = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/[,;|•·\n]/g)
        .map((item) => item.replace(/^[-*]\s*/, '').trim())
        .filter((item) => item.length > 1 && item.length <= 40)
        .filter((item) => !/^(and|or|tools|skills|technologies)$/i.test(item)),
    ),
  )

const KNOWN_SKILLS = [
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'Terraform',
  'Jenkins',
  'GitHub Actions',
  'GitLab CI',
  'CI/CD',
  'Git',
  'Linux',
  'Bash',
  'Shell',
  'HTML',
  'CSS',
  'Sass',
  'Tailwind CSS',
  'Bootstrap',
  'Material UI',
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Redux',
  'Zustand',
  'Angular',
  'Vue',
  'Svelte',
  'Node.js',
  'Express',
  'NestJS',
  'Java',
  'Spring Boot',
  'Python',
  'Django',
  'Flask',
  'FastAPI',
  'PHP',
  'Laravel',
  'Ruby',
  'Rails',
  'Go',
  'Golang',
  'C#',
  '.NET',
  'C++',
  'SQL',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Elasticsearch',
  'GraphQL',
  'REST',
  'Kafka',
  'RabbitMQ',
  'Microservices',
  'React Native',
  'Flutter',
  'Android',
  'iOS',
  'Swift',
  'Kotlin',
  'Figma',
  'Selenium',
  'Cypress',
  'Playwright',
  'Jest',
  'Vitest',
  'JUnit',
  'Pytest',
  'Spark',
  'Hadoop',
  'Airflow',
  'Tableau',
  'Power BI',
  'Excel',
  'Pandas',
  'NumPy',
  'TensorFlow',
  'PyTorch',
  'Machine Learning',
  'Data Science',
]

const buildSkillRegex = (skill: string): RegExp => {
  const pattern = escapeRegex(skill)
    .replace(/\\ /g, '[-\\s]+')
    .replace(/\\\./g, '[.\\s]?')
    .replace(/\\\+/g, '\\+')
    .replace(/#/g, '#')

  return new RegExp(`(^|[^A-Za-z0-9+#.])${pattern}(?=$|[^A-Za-z0-9+#.])`, 'i')
}

const inferKnownSkills = (text: string): string[] =>
  KNOWN_SKILLS.filter((skill) => buildSkillRegex(skill).test(text))

const parseSkills = (
  text: string,
): Pick<ParsedResumeData, 'applicantGroup' | 'primarySkills' | 'skills' | 'technology'> => {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const skillLines: string[] = []
  const inlineSkillRegex =
    /^(?:technical\s+skills|key\s+skills|skills|technologies|technology|tech\s+stack|tools|languages|frameworks)\s*[:\-]\s*(.+)$/i
  const labeledSkills = extractLabeledValue(
    text,
    ['technical skills', 'key skills', 'primary skills', 'skills', 'technologies', 'technology', 'tech stack', 'tools'],
    { maxLength: 900 },
  )

  if (labeledSkills) {
    skillLines.push(labeledSkills)
  }

  lines.forEach((line, index) => {
    const inlineMatch = inlineSkillRegex.exec(line)
    if (inlineMatch?.[1]) {
      skillLines.push(inlineMatch[1])
      return
    }

    if (/^(?:technical\s+skills|key\s+skills|skills|technologies|tech\s+stack)$/i.test(line)) {
      skillLines.push(...lines.slice(index + 1, index + 4))
    }
  })

  const skillList = Array.from(
    new Set([...parseDelimitedList(skillLines.join('\n')), ...inferKnownSkills(text)]),
  ).slice(0, 30)
  const lowerText = text.toLowerCase()
  let applicantGroup: string | undefined

  if (/full[-\s]?stack/.test(lowerText)) {
    applicantGroup = 'Full Stack'
  } else if (/\b(react|angular|vue|frontend|front-end|ui developer)\b/.test(lowerText)) {
    applicantGroup = 'Frontend'
  } else if (/\b(node|java|spring|python|django|backend|back-end|api)\b/.test(lowerText)) {
    applicantGroup = 'Backend'
  } else if (/\b(data scientist|machine learning|ml engineer|data engineer|analytics)\b/.test(lowerText)) {
    applicantGroup = 'Data'
  } else if (/\b(qa|quality analyst|automation tester|selenium)\b/.test(lowerText)) {
    applicantGroup = 'QA'
  }

  return {
    applicantGroup,
    primarySkills: skillList.slice(0, 6).join(', ') || undefined,
    skills: skillList.join(', ') || undefined,
    technology: skillList.slice(0, 8).join(', ') || undefined,
  }
}

const parseExperience = (
  text: string,
): Pick<ParsedResumeData, 'totalExperienceMonths' | 'totalExperienceYears'> => {
  const years = parseYears(text)
  const monthPatterns = [
    /(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:and\s*)?(\d{1,2})\s*(?:months?|mos?)/i,
    /experience\s*[:\-]?\s*\d{1,2}\+?\s*(?:years?|yrs?)\s*(?:and\s*)?(\d{1,2})\s*(?:months?|mos?)/i,
    /(\d{1,2})\s*(?:months?|mos?)\s*(?:of\s*)?(?:experience|exp)/i,
  ]

  for (const pattern of monthPatterns) {
    const match = pattern.exec(text)
    const value = match?.[2] || match?.[1]
    const months = normalizeNumberValue(value, { max: 11, min: 0 })
    if (months !== undefined) {
      return { totalExperienceMonths: months, totalExperienceYears: years }
    }
  }

  return { totalExperienceYears: years }
}

const parseNoticePeriod = (
  text: string,
): Pick<ParsedResumeData, 'noticePeriodDays' | 'noticePeriodLabel'> => {
  const match = text.match(/(?:notice\s+period|availability|available\s+from)\s*[:\-]?\s*([^\n.;]+)/i)
  const value =
    extractLabeledValue(text, ['notice period', 'availability', 'available from'], { maxLength: 80 }) ||
    normalizeOptionalString(match?.[1])

  if (!value) {
    return {}
  }

  if (/immediate|currently available|available now/i.test(value)) {
    return { noticePeriodDays: 0, noticePeriodLabel: 'Immediate' }
  }

  const dayMatch = value.match(/(\d{1,3})\s*(?:days?|d)\b/i)
  if (dayMatch?.[1]) {
    const days = normalizeNumberValue(dayMatch[1], { max: 365, min: 0 })
    return { noticePeriodDays: days, noticePeriodLabel: value }
  }

  const monthMatch = value.match(/(\d{1,2})\s*(?:months?|mos?)\b/i)
  if (monthMatch?.[1]) {
    const months = normalizeNumberValue(monthMatch[1], { max: 12, min: 0 })
    return {
      noticePeriodDays: months !== undefined ? months * 30 : undefined,
      noticePeriodLabel: value,
    }
  }

  return { noticePeriodLabel: value }
}

const parseExpectedPay = (
  text: string,
): Pick<
  ParsedResumeData,
  'expectedPayCurrency' | 'expectedPayMax' | 'expectedPayMin' | 'expectedPayType' | 'expectedPayUnit' | 'expectedSalary'
> => {
  const labeledExpectedPay = extractLabeledValue(
    text,
    ['expected salary', 'expected ctc', 'expected pay', 'desired salary', 'desired pay', 'desired compensation'],
    { maxLength: 120 },
  )
  const line = text
    .split('\n')
    .map((item) => item.trim())
    .find((item) =>
      /(?:expected|desired).{0,30}(?:salary|ctc|compensation|pay)|\bectc\b/i.test(item),
    )
  const payText = labeledExpectedPay || line

  if (!payText) {
    return {}
  }

  const rangeMatch = payText
    .replace(/,/g, '')
    .match(
      /(?:₹|rs\.?|inr|usd|\$)?\s*(\d+(?:\.\d+)?)\s*(lpa|lakhs?|lacs?|crores?|cr\b|k|pa|per annum|yearly|monthly|pm|per month|hourly|per hour)?(?:\s*(?:-|to|–)\s*(?:₹|rs\.?|inr|usd|\$)?\s*(\d+(?:\.\d+)?)\s*(lpa|lakhs?|lacs?|crores?|cr\b|k|pa|per annum|yearly|monthly|pm|per month|hourly|per hour)?)?/i,
    )

  if (!rangeMatch?.[1]) {
    return {}
  }

  const unit = rangeMatch[2] || rangeMatch[4] || ''
  const min = normalizeNumberValue(`${rangeMatch[1]} ${unit}`)
  const max = normalizeNumberValue(rangeMatch[3] ? `${rangeMatch[3]} ${unit}` : undefined)
  const isINR = /₹|rs\.?|inr|lpa|lakhs?|lacs?|crores?|cr\b/i.test(payText)
  const isUSD = /usd|\$/i.test(payText)
  const isMonthly = /monthly|pm|per month/i.test(unit)
  const isHourly = /hourly|per hour/i.test(unit)

  return {
    expectedPayCurrency: isINR ? 'INR' : isUSD ? 'USD' : undefined,
    expectedPayMax: max,
    expectedPayMin: min,
    expectedPayType: 'Salary',
    expectedPayUnit: isHourly ? 'Per hour' : isMonthly ? 'Per month' : 'Per annum',
    expectedSalary: min,
  }
}

const parseRecruiterFields = (
  text: string,
): Pick<
  ParsedResumeData,
  | 'clearance'
  | 'gpa'
  | 'nationality'
  | 'referenceID'
  | 'relocation'
  | 'skypeID'
  | 'taxTerms'
  | 'workAuthorization'
  | 'workAuthorizationExpiry'
> => {
  const lineLabeledValue = (regex: RegExp): string | undefined => {
    const line = text
      .split('\n')
      .map((item) => item.trim())
      .find((item) => regex.test(item))

    return normalizeOptionalString(line?.replace(/^[^:\-]+[:\-]\s*/i, ''))
  }

  const labeledValue = (labels: string[], fallbackRegex: RegExp, maxLength = 120): string | undefined =>
    extractLabeledValue(text, labels, { maxLength }) || lineLabeledValue(fallbackRegex)

  const gpaMatch = text.match(/\b(?:GPA|CGPA)\s*[:\-]?\s*([0-9.]+(?:\s*\/\s*[0-9.]+)?)/i)
  const relocationLine = labeledValue(['relocation', 'open to relocation'], /relocat/i, 40)
  const clearanceLine = labeledValue(['security clearance', 'clearance'], /security\s+clearance|clearance/i, 40)
  const workAuthorization = labeledValue(['work authorization', 'visa status', 'visa'], /work\s+authorization|visa\s+status|visa/i)
  const workAuthorizationExpiry = normalizeDateValue(
    labeledValue(
      ['work authorization expiry', 'visa expiry', 'visa expiration', 'valid until'],
      /(?:work\s+authorization|visa).{0,20}(?:expiry|expiration|valid\s+until)/i,
    ),
  )

  return {
    clearance: normalizeBooleanValue(clearanceLine),
    gpa: normalizeOptionalString(gpaMatch?.[1]),
    nationality: labeledValue(['nationality'], /^nationality\s*[:\-]/i, 80),
    referenceID: labeledValue(['reference id', 'candidate id', 'profile id'], /^(?:reference|candidate|profile)\s+id\s*[:\-]/i, 80),
    relocation: normalizeBooleanValue(relocationLine),
    skypeID: labeledValue(['skype id', 'skype'], /^skype\s*(?:id)?\s*[:\-]/i, 80),
    taxTerms: text.match(/\b(W2|C2C|1099|Corp[-\s]?to[-\s]?Corp)\b/i)?.[1],
    workAuthorization,
    workAuthorizationExpiry,
  }
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
  const fullName = parseName(text)
  const nameParts = splitNameParts(fullName)
  const roleCompany = parseRoleCompany(text)
  const links = inferURLs(text)
  const location = parseLocation(text)
  const skills = parseSkills(text)
  const experience = parseExperience(text)
  const noticePeriod = parseNoticePeriod(text)
  const expectedPay = parseExpectedPay(text)
  const recruiterFields = parseRecruiterFields(text)
  const selectedPhones = selectBestPhones(phoneMatches)

  if (!fullName) {
    warnings.push('Could not confidently detect full name. Please review manually.')
  }

  if (!emailMatches[0]) {
    warnings.push('No email found in resume text.')
  }

  const selectedPhone = selectedPhones[0] || selectBestPhone(phoneMatches)
  if (!selectedPhone) {
    warnings.push('No valid phone number detected.')
  }

  if (experience.totalExperienceYears === undefined) {
    warnings.push('Experience years were not clearly detected.')
  }

  return {
    extractedTextPreview: text.slice(0, 1200),
    parsed: {
      ...links,
      ...location,
      ...skills,
      ...experience,
      ...noticePeriod,
      ...expectedPay,
      ...recruiterFields,
      ...nameParts,
      ...roleCompany,
      alternateEmail: emailMatches[1] || undefined,
      alternatePhone: selectedPhones[1],
      email: emailMatches[0] || undefined,
      fullName,
      notes: 'Auto-filled from resume parser. Please verify before saving.',
      phone: selectedPhone,
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
): ParsedResumeData => {
  const fullName = normalizeOptionalString(payload.fullName) || normalizeOptionalString(payload.name)
  const nameParts = splitNameParts(fullName)
  const skills =
    normalizeStringList(payload.skills) ||
    normalizeStringList(payload.technicalSkills) ||
    normalizeStringList(payload.keySkills)
  const primarySkills =
    normalizeStringList(payload.primarySkills) ||
    normalizeStringList(payload.keySkills) ||
    normalizeStringList(payload.technicalSkills)

  return {
    additionalComments: normalizeOptionalString(payload.additionalComments),
    address: normalizeOptionalString(payload.address),
    alternateEmail: normalizeEmail(payload.alternateEmail),
    alternatePhone: normalizePhone(payload.alternatePhone),
    applicantGroup: normalizeOptionalString(payload.applicantGroup),
    applicantStatus: normalizeOptionalString(payload.applicantStatus),
    city: normalizeOptionalString(payload.city),
    clearance: normalizeBooleanValue(payload.clearance),
    country: normalizeOptionalString(payload.country),
    currentCompany: normalizeOptionalString(payload.currentCompany),
    currentLocation: normalizeOptionalString(payload.currentLocation) || normalizeOptionalString(payload.location),
    currentRole: normalizeOptionalString(payload.currentRole) || normalizeOptionalString(payload.currentDesignation),
    email: normalizeEmail(payload.email),
    expectedPayCurrency: normalizeOptionalString(payload.expectedPayCurrency)?.toUpperCase(),
    expectedPayMax: normalizeNumberValue(payload.expectedPayMax),
    expectedPayMin: normalizeNumberValue(payload.expectedPayMin),
    expectedPayType: normalizeOptionalString(payload.expectedPayType),
    expectedPayUnit: normalizeOptionalString(payload.expectedPayUnit),
    expectedSalary: normalizeNumberValue(payload.expectedSalary),
    facebookProfileURL: normalizeURL(payload.facebookProfileURL),
    firstName: normalizeOptionalString(payload.firstName) || nameParts.firstName,
    fullName,
    gpa: normalizeOptionalString(payload.gpa),
    homePhone: normalizePhone(payload.homePhone),
    jobTitle: normalizeOptionalString(payload.jobTitle) || normalizeOptionalString(payload.currentDesignation),
    lastName: normalizeOptionalString(payload.lastName) || nameParts.lastName,
    linkedInURL: normalizeURL(payload.linkedInURL),
    middleName: normalizeOptionalString(payload.middleName) || nameParts.middleName,
    nationality: normalizeOptionalString(payload.nationality),
    nickName: normalizeOptionalString(payload.nickName),
    notes: normalizeOptionalString(payload.notes),
    noticePeriodDays: normalizeNumberValue(payload.noticePeriodDays, { max: 365, min: 0 }),
    noticePeriodLabel: normalizeOptionalString(payload.noticePeriodLabel),
    otherPhone: normalizePhone(payload.otherPhone),
    phone: normalizePhone(payload.phone) || normalizePhone(payload.mobile) || normalizePhone(payload.phoneNumber),
    portfolioURL: normalizeURL(payload.portfolioURL),
    postalCode: normalizeOptionalString(payload.postalCode),
    prefix: normalizeOptionalString(payload.prefix) || nameParts.prefix,
    primarySkills,
    referenceID: normalizeOptionalString(payload.referenceID),
    referredBy: normalizeOptionalString(payload.referredBy),
    relocation: normalizeBooleanValue(payload.relocation),
    skypeID: normalizeOptionalString(payload.skypeID),
    skills,
    sourceDetails: normalizeOptionalString(payload.sourceDetails),
    state: normalizeOptionalString(payload.state),
    taxTerms: normalizeOptionalString(payload.taxTerms),
    technology: normalizeOptionalString(payload.technology) || skills,
    totalExperienceMonths: normalizeNumberValue(payload.totalExperienceMonths, { max: 11, min: 0 }),
    totalExperienceYears: normalizeExperienceYears(payload.totalExperienceYears),
    twitterProfileURL: normalizeURL(payload.twitterProfileURL),
    videoReference: normalizeURL(payload.videoReference),
    workAuthorization: normalizeOptionalString(payload.workAuthorization),
    workAuthorizationExpiry: normalizeDateValue(payload.workAuthorizationExpiry),
    workPhone: normalizePhone(payload.workPhone),
  }
}

const extractStructuredResumeDataWithLLM = async (
  extractedText: string,
): Promise<ParsedResumeData> => {
  const isOllamaCloudHost = /^https:\/\/(?:www\.)?ollama\.com/i.test(OLLAMA_HOST)
  if (isOllamaCloudHost && !process.env.OLLAMA_API_KEY) {
    throw new Error('OLLAMA_API_KEY is not configured.')
  }

  const ollama = new Ollama({ host: OLLAMA_HOST })
  const prompt = [
    'You are an ATS resume extraction service for a candidate intake form.',
    'Extract only explicit facts stated in the resume text. Do not guess missing values.',
    'Return exactly one JSON object that matches the provided schema. No markdown.',
    'Use null for fields that are not clearly available.',
    'Do not extract Aadhaar, national ID numbers, gender, race, religion, marital status, disability status, veteran status, date of birth, or health details.',
    'Rules:',
    '- Name fields: split fullName into prefix, firstName, middleName, and lastName when possible.',
    '- `skills` and `primarySkills` must be arrays of short strings, not a paragraph.',
    '- `technology` should be a short stack/domain summary, e.g. React, Node.js, PostgreSQL.',
    '- `totalExperienceYears`, `totalExperienceMonths`, `noticePeriodDays`, and pay fields must be numbers when clear.',
    '- If notice period is immediate/currently available, set noticePeriodDays to 0 and noticePeriodLabel to "Immediate".',
    '- For salary/pay, convert LPA/lakh/lac/crore amounts to numeric annual values, set expectedPayCurrency, expectedPayType, and expectedPayUnit when stated.',
    '- Convert date fields to YYYY-MM-DD only when a date is clearly stated.',
    '- Nationality may be returned only when the resume explicitly labels it as nationality; never infer it from name, city, or country.',
    '- `notes` must be a brief recruiter summary based only on resume facts.',
    '',
    '<json_schema>',
    JSON.stringify(RESUME_LLM_JSON_SCHEMA),
    '</json_schema>',
    '',
    '<resume_text>',
    extractedText.slice(0, RESUME_TEXT_PROMPT_LIMIT),
    '</resume_text>',
  ].join('\n')

  const response = await ollama.chat({
    model: OLLAMA_RESUME_MODEL,
    stream: false,
    format: RESUME_LLM_JSON_SCHEMA,
    think: false,
    messages: [
      {
        role: 'system',
        content:
          'Extract structured resume facts for an ATS. Respond only with JSON that matches the schema.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    options: {
      num_ctx: 32768,
      temperature: 0,
    },
  })

  const rawContent = response.message?.content || ''
  const parsedJSON = JSON.parse(extractJSONObject(rawContent))
  if (
    parsedJSON &&
    typeof parsedJSON === 'object' &&
    'error' in parsedJSON &&
    typeof parsedJSON.error === 'string'
  ) {
    throw new Error(parsedJSON.error)
  }

  return normalizeLLMParsedData(ResumeLLMResponseSchema.parse(parsedJSON))
}

const mergeParsedData = (base: ParsedResumeData, override: ParsedResumeData): ParsedResumeData => {
  const hasValue = (value: unknown): boolean => {
    if (typeof value === 'string') {
      return value.trim().length > 0
    }

    return value !== undefined && value !== null
  }

  const merged: ParsedResumeData = { ...base }
  Object.entries(override).forEach(([key, value]) => {
    if (hasValue(value)) {
      merged[key as keyof ParsedResumeData] = value as never
    }
  })

  return Object.fromEntries(Object.entries(merged).filter(([, value]) => hasValue(value))) as ParsedResumeData
}

const loadPDFJS = async (): Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> => {
  const pdfJS = await import('pdfjs-dist/legacy/build/pdf.mjs')

  // In Next's server bundle, pdf.js otherwise guesses a relative
  // `./pdf.worker.mjs` path inside `.next/server/vendor-chunks`, where the
  // worker file does not exist. Loading the worker module registers
  // `globalThis.pdfjsWorker`, so pdf.js can run its Node fake-worker path.
  await import('pdfjs-dist/legacy/build/pdf.worker.mjs')

  return pdfJS
}

type PDFTextItemLike = {
  hasEOL?: boolean
  str?: string
  transform?: number[]
}

const getPDFTextItem = (item: unknown): PDFTextItemLike | null => {
  if (typeof item !== 'object' || item === null || !('str' in item)) {
    return null
  }

  const textItem = item as PDFTextItemLike
  if (!normalizeOptionalString(textItem.str)) {
    return null
  }

  return textItem
}

const buildPDFPageText = (items: unknown[]): string => {
  const textItems = items.map(getPDFTextItem).filter((item): item is PDFTextItemLike => Boolean(item))
  const positionedItems = textItems
    .map((item, index) => {
      const transform = Array.isArray(item.transform) ? item.transform : []
      const x = Number(transform[4])
      const y = Number(transform[5])

      return {
        hasEOL: item.hasEOL === true,
        index,
        text: normalizeOptionalString(item.str) || '',
        x: Number.isFinite(x) ? x : null,
        y: Number.isFinite(y) ? y : null,
      }
    })
    .filter((item) => item.text)

  if (positionedItems.length === 0) {
    return ''
  }

  if (positionedItems.some((item) => item.x === null || item.y === null)) {
    return positionedItems.map((item) => item.text).join(' ')
  }

  const sortedItems = [...positionedItems].sort((first, second) => {
    const firstY = first.y ?? 0
    const secondY = second.y ?? 0
    const yDiff = secondY - firstY

    if (Math.abs(yDiff) > 2) {
      return yDiff
    }

    const xDiff = (first.x ?? 0) - (second.x ?? 0)
    return xDiff || first.index - second.index
  })

  const lines: string[] = []
  let currentLine: string[] = []
  let currentY: number | null = null

  sortedItems.forEach((item) => {
    const itemY = item.y ?? 0
    const startsNewLine = currentY === null || Math.abs(itemY - currentY) > 2

    if (startsNewLine && currentLine.length > 0) {
      lines.push(currentLine.join(' '))
      currentLine = []
    }

    currentLine.push(item.text)
    currentY = itemY

    if (item.hasEOL) {
      lines.push(currentLine.join(' '))
      currentLine = []
      currentY = null
    }
  })

  if (currentLine.length > 0) {
    lines.push(currentLine.join(' '))
  }

  return lines.join('\n')
}

const extractTextFromPDF = async (buffer: Buffer): Promise<string> => {
  const pdfJS = await loadPDFJS()
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
      pages.push(buildPDFPageText(textContent.items))
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

export const parseResumeText = (rawText: string): ResumeParseResult => parseTextHeuristically(rawText)

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
      const message = error instanceof Error ? error.message : ''

      if (message === 'OLLAMA_API_KEY is not configured.') {
        warnings.push('Ollama Cloud API key is not configured. Used fallback parser only.')
      } else if (/subscription/i.test(message)) {
        warnings.push(
          `Ollama model ${OLLAMA_RESUME_MODEL} requires subscription access. Used fallback parser only.`,
        )
      } else if (/model .*not found/i.test(message)) {
        warnings.push(
          `Ollama model ${OLLAMA_RESUME_MODEL} is not available on ${OLLAMA_HOST}. Used fallback parser only.`,
        )
      } else {
        warnings.push('LLM extraction was unavailable, so fallback parser results were used.')
      }
    }
  }

  return {
    extractedTextPreview: extractedText.slice(0, 1200),
    parsed,
    warnings: Array.from(new Set(warnings)),
  }
}
