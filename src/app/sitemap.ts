import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      changeFrequency: 'monthly',
      priority: 1,
      url: `${env.NEXT_PUBLIC_APP_URL}/`,
    },
  ]
}
