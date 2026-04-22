import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { APP_ROUTES, PAYLOAD_AUTH_COOKIE_NAME } from '@/lib/constants/routes'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const method = request.method.toUpperCase()

  // Avoid intercepting mutation requests (POST/PATCH/PUT/DELETE),
  // let route handlers perform auth checks and return contextual errors.
  if (method !== 'GET' && method !== 'HEAD') {
    return NextResponse.next()
  }

  if (pathname === APP_ROUTES.internal.login) {
    return NextResponse.next()
  }

  if (pathname === APP_ROUTES.candidate.login || pathname.startsWith(APP_ROUTES.candidate.inviteBase)) {
    return NextResponse.next()
  }

  const authToken = request.cookies.get(PAYLOAD_AUTH_COOKIE_NAME)?.value

  if (!authToken) {
    const isInternalPath = pathname.startsWith(APP_ROUTES.internal.base)
    const fallbackLoginRoute = isInternalPath ? APP_ROUTES.internal.login : APP_ROUTES.candidate.login
    const loginURL = new URL(APP_ROUTES.internal.login, request.url)
    loginURL.pathname = fallbackLoginRoute
    loginURL.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(loginURL)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/internal/:path*', '/candidate/:path*'],
}
