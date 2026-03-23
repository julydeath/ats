// @ts-nocheck
import 'dotenv/config'

import { promises as fs } from 'fs'
import path from 'path'

import configPromise from '../src/payload.config'
import { getPayload } from 'payload'

import { buildCandidateInviteTokenHash } from '../src/lib/auth/candidate-invites'

type ID = number | string

type InternalUserDoc = {
  id: ID
  email: string
  fullName?: string
  isActive?: boolean
  role: 'admin' | 'headRecruiter' | 'leadRecruiter' | 'recruiter'
}

type SeedStats = {
  created: number
  updated: number
}

const stats: SeedStats = {
  created: 0,
  updated: 0,
}

const seedFilesDir = path.resolve(process.cwd(), '.seed-data')
const seedResumePath = path.join(seedFilesDir, 'seed-candidate-resume.pdf')
const seedMediaPath = path.join(seedFilesDir, 'seed-company-note.txt')

const ensureSeedFiles = async () => {
  await fs.mkdir(seedFilesDir, { recursive: true })

  const resumePDF = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 50 100 Td (Seed Resume) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000062 00000 n
0000000117 00000 n
0000000217 00000 n
trailer
<< /Root 1 0 R /Size 5 >>
startxref
310
%%EOF
`

  await fs.writeFile(seedResumePath, resumePDF, 'utf8')
  await fs.writeFile(
    seedMediaPath,
    'Seed media file for ATS test data population.',
    'utf8',
  )
}

const main = async () => {
  await ensureSeedFiles()

  const payload = await getPayload({ config: configPromise })

  const adminLookup = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      role: {
        equals: 'admin',
      },
    },
  })

  if (adminLookup.totalDocs === 0) {
    throw new Error(
      'No admin user found. Create an admin account first, then rerun seeding.',
    )
  }

  const admin = adminLookup.docs[0] as InternalUserDoc

  const upsert = async <T>({
    collection,
    createData,
    updateData,
    where,
  }: {
    collection: string
    createData: Record<string, unknown>
    updateData?: Record<string, unknown>
    where: Record<string, unknown>
  }): Promise<T> => {
    const existing = await payload.find({
      collection,
      depth: 0,
      limit: 1,
      overrideAccess: false,
      user: admin,
      where,
    })

    if (existing.totalDocs > 0) {
      const doc = existing.docs[0] as { id: ID }

      const updated = (await payload.update({
        collection,
        data: updateData || createData,
        id: doc.id,
        overrideAccess: false,
        user: admin,
      })) as T

      stats.updated += 1
      return updated
    }

    const created = (await payload.create({
      collection,
      data: createData,
      overrideAccess: false,
      user: admin,
    })) as T

    stats.created += 1
    return created
  }

  const head = await upsert<InternalUserDoc>({
    collection: 'users',
    createData: {
      email: 'head.recruiter.seed@inspirixhr.local',
      fullName: 'Seed Head Recruiter',
      isActive: true,
      password: 'SeedPass@123',
      role: 'headRecruiter',
    },
    updateData: {
      fullName: 'Seed Head Recruiter',
      isActive: true,
      role: 'headRecruiter',
    },
    where: {
      email: {
        equals: 'head.recruiter.seed@inspirixhr.local',
      },
    },
  })

  const lead = await upsert<InternalUserDoc>({
    collection: 'users',
    createData: {
      email: 'lead.recruiter.seed@inspirixhr.local',
      fullName: 'Seed Lead Recruiter',
      isActive: true,
      password: 'SeedPass@123',
      role: 'leadRecruiter',
    },
    updateData: {
      fullName: 'Seed Lead Recruiter',
      isActive: true,
      role: 'leadRecruiter',
    },
    where: {
      email: {
        equals: 'lead.recruiter.seed@inspirixhr.local',
      },
    },
  })

  const recruiterOne = await upsert<InternalUserDoc>({
    collection: 'users',
    createData: {
      email: 'recruiter.one.seed@inspirixhr.local',
      fullName: 'Seed Recruiter One',
      isActive: true,
      password: 'SeedPass@123',
      role: 'recruiter',
    },
    updateData: {
      fullName: 'Seed Recruiter One',
      isActive: true,
      role: 'recruiter',
    },
    where: {
      email: {
        equals: 'recruiter.one.seed@inspirixhr.local',
      },
    },
  })

  const recruiterTwo = await upsert<InternalUserDoc>({
    collection: 'users',
    createData: {
      email: 'recruiter.two.seed@inspirixhr.local',
      fullName: 'Seed Recruiter Two',
      isActive: true,
      password: 'SeedPass@123',
      role: 'recruiter',
    },
    updateData: {
      fullName: 'Seed Recruiter Two',
      isActive: true,
      role: 'recruiter',
    },
    where: {
      email: {
        equals: 'recruiter.two.seed@inspirixhr.local',
      },
    },
  })

  const clientA = await upsert<{ id: ID }>({
    collection: 'clients',
    createData: {
      address: 'Bangalore, India',
      billingTerms: '30 days',
      contactPerson: 'Ravi Menon',
      email: 'hiring@acme-seed.com',
      name: 'Acme Seed Technologies',
      notes: 'Primary seeded enterprise client.',
      owningHeadRecruiter: head.id,
      phone: '+91-9876500001',
      status: 'active',
    },
    updateData: {
      address: 'Bangalore, India',
      billingTerms: '30 days',
      contactPerson: 'Ravi Menon',
      email: 'hiring@acme-seed.com',
      name: 'Acme Seed Technologies',
      notes: 'Primary seeded enterprise client.',
      owningHeadRecruiter: head.id,
      phone: '+91-9876500001',
      status: 'active',
    },
    where: {
      email: {
        equals: 'hiring@acme-seed.com',
      },
    },
  })

  const clientB = await upsert<{ id: ID }>({
    collection: 'clients',
    createData: {
      address: 'Hyderabad, India',
      billingTerms: '45 days',
      contactPerson: 'Anita Kapoor',
      email: 'recruitment@nova-seed.com',
      name: 'Nova Seed Systems',
      notes: 'Secondary seeded client.',
      owningHeadRecruiter: head.id,
      phone: '+91-9876500002',
      status: 'active',
    },
    updateData: {
      address: 'Hyderabad, India',
      billingTerms: '45 days',
      contactPerson: 'Anita Kapoor',
      email: 'recruitment@nova-seed.com',
      name: 'Nova Seed Systems',
      notes: 'Secondary seeded client.',
      owningHeadRecruiter: head.id,
      phone: '+91-9876500002',
      status: 'active',
    },
    where: {
      email: {
        equals: 'recruitment@nova-seed.com',
      },
    },
  })

  const jobA = await upsert<{ id: ID }>({
    collection: 'jobs',
    createData: {
      client: clientA.id,
      createdBy: admin.id,
      department: 'Engineering',
      description: 'Build frontend systems and candidate-facing workflows.',
      employmentType: 'fullTime',
      experienceMax: 8,
      experienceMin: 4,
      location: 'Bangalore',
      openings: 2,
      owningHeadRecruiter: head.id,
      priority: 'high',
      requiredSkills: [{ skill: 'React' }, { skill: 'TypeScript' }, { skill: 'Next.js' }],
      salaryMax: 2600000,
      salaryMin: 1600000,
      status: 'active',
      targetClosureDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(),
      title: 'Senior Frontend Engineer',
    },
    updateData: {
      client: clientA.id,
      department: 'Engineering',
      description: 'Build frontend systems and candidate-facing workflows.',
      employmentType: 'fullTime',
      experienceMax: 8,
      experienceMin: 4,
      location: 'Bangalore',
      openings: 2,
      owningHeadRecruiter: head.id,
      priority: 'high',
      requiredSkills: [{ skill: 'React' }, { skill: 'TypeScript' }, { skill: 'Next.js' }],
      salaryMax: 2600000,
      salaryMin: 1600000,
      status: 'active',
      targetClosureDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(),
      title: 'Senior Frontend Engineer',
    },
    where: {
      and: [
        {
          client: {
            equals: clientA.id,
          },
        },
        {
          title: {
            equals: 'Senior Frontend Engineer',
          },
        },
      ],
    },
  })

  const jobB = await upsert<{ id: ID }>({
    collection: 'jobs',
    createData: {
      client: clientB.id,
      createdBy: admin.id,
      department: 'Platform',
      description: 'Own backend services and API performance.',
      employmentType: 'fullTime',
      experienceMax: 9,
      experienceMin: 5,
      location: 'Hyderabad',
      openings: 1,
      owningHeadRecruiter: head.id,
      priority: 'medium',
      requiredSkills: [{ skill: 'Node.js' }, { skill: 'PostgreSQL' }, { skill: 'Docker' }],
      salaryMax: 2800000,
      salaryMin: 1800000,
      status: 'active',
      targetClosureDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
      title: 'Backend Platform Engineer',
    },
    updateData: {
      client: clientB.id,
      department: 'Platform',
      description: 'Own backend services and API performance.',
      employmentType: 'fullTime',
      experienceMax: 9,
      experienceMin: 5,
      location: 'Hyderabad',
      openings: 1,
      owningHeadRecruiter: head.id,
      priority: 'medium',
      requiredSkills: [{ skill: 'Node.js' }, { skill: 'PostgreSQL' }, { skill: 'Docker' }],
      salaryMax: 2800000,
      salaryMin: 1800000,
      status: 'active',
      targetClosureDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
      title: 'Backend Platform Engineer',
    },
    where: {
      and: [
        {
          client: {
            equals: clientB.id,
          },
        },
        {
          title: {
            equals: 'Backend Platform Engineer',
          },
        },
      ],
    },
  })

  const jobRequest = await upsert<{ id: ID }>({
    collection: 'job-requests',
    createData: {
      client: clientA.id,
      clientName: 'Acme Seed Technologies',
      contactEmail: 'hiring@acme-seed.com',
      contactPerson: 'Ravi Menon',
      contactPhone: '+91-9876500001',
      intakeSource: 'email',
      linkedJob: jobA.id,
      message: 'Need urgent frontend hiring for product launch.',
      notes: 'Seed intake request.',
      owningHeadRecruiter: head.id,
      priority: 'high',
      proposedDepartment: 'Engineering',
      proposedDescription: 'Need React + TS profile for platform rewrite.',
      proposedEmploymentType: 'fullTime',
      proposedExperienceMax: 8,
      proposedExperienceMin: 4,
      proposedLocation: 'Bangalore',
      proposedOpenings: 2,
      proposedRequiredSkills: [{ skill: 'React' }, { skill: 'TypeScript' }],
      proposedSalaryMax: 2600000,
      proposedSalaryMin: 1600000,
      proposedTitle: 'Senior Frontend Engineer',
      receivedAt: new Date().toISOString(),
      status: 'converted',
      subject: 'Frontend Hiring Intake - Acme',
    },
    updateData: {
      client: clientA.id,
      clientName: 'Acme Seed Technologies',
      contactEmail: 'hiring@acme-seed.com',
      contactPerson: 'Ravi Menon',
      contactPhone: '+91-9876500001',
      intakeSource: 'email',
      linkedJob: jobA.id,
      message: 'Need urgent frontend hiring for product launch.',
      notes: 'Seed intake request.',
      owningHeadRecruiter: head.id,
      priority: 'high',
      proposedDepartment: 'Engineering',
      proposedDescription: 'Need React + TS profile for platform rewrite.',
      proposedEmploymentType: 'fullTime',
      proposedExperienceMax: 8,
      proposedExperienceMin: 4,
      proposedLocation: 'Bangalore',
      proposedOpenings: 2,
      proposedRequiredSkills: [{ skill: 'React' }, { skill: 'TypeScript' }],
      proposedSalaryMax: 2600000,
      proposedSalaryMin: 1600000,
      proposedTitle: 'Senior Frontend Engineer',
      receivedAt: new Date().toISOString(),
      status: 'converted',
      subject: 'Frontend Hiring Intake - Acme',
    },
    where: {
      subject: {
        equals: 'Frontend Hiring Intake - Acme',
      },
    },
  })

  await upsert({
    collection: 'client-lead-assignments',
    createData: {
      assignedBy: head.id,
      client: clientA.id,
      headRecruiter: head.id,
      leadRecruiter: lead.id,
      notes: 'Seed assignment for lead visibility.',
      status: 'active',
    },
    updateData: {
      assignedBy: head.id,
      client: clientA.id,
      headRecruiter: head.id,
      leadRecruiter: lead.id,
      notes: 'Seed assignment for lead visibility.',
      status: 'active',
    },
    where: {
      and: [
        {
          client: {
            equals: clientA.id,
          },
        },
        {
          leadRecruiter: {
            equals: lead.id,
          },
        },
      ],
    },
  })

  await upsert({
    collection: 'job-lead-assignments',
    createData: {
      assignedBy: head.id,
      client: clientA.id,
      headRecruiter: head.id,
      job: jobA.id,
      leadRecruiter: lead.id,
      notes: 'Seed job to lead assignment.',
      status: 'active',
    },
    updateData: {
      assignedBy: head.id,
      client: clientA.id,
      headRecruiter: head.id,
      job: jobA.id,
      leadRecruiter: lead.id,
      notes: 'Seed job to lead assignment.',
      status: 'active',
    },
    where: {
      and: [
        {
          job: {
            equals: jobA.id,
          },
        },
        {
          leadRecruiter: {
            equals: lead.id,
          },
        },
      ],
    },
  })

  await upsert({
    collection: 'job-lead-assignments',
    createData: {
      assignedBy: head.id,
      client: clientB.id,
      headRecruiter: head.id,
      job: jobB.id,
      leadRecruiter: lead.id,
      notes: 'Seed second job to lead assignment.',
      status: 'active',
    },
    updateData: {
      assignedBy: head.id,
      client: clientB.id,
      headRecruiter: head.id,
      job: jobB.id,
      leadRecruiter: lead.id,
      notes: 'Seed second job to lead assignment.',
      status: 'active',
    },
    where: {
      and: [
        {
          job: {
            equals: jobB.id,
          },
        },
        {
          leadRecruiter: {
            equals: lead.id,
          },
        },
      ],
    },
  })

  await upsert({
    collection: 'recruiter-job-assignments',
    createData: {
      assignedBy: lead.id,
      job: jobA.id,
      leadRecruiter: lead.id,
      notes: 'Seed recruiter assignment for job A.',
      recruiter: recruiterOne.id,
      status: 'active',
    },
    updateData: {
      assignedBy: lead.id,
      job: jobA.id,
      leadRecruiter: lead.id,
      notes: 'Seed recruiter assignment for job A.',
      recruiter: recruiterOne.id,
      status: 'active',
    },
    where: {
      and: [
        {
          job: {
            equals: jobA.id,
          },
        },
        {
          recruiter: {
            equals: recruiterOne.id,
          },
        },
      ],
    },
  })

  await upsert({
    collection: 'recruiter-job-assignments',
    createData: {
      assignedBy: lead.id,
      job: jobB.id,
      leadRecruiter: lead.id,
      notes: 'Seed recruiter assignment for job B.',
      recruiter: recruiterTwo.id,
      status: 'active',
    },
    updateData: {
      assignedBy: lead.id,
      job: jobB.id,
      leadRecruiter: lead.id,
      notes: 'Seed recruiter assignment for job B.',
      recruiter: recruiterTwo.id,
      status: 'active',
    },
    where: {
      and: [
        {
          job: {
            equals: jobB.id,
          },
        },
        {
          recruiter: {
            equals: recruiterTwo.id,
          },
        },
      ],
    },
  })

  const mediaLookup = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      alt: {
        equals: 'Seed Company Note',
      },
    },
  })

  if (mediaLookup.totalDocs === 0) {
    await payload.create({
      collection: 'media',
      data: {
        alt: 'Seed Company Note',
      },
      filePath: seedMediaPath,
      overrideAccess: true,
    })
    stats.created += 1
  } else {
    const mediaDoc = mediaLookup.docs[0] as { id: ID }
    await payload.update({
      collection: 'media',
      data: {
        alt: 'Seed Company Note',
      },
      id: mediaDoc.id,
      overrideAccess: true,
    })
    stats.updated += 1
  }

  const resumeLookup = await payload.find({
    collection: 'candidate-resumes',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    user: admin,
    where: {
      and: [
        {
          alt: {
            equals: 'Seed Resume - Candidate One',
          },
        },
        {
          sourceJob: {
            equals: jobA.id,
          },
        },
      ],
    },
  })

  let candidateResume: { id: ID }

  if (resumeLookup.totalDocs === 0) {
    candidateResume = (await payload.create({
      collection: 'candidate-resumes',
      data: {
        alt: 'Seed Resume - Candidate One',
        sourceJob: jobA.id,
        uploadedBy: recruiterOne.id,
      },
      filePath: seedResumePath,
      overrideAccess: false,
      user: admin,
    })) as { id: ID }
    stats.created += 1
  } else {
    candidateResume = resumeLookup.docs[0] as { id: ID }
    await payload.update({
      collection: 'candidate-resumes',
      data: {
        alt: 'Seed Resume - Candidate One',
        sourceJob: jobA.id,
        uploadedBy: recruiterOne.id,
      },
      id: candidateResume.id,
      overrideAccess: false,
      user: admin,
    })
    stats.updated += 1
  }

  const candidateOne = await upsert<{ id: ID }>({
    collection: 'candidates',
    createData: {
      currentCompany: 'Seed Corp',
      currentLocation: 'Bangalore',
      currentRole: 'Frontend Developer',
      email: 'candidate.one.seed@example.com',
      expectedSalary: 2200000,
      fullName: 'Candidate One Seed',
      linkedInURL: 'https://www.linkedin.com/in/candidate-one-seed/',
      noticePeriodDays: 30,
      notes: 'Strong frontend profile from seeded pool.',
      phone: '+91-9900000001',
      portfolioURL: 'https://portfolio.candidate-one-seed.dev',
      resume: candidateResume.id,
      source: 'linkedin',
      sourceDetails: 'Inbound LinkedIn sourcing',
      sourceJob: jobA.id,
      sourcedBy: recruiterOne.id,
      totalExperienceYears: 5,
    },
    updateData: {
      currentCompany: 'Seed Corp',
      currentLocation: 'Bangalore',
      currentRole: 'Frontend Developer',
      email: 'candidate.one.seed@example.com',
      expectedSalary: 2200000,
      fullName: 'Candidate One Seed',
      linkedInURL: 'https://www.linkedin.com/in/candidate-one-seed/',
      noticePeriodDays: 30,
      notes: 'Strong frontend profile from seeded pool.',
      phone: '+91-9900000001',
      portfolioURL: 'https://portfolio.candidate-one-seed.dev',
      resume: candidateResume.id,
      source: 'linkedin',
      sourceDetails: 'Inbound LinkedIn sourcing',
      sourceJob: jobA.id,
      sourcedBy: recruiterOne.id,
      totalExperienceYears: 5,
    },
    where: {
      email: {
        equals: 'candidate.one.seed@example.com',
      },
    },
  })

  const candidateTwo = await upsert<{ id: ID }>({
    collection: 'candidates',
    createData: {
      currentCompany: 'Platform Labs',
      currentLocation: 'Hyderabad',
      currentRole: 'Backend Engineer',
      email: 'candidate.two.seed@example.com',
      expectedSalary: 2400000,
      fullName: 'Candidate Two Seed',
      noticePeriodDays: 45,
      notes: 'Backend profile for seeded assignment.',
      phone: '+91-9900000002',
      source: 'naukri',
      sourceDetails: 'Sourced via Naukri',
      sourceJob: jobB.id,
      sourcedBy: recruiterTwo.id,
      totalExperienceYears: 6,
    },
    updateData: {
      currentCompany: 'Platform Labs',
      currentLocation: 'Hyderabad',
      currentRole: 'Backend Engineer',
      email: 'candidate.two.seed@example.com',
      expectedSalary: 2400000,
      fullName: 'Candidate Two Seed',
      noticePeriodDays: 45,
      notes: 'Backend profile for seeded assignment.',
      phone: '+91-9900000002',
      source: 'naukri',
      sourceDetails: 'Sourced via Naukri',
      sourceJob: jobB.id,
      sourcedBy: recruiterTwo.id,
      totalExperienceYears: 6,
    },
    where: {
      email: {
        equals: 'candidate.two.seed@example.com',
      },
    },
  })

  const candidateUserOne = await upsert<{ id: ID }>({
    collection: 'candidate-users',
    createData: {
      candidateProfile: candidateOne.id,
      email: 'candidate.one.seed@example.com',
      fullName: 'Candidate One Seed',
      isActive: true,
      onboardingMethod: 'password',
      password: 'Candidate@123',
      role: 'candidate',
    },
    updateData: {
      candidateProfile: candidateOne.id,
      email: 'candidate.one.seed@example.com',
      fullName: 'Candidate One Seed',
      isActive: true,
      onboardingMethod: 'password',
      role: 'candidate',
    },
    where: {
      email: {
        equals: 'candidate.one.seed@example.com',
      },
    },
  })

  await payload.update({
    collection: 'candidates',
    data: {
      candidateAccount: candidateUserOne.id,
      profileCompletedAt: new Date().toISOString(),
    },
    id: candidateOne.id,
    overrideAccess: false,
    user: admin,
  })
  stats.updated += 1

  const applicationOne = await upsert<{ id: ID }>({
    collection: 'applications',
    createData: {
      candidate: candidateOne.id,
      candidateAccount: candidateUserOne.id,
      latestComment: 'Seed candidate submitted through portal.',
      notes: 'Ready for downstream client submission in later phases.',
      recruiter: recruiterOne.id,
      stage: 'candidateApplied',
      job: jobA.id,
      createdBy: recruiterOne.id,
    },
    updateData: {
      candidate: candidateOne.id,
      candidateAccount: candidateUserOne.id,
      latestComment: 'Seed candidate submitted through portal.',
      notes: 'Ready for downstream client submission in later phases.',
      recruiter: recruiterOne.id,
      stage: 'candidateApplied',
      job: jobA.id,
    },
    where: {
      and: [
        {
          candidate: {
            equals: candidateOne.id,
          },
        },
        {
          job: {
            equals: jobA.id,
          },
        },
      ],
    },
  })

  const applicationTwo = await upsert<{ id: ID }>({
    collection: 'applications',
    createData: {
      candidate: candidateTwo.id,
      latestComment: 'Seed recruiter submission pending lead review.',
      notes: 'Needs lead recruiter review action.',
      recruiter: recruiterTwo.id,
      stage: 'internalReviewPending',
      job: jobB.id,
      createdBy: recruiterTwo.id,
    },
    updateData: {
      candidate: candidateTwo.id,
      latestComment: 'Seed recruiter submission pending lead review.',
      notes: 'Needs lead recruiter review action.',
      recruiter: recruiterTwo.id,
      stage: 'internalReviewPending',
      job: jobB.id,
    },
    where: {
      and: [
        {
          candidate: {
            equals: candidateTwo.id,
          },
        },
        {
          job: {
            equals: jobB.id,
          },
        },
      ],
    },
  })

  await upsert({
    collection: 'application-stage-history',
    createData: {
      actor: lead.id,
      application: applicationOne.id,
      candidate: candidateOne.id,
      candidateAccount: candidateUserOne.id,
      changedAt: new Date().toISOString(),
      comment: 'Seeded historical stage entry.',
      fromStage: 'candidateInvited',
      job: jobA.id,
      recruiter: recruiterOne.id,
      toStage: 'candidateApplied',
    },
    updateData: {
      actor: lead.id,
      application: applicationOne.id,
      candidate: candidateOne.id,
      candidateAccount: candidateUserOne.id,
      changedAt: new Date().toISOString(),
      comment: 'Seeded historical stage entry.',
      fromStage: 'candidateInvited',
      job: jobA.id,
      recruiter: recruiterOne.id,
      toStage: 'candidateApplied',
    },
    where: {
      and: [
        {
          application: {
            equals: applicationOne.id,
          },
        },
        {
          toStage: {
            equals: 'candidateApplied',
          },
        },
      ],
    },
  })

  await upsert({
    collection: 'candidate-invites',
    createData: {
      accountAccessSentAt: new Date().toISOString(),
      application: applicationOne.id,
      candidate: candidateOne.id,
      consumedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      inviteEmail: 'candidate.one.seed@example.com',
      sentAt: new Date().toISOString(),
      sentBy: lead.id,
      status: 'consumed',
      tokenHash: buildCandidateInviteTokenHash('seed-consumed-invite-token'),
    },
    updateData: {
      accountAccessSentAt: new Date().toISOString(),
      application: applicationOne.id,
      candidate: candidateOne.id,
      consumedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      inviteEmail: 'candidate.one.seed@example.com',
      sentAt: new Date().toISOString(),
      sentBy: lead.id,
      status: 'consumed',
      tokenHash: buildCandidateInviteTokenHash('seed-consumed-invite-token'),
    },
    where: {
      and: [
        {
          application: {
            equals: applicationOne.id,
          },
        },
        {
          inviteEmail: {
            equals: 'candidate.one.seed@example.com',
          },
        },
      ],
    },
  })

  await upsert({
    collection: 'candidate-invites',
    createData: {
      application: applicationTwo.id,
      candidate: candidateTwo.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
      inviteEmail: 'candidate.two.seed@example.com',
      sentAt: new Date().toISOString(),
      sentBy: lead.id,
      status: 'pending',
      tokenHash: buildCandidateInviteTokenHash('seed-pending-invite-token'),
    },
    updateData: {
      application: applicationTwo.id,
      candidate: candidateTwo.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
      inviteEmail: 'candidate.two.seed@example.com',
      sentAt: new Date().toISOString(),
      sentBy: lead.id,
      status: 'pending',
      tokenHash: buildCandidateInviteTokenHash('seed-pending-invite-token'),
    },
    where: {
      and: [
        {
          application: {
            equals: applicationTwo.id,
          },
        },
        {
          inviteEmail: {
            equals: 'candidate.two.seed@example.com',
          },
        },
      ],
    },
  })

  const summaryCounts = await Promise.all([
    payload.count({ collection: 'users', overrideAccess: true }),
    payload.count({ collection: 'candidate-users', overrideAccess: true }),
    payload.count({ collection: 'clients', overrideAccess: true }),
    payload.count({ collection: 'jobs', overrideAccess: true }),
    payload.count({ collection: 'job-requests', overrideAccess: true }),
    payload.count({ collection: 'client-lead-assignments', overrideAccess: true }),
    payload.count({ collection: 'job-lead-assignments', overrideAccess: true }),
    payload.count({ collection: 'recruiter-job-assignments', overrideAccess: true }),
    payload.count({ collection: 'candidate-resumes', overrideAccess: true }),
    payload.count({ collection: 'media', overrideAccess: true }),
    payload.count({ collection: 'candidates', overrideAccess: true }),
    payload.count({ collection: 'applications', overrideAccess: true }),
    payload.count({ collection: 'application-stage-history', overrideAccess: true }),
    payload.count({ collection: 'candidate-invites', overrideAccess: true }),
  ])

  console.log('\nSeed completed successfully.')
  console.log(`Created: ${stats.created}, Updated: ${stats.updated}`)
  console.log('Collection totals:')
  console.log(`users: ${summaryCounts[0].totalDocs}`)
  console.log(`candidate-users: ${summaryCounts[1].totalDocs}`)
  console.log(`clients: ${summaryCounts[2].totalDocs}`)
  console.log(`jobs: ${summaryCounts[3].totalDocs}`)
  console.log(`job-requests: ${summaryCounts[4].totalDocs}`)
  console.log(`client-lead-assignments: ${summaryCounts[5].totalDocs}`)
  console.log(`job-lead-assignments: ${summaryCounts[6].totalDocs}`)
  console.log(`recruiter-job-assignments: ${summaryCounts[7].totalDocs}`)
  console.log(`candidate-resumes: ${summaryCounts[8].totalDocs}`)
  console.log(`media: ${summaryCounts[9].totalDocs}`)
  console.log(`candidates: ${summaryCounts[10].totalDocs}`)
  console.log(`applications: ${summaryCounts[11].totalDocs}`)
  console.log(`application-stage-history: ${summaryCounts[12].totalDocs}`)
  console.log(`candidate-invites: ${summaryCounts[13].totalDocs}`)
  console.log('\nSeed credentials:')
  console.log('Internal users password: SeedPass@123')
  console.log('Candidate user password: Candidate@123')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nSeed failed.')
    console.error(error)
    process.exit(1)
  })
