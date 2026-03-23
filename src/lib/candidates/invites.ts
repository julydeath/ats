import { APIError, type Payload } from 'payload'

import { buildCandidateInviteTokenHash, hasInviteExpired } from '@/lib/auth/candidate-invites'
import { extractRelationshipID } from '@/lib/utils/relationships'

type InviteLookupOptions = {
  payload: Payload
  token: string
}

export const findActiveCandidateInviteByToken = async ({ payload, token }: InviteLookupOptions) => {
  const tokenHash = buildCandidateInviteTokenHash(token)

  const inviteLookup = await payload.find({
    collection: 'candidate-invites',
    depth: 2,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        {
          tokenHash: {
            equals: tokenHash,
          },
        },
        {
          status: {
            equals: 'pending',
          },
        },
      ],
    },
  })

  if (inviteLookup.totalDocs === 0) {
    return null
  }

  const invite = inviteLookup.docs[0]

  if (hasInviteExpired(invite.expiresAt)) {
    await payload.update({
      collection: 'candidate-invites',
      id: invite.id,
      data: {
        status: 'expired',
      },
      overrideAccess: true,
    })

    return null
  }

  return invite
}

export const assertInviteApplicationLinkage = (invite: Record<string, unknown>) => {
  const applicationID = extractRelationshipID(invite.application)
  const candidateID = extractRelationshipID(invite.candidate)

  if (!applicationID || !candidateID) {
    throw new APIError('Invite is missing application or candidate linkage.', 400)
  }

  return {
    applicationID,
    candidateID,
  }
}
