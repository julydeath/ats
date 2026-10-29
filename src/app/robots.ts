import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'

// Only the public landing page is meant for search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: '/',
      disallow: ['/internal/', '/candidate/', '/admin', '/api/'],
      userAgent: '*',
    },
    sitemap: `${env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  }
}
