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

type CandidateCreateFormProps = {
  errorMessage?: string
  jobs: JobOption[]
  owners: OwnerOption[]
  selectedJobID: string
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

export const CandidateCreateForm = ({
  errorMessage,
  jobs,
  owners,
  selectedJobID,
}: CandidateCreateFormProps) => {
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null)
  const [textPreview, setTextPreview] = useState('')
  const [parserAppliedMessage, setParserAppliedMessage] = useState<string | null>(null)

  const resumeRef = useRef<HTMLInputElement>(null)
  const fullNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const currentCompanyRef = useRef<HTMLInputElement>(null)
  const currentRoleRef = useRef<HTMLInputElement>(null)
  const totalExperienceYearsRef = useRef<HTMLInputElement>(null)
  const linkedInURLRef = useRef<HTMLInputElement>(null)
  const portfolioURLRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const parserCoverage = useMemo(() => {
    if (!parsedData) {
      return 0
    }

    const values = [
      parsedData.fullName,
      parsedData.email,
      parsedData.phone,
      parsedData.currentRole,
      parsedData.currentCompany,
      parseNumber(parsedData.totalExperienceYears),
      parsedData.linkedInURL,
      parsedData.portfolioURL,
    ]

    return values.filter((value) => typeof value === 'string' && value.trim().length > 0).length
  }, [parsedData])
  const hasJobs = jobs.length > 0

  const applyParsedData = (data: ParsedResumeData) => {
    let appliedCount = 0

    const setInputValue = (ref: RefObject<HTMLInputElement | null>, nextValue?: string) => {
      const el = ref.current
      if (!el || !nextValue || isEmpty(nextValue)) {
        return
      }

      if (!isEmpty(el.value)) {
        return
      }

      el.value = nextValue
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      appliedCount += 1
    }

    setInputValue(fullNameRef, data.fullName)
    setInputValue(emailRef, data.email)
    setInputValue(phoneRef, data.phone)
    setInputValue(currentCompanyRef, data.currentCompany)
    setInputValue(currentRoleRef, data.currentRole)
    setInputValue(totalExperienceYearsRef, parseNumber(data.totalExperienceYears))
    setInputValue(linkedInURLRef, data.linkedInURL)
    setInputValue(portfolioURLRef, data.portfolioURL)

    if (notesRef.current && data.notes && isEmpty(notesRef.current.value)) {
      notesRef.current.value = data.notes
      notesRef.current.dispatchEvent(new Event('input', { bubbles: true }))
      notesRef.current.dispatchEvent(new Event('change', { bubbles: true }))
      appliedCount += 1
    }

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
          <h1>Add Candidate</h1>
          <p>Create one candidate master profile and optionally auto-fill details from resume parser.</p>
        </div>
        <div className="candidate-intake-header-actions">
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
        <p className="candidate-intake-message candidate-intake-message-error">
          No active jobs are visible for your role right now. Ask your lead/admin to assign an active job first.
        </p>
      ) : null}
      {parserAppliedMessage ? (
        <p className="candidate-intake-message candidate-intake-message-success">{parserAppliedMessage}</p>
      ) : null}

      <form
        action={APP_ROUTES.internal.candidates.create}
        className="candidate-intake-form"
        encType="multipart/form-data"
        method="post"
      >
        <div className="candidate-intake-grid">
          <div className="candidate-intake-main">
            <section className="candidate-intake-card">
              <h2>Job and Source</h2>
              <div className="candidate-intake-fields candidate-intake-fields-2">
                <label>
                  <span>Source Job *</span>
                  <select defaultValue={selectedJobID} disabled={!hasJobs} name="sourceJob" required>
                    <option value="">{hasJobs ? 'Select a job' : 'No jobs available'}</option>
                    {jobs.map((job) => (
                      <option key={`source-job-${job.id}`} value={job.id}>
                        {(job.jobCode || `JOB-${job.id}`)} | {job.title} | {job.clientLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Candidate Source *</span>
                  <select defaultValue="linkedin" name="source" required>
                    {CANDIDATE_SOURCE_OPTIONS.map((option) => (
                      <option key={`source-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Source Details</span>
                  <input name="sourceDetails" placeholder="Example: Employee referral by Rahul" type="text" />
                </label>
              </div>
            </section>

            <section className="candidate-intake-card">
              <h2>Contact Details</h2>
              <div className="candidate-intake-fields candidate-intake-fields-2">
                <label>
                  <span>Prefix</span>
                  <input name="prefix" placeholder="Mr / Ms / Dr" type="text" />
                </label>
                <label>
                  <span>Nick Name</span>
                  <input name="nickName" placeholder="Optional short name" type="text" />
                </label>
                <label>
                  <span>First Name</span>
                  <input name="firstName" type="text" />
                </label>
                <label>
                  <span>Middle Name</span>
                  <input name="middleName" type="text" />
                </label>
                <label>
                  <span>Last Name</span>
                  <input name="lastName" type="text" />
                </label>
                <label>
                  <span>Full Name *</span>
                  <input name="fullName" ref={fullNameRef} required type="text" />
                </label>
                <label>
                  <span>Email</span>
                  <input name="email" ref={emailRef} type="email" />
                </label>
                <label>
                  <span>Alternate Email</span>
                  <input name="alternateEmail" type="email" />
                </label>
                <label>
                  <span>Phone</span>
                  <input name="phone" ref={phoneRef} type="tel" />
                </label>
                <label>
                  <span>Alternate Phone</span>
                  <input name="alternatePhone" type="tel" />
                </label>
                <label>
                  <span>Home Phone</span>
                  <input name="homePhone" type="tel" />
                </label>
                <label>
                  <span>Work Phone</span>
                  <input name="workPhone" type="tel" />
                </label>
                <label>
                  <span>Other Phone</span>
                  <input name="otherPhone" type="tel" />
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Current Location</span>
                  <input name="currentLocation" type="text" />
                </label>
                <label>
                  <span>City</span>
                  <input name="city" type="text" />
                </label>
                <label>
                  <span>State</span>
                  <input name="state" type="text" />
                </label>
                <label>
                  <span>Country</span>
                  <input defaultValue="India" name="country" type="text" />
                </label>
                <label>
                  <span>Postal Code</span>
                  <input name="postalCode" type="text" />
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Address</span>
                  <textarea name="address" rows={2} />
                </label>
                <label>
                  <span>Skype ID</span>
                  <input name="skypeID" type="text" />
                </label>
                <label>
                  <span>Facebook URL</span>
                  <input name="facebookProfileURL" type="url" />
                </label>
                <label>
                  <span>Twitter URL</span>
                  <input name="twitterProfileURL" type="url" />
                </label>
                <label>
                  <span>Video Reference</span>
                  <input name="videoReference" placeholder="YouTube / Loom link" type="url" />
                </label>
              </div>
            </section>

            <section className="candidate-intake-card">
              <h2>Professional Details</h2>
              <div className="candidate-intake-fields candidate-intake-fields-2">
                <label>
                  <span>Current Company</span>
                  <input name="currentCompany" ref={currentCompanyRef} type="text" />
                </label>
                <label>
                  <span>Current Role</span>
                  <input name="currentRole" ref={currentRoleRef} type="text" />
                </label>
                <label>
                  <span>Job Title</span>
                  <input name="jobTitle" placeholder="Current designation" type="text" />
                </label>
                <label>
                  <span>Technology</span>
                  <input name="technology" placeholder="Stack or domain" type="text" />
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Skills</span>
                  <input name="skills" placeholder="e.g. React, Node.js, Figma" type="text" />
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Primary Skills</span>
                  <input name="primarySkills" placeholder="Top 3-5 strengths" type="text" />
                </label>
                <label>
                  <span>Total Experience (Years)</span>
                  <input min={0} name="totalExperienceYears" ref={totalExperienceYearsRef} type="number" />
                </label>
                <label>
                  <span>Total Experience (Months)</span>
                  <input max={11} min={0} name="totalExperienceMonths" type="number" />
                </label>
                <label>
                  <span>Expected Salary</span>
                  <input min={0} name="expectedSalary" type="number" />
                </label>
                <label>
                  <span>Expected Pay Min</span>
                  <input min={0} name="expectedPayMin" type="number" />
                </label>
                <label>
                  <span>Expected Pay Max</span>
                  <input min={0} name="expectedPayMax" type="number" />
                </label>
                <label>
                  <span>Expected Pay Currency</span>
                  <input name="expectedPayCurrency" placeholder="INR / USD / AED" type="text" />
                </label>
                <label>
                  <span>Expected Pay Type</span>
                  <input name="expectedPayType" placeholder="Monthly / Yearly / Hourly" type="text" />
                </label>
                <label>
                  <span>Expected Pay Unit</span>
                  <input name="expectedPayUnit" placeholder="Per hour / Per month / Per annum" type="text" />
                </label>
                <label>
                  <span>Notice Period (Days)</span>
                  <input min={0} name="noticePeriodDays" type="number" />
                </label>
                <label>
                  <span>Notice Period Label</span>
                  <input name="noticePeriodLabel" placeholder="Immediate / 30 days / 60 days" type="text" />
                </label>
                <label>
                  <span>LinkedIn URL</span>
                  <input name="linkedInURL" ref={linkedInURLRef} type="url" />
                </label>
                <label className="candidate-intake-field-span-2">
                  <span>Portfolio URL</span>
                  <input name="portfolioURL" ref={portfolioURLRef} type="url" />
                </label>
                <label>
                  <span>Work Authorization</span>
                  <input name="workAuthorization" placeholder="H1-B / Citizen / PR" type="text" />
                </label>
                <label>
                  <span>Work Authorization Expiry</span>
                  <input name="workAuthorizationExpiry" type="date" />
                </label>
                <label>
                  <span>Tax Terms</span>
                  <input name="taxTerms" placeholder="W2 / C2C / 1099" type="text" />
                </label>
                <label>
                  <span>Applicant Status</span>
                  <input name="applicantStatus" placeholder="New lead / Active / Hold" type="text" />
                </label>
                <label>
                  <span>Applicant Group</span>
                  <input name="applicantGroup" placeholder="UI, Data, Backend..." type="text" />
                </label>
                <label>
                  <span>Ownership</span>
                  <select defaultValue="" name="ownershipId">
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
                  <input name="referredBy" placeholder="Employee/partner reference" type="text" />
                </label>
                <label>
                  <span>Nationality</span>
                  <input name="nationality" type="text" />
                </label>
                <label>
                  <span>Reference ID</span>
                  <input name="referenceID" type="text" />
                </label>
                <label>
                  <span>Aadhaar / National ID</span>
                  <input name="aadhaarNumber" type="text" />
                </label>
                <label>
                  <span>GPA</span>
                  <input name="gpa" type="text" />
                </label>
                <label>
                  <span>Gender</span>
                  <input name="gender" placeholder="Optional EEO field" type="text" />
                </label>
                <label>
                  <span>Race / Ethnicity</span>
                  <input name="raceEthnicity" placeholder="Optional EEO field" type="text" />
                </label>
                <label>
                  <span>Veteran Status</span>
                  <input name="veteranStatus" placeholder="Optional EEO field" type="text" />
                </label>
                <label>
                  <span>Disability Status</span>
                  <input name="disabilityStatus" placeholder="Optional EEO field" type="text" />
                </label>
                <label className="candidate-intake-checkbox">
                  <input name="relocation" type="checkbox" />
                  <span>Open to Relocation</span>
                </label>
                <label className="candidate-intake-checkbox">
                  <input name="clearance" type="checkbox" />
                  <span>Security Clearance</span>
                </label>
              </div>
            </section>

            <section className="candidate-intake-card">
              <h2>Notes</h2>
              <label className="candidate-intake-notes">
                <span>Notes</span>
                <textarea name="notes" ref={notesRef} rows={4} />
              </label>
              <label className="candidate-intake-notes">
                <span>Additional Comments</span>
                <textarea name="additionalComments" rows={3} />
              </label>
            </section>
          </div>

          <aside className="candidate-intake-side">
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
                  Coverage: <strong>{parsedData ? `${parserCoverage}/8 core fields` : 'Not parsed yet'}</strong>
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
          <Link className="candidate-intake-cancel" href={APP_ROUTES.internal.candidates.list}>
            Cancel
          </Link>
          <button
            className={`candidate-intake-submit${hasJobs ? '' : ' candidate-intake-submit-disabled'}`}
            data-pending-label="Saving..."
            disabled={!hasJobs}
            type="submit"
          >
            Save Candidate
          </button>
        </footer>
      </form>
    </section>
  )
}
