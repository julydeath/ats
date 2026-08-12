'use client'

import Link from 'next/link'
import { useMemo, useRef, useState, type RefObject } from 'react'

import type { ParsedResumeData } from '@/lib/candidates/resume-parser'
import { CANDIDATE_SOURCE_OPTIONS } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

type JobOption = {
  clientLabel: string
  id: number | string
  jobCode: string
  priority: string
  title: string
}

type OwnerOption = {
  id: number | string
  label: string
}

export type CandidateFormInitialData = {
  aadhaarNumber?: string | null
  additionalComments?: string | null
  address?: string | null
  alternateEmail?: string | null
  alternatePhone?: string | null
  applicantGroup?: string | null
  applicantStatus?: string | null
  city?: string | null
  clearance?: boolean | null
  country?: string | null
  currentCompany?: string | null
  currentLocation?: string | null
  currentRole?: string | null
  disabilityStatus?: string | null
  email?: string | null
  expectedPayCurrency?: string | null
  expectedPayMax?: number | null
  expectedPayMin?: number | null
  expectedPayType?: string | null
  expectedPayUnit?: string | null
  expectedSalary?: number | null
  facebookProfileURL?: string | null
  firstName?: string | null
  fullName?: string | null
  gender?: string | null
  gpa?: string | null
  homePhone?: string | null
  id?: number | string
  jobTitle?: string | null
  lastName?: string | null
  linkedInURL?: string | null
  middleName?: string | null
  nationality?: string | null
  nickName?: string | null
  notes?: string | null
  noticePeriodDays?: number | null
  noticePeriodLabel?: string | null
  otherPhone?: string | null
  ownershipID?: number | string | null
  phone?: string | null
  portfolioURL?: string | null
  postalCode?: string | null
  prefix?: string | null
  primarySkills?: string[] | null
  raceEthnicity?: string | null
  referenceID?: string | null
  referredBy?: string | null
  relocation?: boolean | null
  skypeID?: string | null
  source?: string | null
  sourceDetails?: string | null
  sourceJobID?: number | string | null
  skills?: string[] | null
  state?: string | null
  taxTerms?: string | null
  technology?: string | null
  totalExperienceMonths?: number | null
  totalExperienceYears?: number | null
  twitterProfileURL?: string | null
  veteranStatus?: string | null
  videoReference?: string | null
  workAuthorization?: string | null
  workAuthorizationExpiry?: string | null
  workPhone?: string | null
}

type CandidateCreateFormProps = {
  cancelHref?: string
  descriptionOverride?: string
  errorMessage?: string
  formAction?: string
  hiddenFields?: Array<{
    name: string
    value: number | string
  }>
  initialData?: CandidateFormInitialData
  jobs: JobOption[]
  mode?: 'create' | 'edit'
  owners: OwnerOption[]
  selectedJobID: string
  showParser?: boolean
  submitLabelOverride?: string
  titleOverride?: string
}

type ParserResponse = {
  extractedTextPreview: string
  parsed: ParsedResumeData
  warnings: string[]
}

const isEmpty = (value: string) => value.trim().length === 0

const parseNumber = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return ''
}

const toDefaultText = (value: string | number | null | undefined): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return typeof value === 'string' ? value : ''
}

const toDefaultDate = (value: string | null | undefined): string => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

const toDefaultList = (value: string[] | null | undefined): string =>
  Array.isArray(value) ? value.filter(Boolean).join(', ') : ''

const toInputText = (value: string | undefined): string | undefined => {
  if (!value || isEmpty(value)) {
    return undefined
  }

  return value
}

const countParsedValue = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  return typeof value === 'boolean'
}

