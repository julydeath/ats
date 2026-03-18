import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { APP_ROUTES, PAYLOAD_AUTH_COOKIE_NAME } from '@/lib/constants/routes'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (pathname === APP_ROUTES.internal.login) {
    return NextResponse.next()
  }

  const authToken = request.cookies.get(PAYLOAD_AUTH_COOKIE_NAME)?.value

  if (!authToken) {
    const loginURL = new URL(APP_ROUTES.internal.login, request.url)
    loginURL.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(loginURL)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/internal/:path*'],
}
