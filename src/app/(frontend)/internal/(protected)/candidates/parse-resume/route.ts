import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { parseResumeBuffer } from '@/lib/candidates/resume-parser'

const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'recruiter'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const resumeInput = formData.get('resume')

    if (!(resumeInput instanceof File) || resumeInput.size === 0) {
      return NextResponse.json({ message: 'Please choose a resume file first.' }, { status: 400 })
    }

    if (resumeInput.size > MAX_RESUME_SIZE_BYTES) {
      return NextResponse.json(
        { message: 'Resume is too large for parser. Maximum supported size is 10MB.' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await resumeInput.arrayBuffer())
    const parsedResult = await parseResumeBuffer({
      buffer,
      filename: resumeInput.name,
      mimeType: resumeInput.type || '',
    })

    return NextResponse.json({
      extractedTextPreview: parsedResult.extractedTextPreview,
      parsed: parsedResult.parsed,
      warnings: parsedResult.warnings,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Unable to parse resume right now.',
      },
      { status: 400 },
    )
  }
}