export const CandidateCreateForm = ({
  cancelHref = APP_ROUTES.internal.candidates.list,
  descriptionOverride,
  errorMessage,
  formAction = APP_ROUTES.internal.candidates.create,
  hiddenFields = [],
  initialData,
  jobs,
  mode = 'create',
  owners,
  selectedJobID,
  showParser = true,
  submitLabelOverride,
  titleOverride,
}: CandidateCreateFormProps) => {
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null)
  const [textPreview, setTextPreview] = useState('')
  const [parserAppliedMessage, setParserAppliedMessage] = useState<string | null>(null)

  const resumeRef = useRef<HTMLInputElement>(null)
  const sourceDetailsRef = useRef<HTMLInputElement>(null)
  const prefixRef = useRef<HTMLInputElement>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const middleNameRef = useRef<HTMLInputElement>(null)
  const lastNameRef = useRef<HTMLInputElement>(null)
  const nickNameRef = useRef<HTMLInputElement>(null)
  const fullNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const alternateEmailRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const alternatePhoneRef = useRef<HTMLInputElement>(null)
  const homePhoneRef = useRef<HTMLInputElement>(null)
  const workPhoneRef = useRef<HTMLInputElement>(null)
  const otherPhoneRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)
  const stateRef = useRef<HTMLInputElement>(null)
  const countryRef = useRef<HTMLInputElement>(null)
  const postalCodeRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLTextAreaElement>(null)
  const skypeIDRef = useRef<HTMLInputElement>(null)
  const facebookProfileURLRef = useRef<HTMLInputElement>(null)
  const twitterProfileURLRef = useRef<HTMLInputElement>(null)
  const videoReferenceRef = useRef<HTMLInputElement>(null)
  const currentCompanyRef = useRef<HTMLInputElement>(null)
  const currentLocationRef = useRef<HTMLInputElement>(null)
  const currentRoleRef = useRef<HTMLInputElement>(null)
  const jobTitleRef = useRef<HTMLInputElement>(null)
  const technologyRef = useRef<HTMLInputElement>(null)
  const skillsRef = useRef<HTMLInputElement>(null)
  const primarySkillsRef = useRef<HTMLInputElement>(null)
  const totalExperienceYearsRef = useRef<HTMLInputElement>(null)
  const totalExperienceMonthsRef = useRef<HTMLInputElement>(null)
  const expectedSalaryRef = useRef<HTMLInputElement>(null)
  const expectedPayMinRef = useRef<HTMLInputElement>(null)
  const expectedPayMaxRef = useRef<HTMLInputElement>(null)
  const expectedPayCurrencyRef = useRef<HTMLInputElement>(null)
  const expectedPayTypeRef = useRef<HTMLInputElement>(null)
  const expectedPayUnitRef = useRef<HTMLInputElement>(null)
  const noticePeriodDaysRef = useRef<HTMLInputElement>(null)
  const noticePeriodLabelRef = useRef<HTMLInputElement>(null)
  const linkedInURLRef = useRef<HTMLInputElement>(null)
  const portfolioURLRef = useRef<HTMLInputElement>(null)
  const workAuthorizationRef = useRef<HTMLInputElement>(null)
  const workAuthorizationExpiryRef = useRef<HTMLInputElement>(null)
  const taxTermsRef = useRef<HTMLInputElement>(null)
  const applicantStatusRef = useRef<HTMLInputElement>(null)
  const applicantGroupRef = useRef<HTMLInputElement>(null)
  const referredByRef = useRef<HTMLInputElement>(null)
  const nationalityRef = useRef<HTMLInputElement>(null)
  const referenceIDRef = useRef<HTMLInputElement>(null)
  const gpaRef = useRef<HTMLInputElement>(null)
  const relocationRef = useRef<HTMLInputElement>(null)
  const clearanceRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const additionalCommentsRef = useRef<HTMLTextAreaElement>(null)

  const parserCoverage = useMemo(() => {
    if (!parsedData) {
      return 0
    }

    const values = [
      parsedData.additionalComments,
      parsedData.address,
      parsedData.alternateEmail,
      parsedData.alternatePhone,
      parsedData.applicantGroup,
      parsedData.applicantStatus,
      parsedData.city,
      parsedData.clearance,
      parsedData.country,
      parsedData.currentCompany,
      parsedData.currentLocation,
      parsedData.currentRole,
      parsedData.email,
      parsedData.expectedPayCurrency,
      parsedData.expectedPayMax,
      parsedData.expectedPayMin,
      parsedData.expectedPayType,
      parsedData.expectedPayUnit,
      parsedData.expectedSalary,
      parsedData.facebookProfileURL,
      parsedData.firstName,
      parsedData.fullName,
      parsedData.gpa,
      parsedData.homePhone,
      parsedData.jobTitle,
      parsedData.lastName,
      parsedData.linkedInURL,
      parsedData.middleName,
      parsedData.nationality,
      parsedData.nickName,
      parsedData.notes,
      parsedData.noticePeriodDays,
      parsedData.noticePeriodLabel,
      parsedData.otherPhone,
      parsedData.phone,
      parsedData.portfolioURL,
      parsedData.postalCode,
      parsedData.prefix,
      parsedData.primarySkills,
      parsedData.referenceID,
      parsedData.referredBy,
      parsedData.relocation,
      parsedData.skypeID,
      parsedData.skills,
      parsedData.sourceDetails,
      parsedData.state,
      parsedData.taxTerms,
      parsedData.technology,
      parsedData.totalExperienceMonths,
      parsedData.totalExperienceYears,
      parsedData.twitterProfileURL,
      parsedData.videoReference,
      parsedData.workAuthorization,
      parsedData.workAuthorizationExpiry,
      parsedData.workPhone,
    ]

    return values.filter(countParsedValue).length
  }, [parsedData])
  const hasJobs = jobs.length > 0
  const isEditMode = mode === 'edit'
  const formJobID = initialData?.sourceJobID ? String(initialData.sourceJobID) : selectedJobID
  const formOwnerID = initialData?.ownershipID ? String(initialData.ownershipID) : ''
  const formTitle = titleOverride || (isEditMode ? 'Edit Candidate' : 'Add Candidate')
  const formDescription =
    descriptionOverride ||
    (isEditMode
      ? 'Update the candidate master profile and optionally refresh parsed resume details.'
      : 'Create one candidate master profile and optionally auto-fill details from resume parser.')
  const submitLabel = submitLabelOverride || (isEditMode ? 'Update Candidate' : 'Save Candidate')

  const applyParsedData = (data: ParsedResumeData) => {
    let appliedCount = 0

    const setInputValue = (
      ref: RefObject<HTMLInputElement | null>,
      nextValue?: string,
      options: { overwriteDefaultValue?: string } = {},
    ) => {
      const el = ref.current
      const normalizedValue = toInputText(nextValue)

      if (!el || !normalizedValue) {
        return
      }

      const canOverwriteDefault =
        options.overwriteDefaultValue !== undefined &&
        el.value === options.overwriteDefaultValue &&
        normalizedValue !== options.overwriteDefaultValue

      if (!isEmpty(el.value) && !canOverwriteDefault) {
        return
      }

      el.value = normalizedValue
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      appliedCount += 1
    }

    const setTextareaValue = (ref: RefObject<HTMLTextAreaElement | null>, nextValue?: string) => {
      const el = ref.current
      const normalizedValue = toInputText(nextValue)

      if (!el || !normalizedValue || !isEmpty(el.value)) {
        return
      }

      el.value = normalizedValue
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      appliedCount += 1
    }

    const setCheckboxValue = (ref: RefObject<HTMLInputElement | null>, nextValue?: boolean) => {
      const el = ref.current

      if (!el || nextValue !== true || el.checked) {
        return
      }

      el.checked = true
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      appliedCount += 1
    }

    setInputValue(sourceDetailsRef, data.sourceDetails)
    setInputValue(prefixRef, data.prefix)
    setInputValue(firstNameRef, data.firstName)
    setInputValue(middleNameRef, data.middleName)
    setInputValue(lastNameRef, data.lastName)
    setInputValue(nickNameRef, data.nickName)
    setInputValue(fullNameRef, data.fullName)
    setInputValue(emailRef, data.email)
    setInputValue(alternateEmailRef, data.alternateEmail)
    setInputValue(phoneRef, data.phone)
    setInputValue(alternatePhoneRef, data.alternatePhone)
    setInputValue(homePhoneRef, data.homePhone)
    setInputValue(workPhoneRef, data.workPhone)
    setInputValue(otherPhoneRef, data.otherPhone)
    setInputValue(cityRef, data.city)
    setInputValue(stateRef, data.state)
    setInputValue(countryRef, data.country, { overwriteDefaultValue: 'India' })
    setInputValue(postalCodeRef, data.postalCode)
    setTextareaValue(addressRef, data.address)
    setInputValue(skypeIDRef, data.skypeID)
    setInputValue(facebookProfileURLRef, data.facebookProfileURL)
    setInputValue(twitterProfileURLRef, data.twitterProfileURL)
    setInputValue(videoReferenceRef, data.videoReference)
    setInputValue(currentCompanyRef, data.currentCompany)
    setInputValue(currentLocationRef, data.currentLocation)
    setInputValue(currentRoleRef, data.currentRole)
    setInputValue(jobTitleRef, data.jobTitle || data.currentRole)
    setInputValue(technologyRef, data.technology)
    setInputValue(skillsRef, data.skills)
    setInputValue(primarySkillsRef, data.primarySkills)
    setInputValue(totalExperienceYearsRef, parseNumber(data.totalExperienceYears))
    setInputValue(totalExperienceMonthsRef, parseNumber(data.totalExperienceMonths))
    setInputValue(expectedSalaryRef, parseNumber(data.expectedSalary))
    setInputValue(expectedPayMinRef, parseNumber(data.expectedPayMin))
    setInputValue(expectedPayMaxRef, parseNumber(data.expectedPayMax))
    setInputValue(expectedPayCurrencyRef, data.expectedPayCurrency)
    setInputValue(expectedPayTypeRef, data.expectedPayType)
    setInputValue(expectedPayUnitRef, data.expectedPayUnit)
    setInputValue(noticePeriodDaysRef, parseNumber(data.noticePeriodDays))
    setInputValue(noticePeriodLabelRef, data.noticePeriodLabel)
    setInputValue(linkedInURLRef, data.linkedInURL)
    setInputValue(portfolioURLRef, data.portfolioURL)
    setInputValue(workAuthorizationRef, data.workAuthorization)
    setInputValue(workAuthorizationExpiryRef, data.workAuthorizationExpiry)
    setInputValue(taxTermsRef, data.taxTerms)
    setInputValue(applicantStatusRef, data.applicantStatus)
    setInputValue(applicantGroupRef, data.applicantGroup)
    setInputValue(referredByRef, data.referredBy)
    setInputValue(nationalityRef, data.nationality)
    setInputValue(referenceIDRef, data.referenceID)
    setInputValue(gpaRef, data.gpa)
    setCheckboxValue(relocationRef, data.relocation)
    setCheckboxValue(clearanceRef, data.clearance)
    setTextareaValue(notesRef, data.notes)
    setTextareaValue(additionalCommentsRef, data.additionalComments)

    setParserAppliedMessage(
      appliedCount > 0
        ? `Auto-filled ${appliedCount} field${appliedCount > 1 ? 's' : ''} from resume parser.`
        : 'All detected fields already had values. Nothing overwritten.',
    )
  }

  const handleParseResume = async () => {
    const selectedFile = resumeRef.current?.files?.[0]

    if (!selectedFile) {
      setParseError('Please choose a resume file first.')
      return
    }

    setParseError(null)
    setParseWarnings([])
    setParserAppliedMessage(null)
    setIsParsing(true)

    try {
      const formData = new FormData()
      formData.append('resume', selectedFile)

      const response = await fetch(APP_ROUTES.internal.candidates.parseResume, {
        body: formData,
        credentials: 'include',
        method: 'POST',
      })

      const payload = (await response.json().catch(() => null)) as
        | (ParserResponse & { message?: string })
        | null

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to parse this resume.')
      }

      const parsed = payload?.parsed || {}
      setParsedData(parsed)
      setParseWarnings(payload?.warnings || [])
      setTextPreview(payload?.extractedTextPreview || '')
      applyParsedData(parsed)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Unable to parse resume right now.')
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <section className="candidate-intake-page">
      <header className="candidate-intake-header">
        <div>
          <p className="candidate-intake-kicker">Candidates</p>
          <h1>{formTitle}</h1>
          <p>{formDescription}</p>
        </div>
        <div className="candidate-intake-header-actions">
          <Link className="candidate-intake-head-btn" href={APP_ROUTES.internal.candidates.importsNew}>
            Bulk Import
          </Link>
          <Link className="candidate-intake-head-btn" href={APP_ROUTES.internal.jobs.assigned}>
            Jobs
          </Link>
          <Link className="candidate-intake-head-btn" href={APP_ROUTES.internal.candidates.list}>
            Candidate Bank
          </Link>
        </div>
      </header>

      {errorMessage ? <p className="candidate-intake-message candidate-intake-message-error">{errorMessage}</p> : null}
      {parseError ? <p className="candidate-intake-message candidate-intake-message-error">{parseError}</p> : null}
      {!hasJobs ? (
        <p className="candidate-intake-message">
          No active jobs are visible for your role right now. You can still save the candidate profile without starting an application.
        </p>
      ) : null}
      {parserAppliedMessage ? (
        <p className="candidate-intake-message candidate-intake-message-success">{parserAppliedMessage}</p>
      ) : null}

      <form
        action={formAction}
        className="candidate-intake-form"
        encType="multipart/form-data"
        method="post"
      >
        {initialData?.id ? <input name="candidateId" type="hidden" value={String(initialData.id)} /> : null}
        {hiddenFields.map((field) => (
          <input key={`hidden-${field.name}`} name={field.name} type="hidden" value={String(field.value)} />
        ))}
        <div className="candidate-intake-grid">
          <div className="candidate-intake-main">
            <section className="candidate-intake-card">
              <h2>Job and Source</h2>
              <div className="candidate-intake-fields candidate-intake-fields-2">
                <label>
                  <span>Source Job</span>
                  {!hasJobs && formJobID ? <input name="sourceJob" type="hidden" value={formJobID} /> : null}
                  <select defaultValue={formJobID} disabled={!hasJobs} name="sourceJob">
                    <option value="">{hasJobs ? 'No job selected' : 'No jobs available'}</option>
                    {jobs.map((job) => (
                      <option key={`source-job-${job.id}`} value={job.id}>
                        {(job.jobCode || `JOB-${job.id}`)} | {job.title} | {job.clientLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Candidate Source *</span>
                  <select defaultValue={initialData?.source || 'linkedin'} name="source" required>
                    {CANDIDATE_SOURCE_OPTIONS.map((option) => (
                      <option key={`source-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Source Details</span>
                  <input
                    defaultValue={toDefaultText(initialData?.sourceDetails)}
                    name="sourceDetails"
                    placeholder="Example: Employee referral by Rahul"
                    ref={sourceDetailsRef}
                    type="text"
                  />
                </label>
              </div>
            </section>

            <section className="candidate-intake-card">
              <h2>Contact Details</h2>
              <div className="candidate-intake-fields candidate-intake-fields-2">
                <label>
                  <span>Prefix</span>
                  <input defaultValue={toDefaultText(initialData?.prefix)} name="prefix" placeholder="Mr / Ms / Dr" ref={prefixRef} type="text" />
                </label>
                <label>
                  <span>Nick Name</span>
                  <input defaultValue={toDefaultText(initialData?.nickName)} name="nickName" placeholder="Optional short name" ref={nickNameRef} type="text" />
                </label>
                <label>
                  <span>First Name</span>
                  <input defaultValue={toDefaultText(initialData?.firstName)} name="firstName" ref={firstNameRef} type="text" />
                </label>
                <label>
                  <span>Middle Name</span>
                  <input defaultValue={toDefaultText(initialData?.middleName)} name="middleName" ref={middleNameRef} type="text" />
                </label>
                <label>
                  <span>Last Name</span>
                  <input defaultValue={toDefaultText(initialData?.lastName)} name="lastName" ref={lastNameRef} type="text" />
                </label>
                <label>
                  <span>Full Name *</span>
                  <input defaultValue={toDefaultText(initialData?.fullName)} name="fullName" ref={fullNameRef} required type="text" />
                </label>
                <label>
                  <span>Email</span>
                  <input defaultValue={toDefaultText(initialData?.email)} name="email" ref={emailRef} type="email" />
                </label>
                <label>
                  <span>Alternate Email</span>
                  <input defaultValue={toDefaultText(initialData?.alternateEmail)} name="alternateEmail" ref={alternateEmailRef} type="email" />
                </label>
                <label>
                  <span>Phone</span>
                  <input defaultValue={toDefaultText(initialData?.phone)} name="phone" ref={phoneRef} type="tel" />
                </label>
                <label>
                  <span>Alternate Phone</span>
                  <input defaultValue={toDefaultText(initialData?.alternatePhone)} name="alternatePhone" ref={alternatePhoneRef} type="tel" />
                </label>
                <label>
                  <span>Home Phone</span>
                  <input defaultValue={toDefaultText(initialData?.homePhone)} name="homePhone" ref={homePhoneRef} type="tel" />
                </label>
                <label>
                  <span>Work Phone</span>
                  <input defaultValue={toDefaultText(initialData?.workPhone)} name="workPhone" ref={workPhoneRef} type="tel" />
                </label>
                <label>
                  <span>Other Phone</span>
                  <input defaultValue={toDefaultText(initialData?.otherPhone)} name="otherPhone" ref={otherPhoneRef} type="tel" />
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Current Location</span>
                  <input defaultValue={toDefaultText(initialData?.currentLocation)} name="currentLocation" ref={currentLocationRef} type="text" />
                </label>
                <label>
                  <span>City</span>
                  <input defaultValue={toDefaultText(initialData?.city)} name="city" ref={cityRef} type="text" />
                </label>
                <label>
                  <span>State</span>
                  <input defaultValue={toDefaultText(initialData?.state)} name="state" ref={stateRef} type="text" />
                </label>
                <label>
                  <span>Country</span>
                  <input defaultValue={toDefaultText(initialData?.country) || 'India'} name="country" ref={countryRef} type="text" />
                </label>
                <label>
                  <span>Postal Code</span>
                  <input defaultValue={toDefaultText(initialData?.postalCode)} name="postalCode" ref={postalCodeRef} type="text" />
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Address</span>
                  <textarea defaultValue={toDefaultText(initialData?.address)} name="address" ref={addressRef} rows={2} />
                </label>
                <label>
                  <span>Skype ID</span>
                  <input defaultValue={toDefaultText(initialData?.skypeID)} name="skypeID" ref={skypeIDRef} type="text" />
                </label>
                <label>
                  <span>Facebook URL</span>
                  <input defaultValue={toDefaultText(initialData?.facebookProfileURL)} name="facebookProfileURL" ref={facebookProfileURLRef} type="url" />
                </label>
                <label>
                  <span>Twitter URL</span>
                  <input defaultValue={toDefaultText(initialData?.twitterProfileURL)} name="twitterProfileURL" ref={twitterProfileURLRef} type="url" />
                </label>
                <label>
                  <span>Video Reference</span>
                  <input
                    defaultValue={toDefaultText(initialData?.videoReference)}
                    name="videoReference"
                    placeholder="YouTube / Loom link"
                    ref={videoReferenceRef}
                    type="url"
                  />
                </label>
              </div>
            </section>

            <section className="candidate-intake-card">
              <h2>Professional Details</h2>
              <div className="candidate-intake-fields candidate-intake-fields-2">
                <label>
                  <span>Current Company</span>
                  <input defaultValue={toDefaultText(initialData?.currentCompany)} name="currentCompany" ref={currentCompanyRef} type="text" />
                </label>
                <label>
                  <span>Current Role</span>
                  <input defaultValue={toDefaultText(initialData?.currentRole)} name="currentRole" ref={currentRoleRef} type="text" />
                </label>
                <label>
                  <span>Job Title</span>
                  <input defaultValue={toDefaultText(initialData?.jobTitle)} name="jobTitle" placeholder="Current designation" ref={jobTitleRef} type="text" />
                </label>
                <label>
                  <span>Technology</span>
                  <input defaultValue={toDefaultText(initialData?.technology)} name="technology" placeholder="Stack or domain" ref={technologyRef} type="text" />
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Skills</span>
                  <input defaultValue={toDefaultList(initialData?.skills)} name="skills" placeholder="e.g. React, Node.js, Figma" ref={skillsRef} type="text" />
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Primary Skills</span>
                  <input defaultValue={toDefaultList(initialData?.primarySkills)} name="primarySkills" placeholder="Top 3-5 strengths" ref={primarySkillsRef} type="text" />
                </label>
                <label>
                  <span>Total Experience (Years)</span>
                  <input defaultValue={toDefaultText(initialData?.totalExperienceYears)} min={0} name="totalExperienceYears" ref={totalExperienceYearsRef} type="number" />
                </label>
                <label>
                  <span>Total Experience (Months)</span>
                  <input defaultValue={toDefaultText(initialData?.totalExperienceMonths)} max={11} min={0} name="totalExperienceMonths" ref={totalExperienceMonthsRef} type="number" />
                </label>
                <label>
                  <span>Expected Salary</span>
                  <input defaultValue={toDefaultText(initialData?.expectedSalary)} min={0} name="expectedSalary" ref={expectedSalaryRef} type="number" />
                </label>
                <label>
                  <span>Expected Pay Min</span>
                  <input defaultValue={toDefaultText(initialData?.expectedPayMin)} min={0} name="expectedPayMin" ref={expectedPayMinRef} type="number" />
                </label>
                <label>
                  <span>Expected Pay Max</span>
                  <input defaultValue={toDefaultText(initialData?.expectedPayMax)} min={0} name="expectedPayMax" ref={expectedPayMaxRef} type="number" />
                </label>
                <label>
                  <span>Expected Pay Currency</span>
                  <input
                    defaultValue={toDefaultText(initialData?.expectedPayCurrency)}
                    name="expectedPayCurrency"
                    placeholder="INR / USD / AED"
                    ref={expectedPayCurrencyRef}
                    type="text"
                  />
                </label>
                <label>
                  <span>Expected Pay Type</span>
                  <input
                    defaultValue={toDefaultText(initialData?.expectedPayType)}
                    name="expectedPayType"
                    placeholder="Monthly / Yearly / Hourly"
                    ref={expectedPayTypeRef}
                    type="text"
                  />
                </label>
                <label>
                  <span>Expected Pay Unit</span>
                  <input
                    defaultValue={toDefaultText(initialData?.expectedPayUnit)}
                    name="expectedPayUnit"
                    placeholder="Per hour / Per month / Per annum"
                    ref={expectedPayUnitRef}
                    type="text"
                  />
                </label>
                <label>
                  <span>Notice Period (Days)</span>
                  <input defaultValue={toDefaultText(initialData?.noticePeriodDays)} min={0} name="noticePeriodDays" ref={noticePeriodDaysRef} type="number" />
                </label>
                <label>
                  <span>Notice Period Label</span>
                  <input
                    defaultValue={toDefaultText(initialData?.noticePeriodLabel)}
                    name="noticePeriodLabel"
                    placeholder="Immediate / 30 days / 60 days"
                    ref={noticePeriodLabelRef}
                    type="text"
                  />
                </label>
                <label>
                  <span>LinkedIn URL</span>
                  <input defaultValue={toDefaultText(initialData?.linkedInURL)} name="linkedInURL" ref={linkedInURLRef} type="url" />
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Portfolio URL</span>
                  <input defaultValue={toDefaultText(initialData?.portfolioURL)} name="portfolioURL" ref={portfolioURLRef} type="url" />
                </label>
                <label>
                  <span>Work Authorization</span>
                  <input
                    defaultValue={toDefaultText(initialData?.workAuthorization)}
                    name="workAuthorization"
                    placeholder="H1-B / Citizen / PR"
                    ref={workAuthorizationRef}
                    type="text"
                  />
                </label>
                <label>
                  <span>Work Authorization Expiry</span>
                  <input defaultValue={toDefaultDate(initialData?.workAuthorizationExpiry)} name="workAuthorizationExpiry" ref={workAuthorizationExpiryRef} type="date" />
                </label>
                <label>
                  <span>Tax Terms</span>
                  <input defaultValue={toDefaultText(initialData?.taxTerms)} name="taxTerms" placeholder="W2 / C2C / 1099" ref={taxTermsRef} type="text" />
                </label>
                <label>
                  <span>Applicant Status</span>
                  <input
                    defaultValue={toDefaultText(initialData?.applicantStatus)}
                    name="applicantStatus"
                    placeholder="New lead / Active / Hold"
                    ref={applicantStatusRef}
                    type="text"
                  />
                </label>
                <label>
                  <span>Applicant Group</span>
                  <input defaultValue={toDefaultText(initialData?.applicantGroup)} name="applicantGroup" placeholder="UI, Data, Backend..." ref={applicantGroupRef} type="text" />
                </label>
                <label>
                  <span>Ownership</span>
                  <select defaultValue={formOwnerID} name="ownershipId">
                    <option value="">Unassigned</option>
                    {owners.map((owner) => (
                      <option key={`candidate-owner-${owner.id}`} value={String(owner.id)}>
                        {owner.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Referred By</span>
                  <input defaultValue={toDefaultText(initialData?.referredBy)} name="referredBy" placeholder="Employee/partner reference" ref={referredByRef} type="text" />
                </label>
                <label>
                  <span>Nationality</span>
                  <input defaultValue={toDefaultText(initialData?.nationality)} name="nationality" ref={nationalityRef} type="text" />
                </label>
                <label>
                  <span>Reference ID</span>
                  <input defaultValue={toDefaultText(initialData?.referenceID)} name="referenceID" ref={referenceIDRef} type="text" />
                </label>
                <label>
                  <span>Aadhaar / National ID</span>
                  <input defaultValue={toDefaultText(initialData?.aadhaarNumber)} name="aadhaarNumber" type="text" />
                </label>
                <label>
                  <span>GPA</span>
                  <input defaultValue={toDefaultText(initialData?.gpa)} name="gpa" ref={gpaRef} type="text" />
                </label>
                <label>
                  <span>Gender</span>
                  <input defaultValue={toDefaultText(initialData?.gender)} name="gender" placeholder="Optional EEO field" type="text" />
                </label>
                <label>
                  <span>Race / Ethnicity</span>
                  <input defaultValue={toDefaultText(initialData?.raceEthnicity)} name="raceEthnicity" placeholder="Optional EEO field" type="text" />
                </label>
                <label>
                  <span>Veteran Status</span>
                  <input defaultValue={toDefaultText(initialData?.veteranStatus)} name="veteranStatus" placeholder="Optional EEO field" type="text" />
                </label>
                <label>
                  <span>Disability Status</span>
                  <input defaultValue={toDefaultText(initialData?.disabilityStatus)} name="disabilityStatus" placeholder="Optional EEO field" type="text" />
                </label>
                <label className="candidate-intake-checkbox">
                  <input defaultChecked={initialData?.relocation === true} name="relocation" ref={relocationRef} type="checkbox" />
                  <span>Open to Relocation</span>
                </label>
                <label className="candidate-intake-checkbox">
                  <input defaultChecked={initialData?.clearance === true} name="clearance" ref={clearanceRef} type="checkbox" />
                  <span>Security Clearance</span>
                </label>
              </div>
            </section>

            <section className="candidate-intake-card">
              <h2>Notes</h2>
              <label className="candidate-intake-notes">
                <span>Notes</span>
                <textarea defaultValue={toDefaultText(initialData?.notes)} name="notes" ref={notesRef} rows={4} />
              </label>
              <label className="candidate-intake-notes">
                <span>Additional Comments</span>
                <textarea defaultValue={toDefaultText(initialData?.additionalComments)} name="additionalComments" ref={additionalCommentsRef} rows={3} />
              </label>
            </section>
          </div>

          <aside className="candidate-intake-side">
            {showParser ? (
              <>
                <article className="candidate-intake-card">
                  <h2>Resume Upload + Parser</h2>
                  <div className="candidate-intake-parser">
                    <label>
                      <span>Resume (PDF / DOC / DOCX)</span>
                      <input
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        name="resume"
                        ref={resumeRef}
                        type="file"
                      />
                    </label>
                    <button
                      className="candidate-intake-parse-btn"
                      disabled={isParsing}
                      onClick={(event) => {
                        event.preventDefault()
                        void handleParseResume()
                      }}
                      type="button"
                    >
                      {isParsing ? 'Parsing Resume...' : 'Parse Resume & Autofill'}
                    </button>
                    <p className="candidate-intake-parser-help">
                      Parser currently extracts best results from PDF or DOCX. DOC upload works, but extraction may be limited.
                    </p>
                  </div>
                </article>

                <article className="candidate-intake-card">
                  <h2>Parser Snapshot</h2>
                  <div className="candidate-intake-parser-summary">
                    <p>
                      Coverage: <strong>{parsedData ? `${parserCoverage} fields detected` : 'Not parsed yet'}</strong>
                    </p>
                    {parseWarnings.length > 0 ? (
                      <ul>
                        {parseWarnings.map((warning, index) => (
                          <li key={`warning-${index + 1}`}>{warning}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No parser warnings.</p>
                    )}
                    {textPreview ? (
                      <details>
                        <summary>See extracted text preview</summary>
                        <pre>{textPreview}</pre>
                      </details>
                    ) : null}
                  </div>
                </article>
              </>
            ) : null}

            <article className="candidate-intake-card">
              <h2>Visible Jobs</h2>
              <div className="candidate-intake-job-list">
                {jobs.length === 0 ? (
                  <p className="candidate-intake-empty">No visible jobs.</p>
                ) : (
                  jobs.slice(0, 8).map((job) => (
                    <div key={`job-preview-${job.id}`}>
                      <p>{job.title}</p>
                      <small>
                        {(job.jobCode || `JOB-${job.id}`)} · {job.clientLabel} · {job.priority}
                      </small>
                    </div>
                  ))
                )}
              </div>
            </article>
          </aside>
        </div>

        <footer className="candidate-intake-footer">
          <Link className="candidate-intake-cancel" href={cancelHref}>
            Cancel
          </Link>
          <button
            className="candidate-intake-submit"
            data-pending-label="Saving..."
            type="submit"
          >
            {submitLabel}
          </button>
        </footer>
      </form>
    </section>
  )
}
