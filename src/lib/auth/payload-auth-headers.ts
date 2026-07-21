import { headers as getHeaders } from 'next/headers'

import { PAYLOAD_AUTH_COOKIE_NAME } from '@/lib/constants/routes'

const hasPayloadTokenCookie = (headers: Headers): boolean => {
  const cookieHeader = headers.get('cookie') || headers.get('Cookie') || ''

  return cookieHeader.includes(`${PAYLOAD_AUTH_COOKIE_NAME}=`)
}

const readFirstHeaderValue = (headers: Headers, name: string): string =>
  (headers.get(name) || '').split(',')[0]?.trim() || ''

const getOriginHost = (origin: string): string => {
  try {
    return new URL(origin).host.toLowerCase()
  } catch {
    return ''
  }
}

const getRequestHosts = (headers: Headers): string[] =>
  Array.from(
    new Set(
      [
        readFirstHeaderValue(headers, 'host'),
        readFirstHeaderValue(headers, 'x-forwarded-host'),
      ]
        .map((host) => host.toLowerCase())
        .filter(Boolean),
    ),
  )

const isSameOriginRequest = (headers: Headers): boolean => {
  const origin = headers.get('origin') || headers.get('Origin') || ''
  const originHost = getOriginHost(origin)

  return Boolean(originHost && getRequestHosts(headers).includes(originHost))
}

export const normalizePayloadAuthHeaders = (requestHeaders: Headers): Headers => {
  const normalizedHeaders = new Headers(requestHeaders)

  const hasOrigin = Boolean(normalizedHeaders.get('origin') || normalizedHeaders.get('Origin'))
  const hasSecFetchSite = Boolean(
    normalizedHeaders.get('sec-fetch-site') || normalizedHeaders.get('Sec-Fetch-Site'),
  )
  const secFetchSite =
    normalizedHeaders.get('sec-fetch-site') || normalizedHeaders.get('Sec-Fetch-Site') || ''

  if (
    hasPayloadTokenCookie(normalizedHeaders) &&
    hasOrigin &&
    isSameOriginRequest(normalizedHeaders) &&
    (!secFetchSite ||
      secFetchSite === 'same-origin' ||
      secFetchSite === 'same-site' ||
      secFetchSite === 'none')
  ) {
    // Payload validates any present Origin against config.csrf. On Vercel, a
    // stale app URL env can make same-host form POSTs look unauthenticated.
    normalizedHeaders.delete('origin')
    normalizedHeaders.set('Sec-Fetch-Site', 'same-origin')
    return normalizedHeaders
  }

  if (hasPayloadTokenCookie(normalizedHeaders) && !hasOrigin && !hasSecFetchSite) {
    // Payload's cookie JWT extraction rejects requests that have CSRF configured
    // but arrive without Origin and Sec-Fetch-Site. Treat authenticated internal
    // app requests as same-origin in that case so server components and route
    // handlers resolve the signed cookie consistently across environments.
    normalizedHeaders.set('Sec-Fetch-Site', 'same-origin')
  }

  return normalizedHeaders
}

export const getPayloadAuthHeaders = async (headers?: HeadersInit): Promise<Headers> => {
  const requestHeaders = headers ? new Headers(headers) : new Headers(await getHeaders())

  return normalizePayloadAuthHeaders(requestHeaders)
}
