import { headers as getHeaders } from 'next/headers'

import { PAYLOAD_AUTH_COOKIE_NAME } from '@/lib/constants/routes'

const hasPayloadTokenCookie = (headers: Headers): boolean => {
  const cookieHeader = headers.get('cookie') || headers.get('Cookie') || ''

  return cookieHeader.includes(`${PAYLOAD_AUTH_COOKIE_NAME}=`)
}

export const normalizePayloadAuthHeaders = (requestHeaders: Headers): Headers => {
  const normalizedHeaders = new Headers(requestHeaders)

  const hasOrigin = Boolean(normalizedHeaders.get('origin') || normalizedHeaders.get('Origin'))
  const hasSecFetchSite = Boolean(
    normalizedHeaders.get('sec-fetch-site') || normalizedHeaders.get('Sec-Fetch-Site'),
  )

  if (hasPayloadTokenCookie(normalizedHeaders) && !hasOrigin && !hasSecFetchSite) {
    // Payload's cookie JWT extraction rejects requests that have CSRF configured
    // but arrive without Origin and Sec-Fetch-Site. Treat authenticated internal
    // app requests as same-origin in that case so server components and route
    // handlers resolve the signed cookie consistently across environments.
    normalizedHeaders.set('Sec-Fetch-Site', 'same-origin')
  }

  return normalizedHeaders
}

export const getPayloadAuthHeaders = async (): Promise<Headers> => {
  const requestHeaders = await getHeaders()

  return normalizePayloadAuthHeaders(new Headers(requestHeaders))
}
