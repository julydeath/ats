import { APP_ROUTES } from '@/lib/constants/routes'

export const getSafeInternalRedirect = (
  nextPath: string | null | undefined,
  fallback: string = APP_ROUTES.internal.dashboard,
): string => {
  if (!nextPath) {
    return fallback
  }

  if (!nextPath.startsWith(APP_ROUTES.internal.base)) {
    return fallback
  }

  if (nextPath.startsWith('//')) {
    return fallback
  }

  return nextPath
}
