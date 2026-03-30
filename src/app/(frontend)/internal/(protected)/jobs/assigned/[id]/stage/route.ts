import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APPLICATION_STAGES, type ApplicationStage } from '@/lib/constants/recruitment'

type MoveStagePayload = {
  applicationId?: number
  latestComment?: string
  toStage?: ApplicationStage
}

const isStage = (value: unknown): value is ApplicationStage =>
  typeof value === 'string' && APPLICATION_STAGES.includes(value as ApplicationStage)

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  let body: MoveStagePayload | null = null

  try {
    body = (await request.json()) as MoveStagePayload
  } catch {
    return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 })
  }

  const applicationID = toNumber(body?.applicationId)
  const toStage = body?.toStage
  const latestComment =
    typeof body?.latestComment === 'string' && body.latestComment.trim().length > 0
      ? body.latestComment.trim()
      : undefined

  if (!applicationID || !isStage(toStage)) {
    return NextResponse.json({ message: 'applicationId and valid toStage are required.' }, { status: 400 })
  }

  try {
    const updated = await payload.update({
      collection: 'applications',
      data: {
        latestComment,
        stage: toStage,
      },
      id: applicationID,
      overrideAccess: false,
      user: internalUser,
    })

    return NextResponse.json({
      applicationId: updated.id,
      stage: updated.stage,
      success: true,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to move application stage.' },
      { status: 400 },
    )
  }
}
