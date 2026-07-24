import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload, type Where } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import {
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
} from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const toRelationshipID = (value: unknown): string => {
  const id = extractRelationshipID(value)
  return typeof id === 'number' || typeof id === 'string' ? String(id) : ''
}

const toDefaultText = (value: string | number | null | undefined): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return typeof value === 'string' ? value : ''
}

const toDateInputValue = (value: string | Date | null | undefined): string => {
  if (!value) {
    return ''
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

const toCSV = (value: unknown): string => {
  if (!Array.isArray(value)) {
    return ''
  }

  return value
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'skill' in item) {
        const skill = (item as { skill?: unknown }).skill
        return typeof skill === 'string' ? skill : ''
      }
      return ''
    })
    .filter(Boolean)
    .join(', ')
}

type JobEditPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function JobEditPage({ params, searchParams }: JobEditPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter'])
  const payload = await getPayload({ config: configPromise })
  const { id } = await params
  const resolvedSearchParams = (await searchParams) ?? {}

  if (!/^\d+$/.test(id)) {
    notFound()
  }

  const jobID = Number(id)

  try {
    const job = await payload.findByID({
      collection: 'jobs',
      depth: 0,
      id: jobID,
      overrideAccess: false,
      select: {
        assignedTo: true,
        businessUnit: true,
        client: true,
        clientBillRate: true,
        clientJobID: true,
        department: true,
        description: true,
        employmentType: true,
        experienceMax: true,
        experienceMin: true,
        id: true,
        jobCode: true,
        location: true,
        openings: true,
        owningHeadRecruiter: true,
        payRate: true,
        payType: true,
        primaryRecruiter: true,
        priority: true,
        recruitmentManager: true,
        requirementAssignedOn: true,
        requisitionTitle: true,
        requiredSkills: true,
        salaryMax: true,
        salaryMin: true,
        salaryRangeLabel: true,
        states: true,
        status: true,
        targetClosureDate: true,
        title: true,
      },
      user,
    })

    const currentClientID = toRelationshipID(job.client)
    const currentLeadID = toRelationshipID(job.owningHeadRecruiter)
    const currentRecruiterIDs = Array.from(
      new Set(
        [
          toRelationshipID(job.primaryRecruiter),
          ...(Array.isArray(job.assignedTo) ? job.assignedTo.map(toRelationshipID) : []),
        ].filter(Boolean),
      ),
    )
    const clientsWhere: Where = currentClientID
      ? {
          or: [
            {
              status: {
                equals: 'active',
              },
            },
            {
              id: {
                equals: Number(currentClientID),
              },
            },
          ],
        }
      : {
          status: {
            equals: 'active',
          },
        }
    const leadsWhere: Where = currentLeadID
      ? {
          or: [
            {
              and: [
                {
                  role: {
                    equals: 'leadRecruiter',
                  },
                },
                {
                  isActive: {
                    equals: true,
                  },
                },
              ],
            },
            {
              id: {
                equals: Number(currentLeadID),
              },
            },
          ],
        }
      : {
          and: [
            {
              role: {
                equals: 'leadRecruiter',
              },
            },
            {
              isActive: {
                equals: true,
              },
            },
          ],
        }
    const recruitersWhere: Where =
      currentRecruiterIDs.length > 0
        ? {
            or: [
              {
                and: [
                  {
                    role: {
                      equals: 'recruiter',
                    },
                  },
                  {
                    isActive: {
                      equals: true,
                    },
                  },
                ],
              },
              {
                id: {
                  in: currentRecruiterIDs.map(Number),
                },
              },
            ],
          }
        : {
            and: [
              {
                role: {
                  equals: 'recruiter',
                },
              },
              {
                isActive: {
                  equals: true,
                },
              },
            ],
          }

    const [clientsResult, leadsResult, recruitersResult] = await Promise.all([
      payload.find({
        collection: 'clients',
        depth: 0,
        limit: 160,
        overrideAccess: false,
        pagination: false,
        select: {
          clientCode: true,
          id: true,
          name: true,
        },
        sort: 'name',
        user,
        where: clientsWhere,
      }),
      payload.find({
        collection: 'users',
        depth: 0,
        limit: 120,
        overrideAccess: false,
        pagination: false,
        select: {
          email: true,
          fullName: true,
          id: true,
        },
        sort: 'fullName',
        user,
        where: leadsWhere,
      }),
      payload.find({
        collection: 'users',
        depth: 0,
        limit: 140,
        overrideAccess: false,
        pagination: false,
        select: {
          email: true,
          fullName: true,
          id: true,
        },
        sort: 'fullName',
        user,
        where: recruitersWhere,
      }),
    ])

    const selectedLeadID = currentLeadID || String(user.id)
    const selectedRecruitmentManagerID = toRelationshipID(job.recruitmentManager)
    const selectedPrimaryRecruiterID = toRelationshipID(job.primaryRecruiter)
    const selectedAssignedTo = Array.isArray(job.assignedTo)
      ? job.assignedTo.map(toRelationshipID).filter(Boolean)
      : []

    return (
      <section className="jobs-workspace-page jobs-edit-page">
        <header className="jobs-workspace-header">
          <div>
            <p className="jobs-workspace-kicker">Jobs | Edit</p>
            <h1>Edit {job.title}</h1>
          </div>
          <div className="jobs-workspace-header-actions">
            <Link className="jobs-header-button" href={`${APP_ROUTES.internal.jobs.detailBase}/${job.id}`}>
              Back to Board
            </Link>
          </div>
        </header>

        {resolvedSearchParams.error ? (
          <p className="jobs-feedback jobs-feedback-error">{resolvedSearchParams.error}</p>
        ) : null}

        <article className="jobs-modal jobs-edit-panel">
          <div className="jobs-modal-head">
            <div>
              <h2>{job.jobCode || `JOB-${job.id}`}</h2>
              <p>Update role intake, ownership, budget, and JD details.</p>
            </div>
          </div>

          <form
            action={APP_ROUTES.internal.jobs.create}
            className="jobs-modal-form"
            encType="multipart/form-data"
            method="post"
          >
            <input name="jobId" type="hidden" value={job.id} />

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-client">
                <span>Client</span>
                <select defaultValue={currentClientID} id="edit-job-client" name="clientId" required>
                  <option value="">Select client</option>
                  {clientsResult.docs.map((client) => (
                    <option key={`edit-job-client-${client.id}`} value={String(client.id)}>
                      {client.clientCode || `CLT-${client.id}`} · {client.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="jobs-modal-field" htmlFor="edit-job-title">
                <span>Job Title</span>
                <input defaultValue={job.title} id="edit-job-title" name="title" required type="text" />
              </label>
            </div>

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-department">
                <span>Department</span>
                <input defaultValue={toDefaultText(job.department)} id="edit-job-department" name="department" type="text" />
              </label>
              <label className="jobs-modal-field" htmlFor="edit-job-employment-type">
                <span>Employment Type</span>
                <select defaultValue={job.employmentType} id="edit-job-employment-type" name="employmentType" required>
                  {JOB_EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                    <option key={`edit-job-employment-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-requisition-title">
                <span>Requisition Title</span>
                <input defaultValue={toDefaultText(job.requisitionTitle)} id="edit-job-requisition-title" name="requisitionTitle" type="text" />
              </label>
              <label className="jobs-modal-field" htmlFor="edit-job-client-job-id">
                <span>Client Job ID</span>
                <input defaultValue={toDefaultText(job.clientJobID)} id="edit-job-client-job-id" name="clientJobID" type="text" />
              </label>
            </div>

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-business-unit">
                <span>Business Unit</span>
                <input defaultValue={toDefaultText(job.businessUnit)} id="edit-job-business-unit" name="businessUnit" type="text" />
              </label>
              <label className="jobs-modal-field" htmlFor="edit-job-states">
                <span>States / Regions</span>
                <input defaultValue={toCSV(job.states)} id="edit-job-states" name="states" type="text" />
              </label>
            </div>

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-location">
                <span>Location</span>
                <input defaultValue={toDefaultText(job.location)} id="edit-job-location" name="location" type="text" />
              </label>
              <label className="jobs-modal-field" htmlFor="edit-job-openings">
                <span>Openings</span>
                <input defaultValue={toDefaultText(job.openings) || '1'} id="edit-job-openings" min={1} name="openings" type="number" />
              </label>
            </div>

            <div className="jobs-modal-grid">
              {user.role === 'admin' ? (
                <label className="jobs-modal-field" htmlFor="edit-job-lead">
                  <span>Lead Recruiter</span>
                  <select defaultValue={selectedLeadID} id="edit-job-lead" name="leadRecruiterId" required>
                    <option value="">Select lead</option>
                    {leadsResult.docs.map((lead) => (
                      <option key={`edit-job-lead-${lead.id}`} value={String(lead.id)}>
                        {lead.fullName || lead.email}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input name="leadRecruiterId" type="hidden" value={selectedLeadID} />
              )}

              <label className="jobs-modal-field" htmlFor="edit-job-priority">
                <span>Priority</span>
                <select defaultValue={job.priority || 'medium'} id="edit-job-priority" name="priority">
                  {JOB_PRIORITY_OPTIONS.map((option) => (
                    <option key={`edit-job-priority-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-recruitment-manager">
                <span>Recruitment Manager</span>
                <select defaultValue={selectedRecruitmentManagerID} id="edit-job-recruitment-manager" name="recruitmentManagerId">
                  <option value="">Unassigned</option>
                  {leadsResult.docs.map((lead) => (
                    <option key={`edit-job-manager-${lead.id}`} value={String(lead.id)}>
                      {lead.fullName || lead.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className="jobs-modal-field" htmlFor="edit-job-primary-recruiter">
                <span>Primary Recruiter</span>
                <select defaultValue={selectedPrimaryRecruiterID} id="edit-job-primary-recruiter" name="primaryRecruiterId">
                  <option value="">Unassigned</option>
                  {recruitersResult.docs.map((recruiter) => (
                    <option key={`edit-job-primary-recruiter-${recruiter.id}`} value={String(recruiter.id)}>
                      {recruiter.fullName || recruiter.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="jobs-modal-field" htmlFor="edit-job-assigned-to">
              <span>Assigned Recruiters</span>
              <select defaultValue={selectedAssignedTo} id="edit-job-assigned-to" multiple name="assignedTo" size={4}>
                {recruitersResult.docs.map((recruiter) => (
                  <option key={`edit-job-assigned-to-${recruiter.id}`} value={String(recruiter.id)}>
                    {recruiter.fullName || recruiter.email}
                  </option>
                ))}
              </select>
            </label>

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-status">
                <span>Status</span>
                <select defaultValue={job.status || 'active'} id="edit-job-status" name="status">
                  {JOB_STATUS_OPTIONS.map((option) => (
                    <option key={`edit-job-status-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="jobs-modal-field" htmlFor="edit-job-target">
                <span>Target Closure Date</span>
                <input defaultValue={toDateInputValue(job.targetClosureDate)} id="edit-job-target" name="targetClosureDate" type="date" />
              </label>
            </div>

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-experience-min">
                <span>Experience Min (Years)</span>
                <input defaultValue={toDefaultText(job.experienceMin)} id="edit-job-experience-min" min={0} name="experienceMin" type="number" />
              </label>
              <label className="jobs-modal-field" htmlFor="edit-job-experience-max">
                <span>Experience Max (Years)</span>
                <input defaultValue={toDefaultText(job.experienceMax)} id="edit-job-experience-max" min={0} name="experienceMax" type="number" />
              </label>
            </div>

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-salary-min">
                <span>Salary Min</span>
                <input defaultValue={toDefaultText(job.salaryMin)} id="edit-job-salary-min" min={0} name="salaryMin" type="number" />
              </label>
              <label className="jobs-modal-field" htmlFor="edit-job-salary-max">
                <span>Salary Max</span>
                <input defaultValue={toDefaultText(job.salaryMax)} id="edit-job-salary-max" min={0} name="salaryMax" type="number" />
              </label>
            </div>

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-client-bill-rate">
                <span>Client Bill Rate</span>
                <input defaultValue={toDefaultText(job.clientBillRate)} id="edit-job-client-bill-rate" name="clientBillRate" type="text" />
              </label>
              <label className="jobs-modal-field" htmlFor="edit-job-pay-rate">
                <span>Pay Rate</span>
                <input defaultValue={toDefaultText(job.payRate)} id="edit-job-pay-rate" name="payRate" type="text" />
              </label>
            </div>

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-pay-type">
                <span>Pay Type</span>
                <input defaultValue={toDefaultText(job.payType)} id="edit-job-pay-type" name="payType" type="text" />
              </label>
              <label className="jobs-modal-field" htmlFor="edit-job-salary-range-label">
                <span>Salary Range Label</span>
                <input defaultValue={toDefaultText(job.salaryRangeLabel)} id="edit-job-salary-range-label" name="salaryRangeLabel" type="text" />
              </label>
            </div>

            <div className="jobs-modal-grid">
              <label className="jobs-modal-field" htmlFor="edit-job-requirement-assigned-on">
                <span>Requirement Assigned On</span>
                <input defaultValue={toDateInputValue(job.requirementAssignedOn)} id="edit-job-requirement-assigned-on" name="requirementAssignedOn" type="date" />
              </label>
              <div />
            </div>

            <label className="jobs-modal-field" htmlFor="edit-job-description">
              <span>Description</span>
              <textarea defaultValue={toDefaultText(job.description)} id="edit-job-description" name="description" required rows={4} />
            </label>

            <label className="jobs-modal-field" htmlFor="edit-job-jd-file">
              <span>Replace JD Attachment</span>
              <input
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                id="edit-job-jd-file"
                name="jobDescriptionFile"
                type="file"
              />
            </label>

            <label className="jobs-modal-field" htmlFor="edit-job-skills">
              <span>Required Skills</span>
              <textarea defaultValue={toCSV(job.requiredSkills)} id="edit-job-skills" name="requiredSkills" rows={3} />
            </label>

            <div className="jobs-modal-footer">
              <Link className="jobs-modal-cancel" href={`${APP_ROUTES.internal.jobs.detailBase}/${job.id}`}>
                Cancel
              </Link>
              <button className="jobs-modal-submit" data-pending-label="Saving..." type="submit">
                Update Job
              </button>
            </div>
          </form>
        </article>
      </section>
    )
  } catch {
    notFound()
  }
}
