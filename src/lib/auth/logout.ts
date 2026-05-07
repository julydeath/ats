import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { createLocalReq, generateExpiredPayloadCookie, getPayload, logoutOperation } from 'payload'

import { normalizePayloadAuthHeaders } from '@/lib/auth/payload-auth-headers'

type LogoutOptions = {
  collectionSlug: 'users' | 'candidate-users'
  loginPath: string
  request: Request
}

export const performLogout = async ({
  collectionSlug,
  loginPath,
  request,
}: LogoutOptions): Promise<NextResponse> => {
  const payload = await getPayload({ config: configPromise })
  const headers = normalizePayloadAuthHeaders(new Headers(request.headers))
  const auth = await payload.auth({ headers })
  const collection = payload.collections[collectionSlug]

  if (auth.user && auth.user.collection === collectionSlug) {
    const localReq = await createLocalReq(
      {
        req: {
          headers,
          user: auth.user,
        } as any,
      },
      payload,
    )

    try {
      await logoutOperation({
        allSessions: false,
        collection,
        req: localReq,
      })
    } catch {
      // Logout should be idempotent for the frontend. If session revocation
      // fails because the session is already gone, still expire the cookie and
      // redirect the user to login.
    }
  }

  const redirectURL = new URL(loginPath, request.url)
  const response = NextResponse.redirect(redirectURL, 303)
  const expiredCookie = generateExpiredPayloadCookie({
    collectionAuthConfig: collection.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
  })

  response.headers.append('Set-Cookie', expiredCookie)

  return response
}
