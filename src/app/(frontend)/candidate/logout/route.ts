import { performLogout } from '@/lib/auth/logout'
import { APP_ROUTES } from '@/lib/constants/routes'

export async function POST(request: Request) {
  return performLogout({
    collectionSlug: 'candidate-users',
    loginPath: APP_ROUTES.candidate.login,
    request,
  })
}
