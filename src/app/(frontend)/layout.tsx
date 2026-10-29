import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'

import { AppQueryProvider } from '@/components/providers/AppQueryProvider'
import { BRAND } from '@/lib/constants/brand'
import { env } from '@/lib/env'

import './styles.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  applicationName: BRAND.productName,
  description: BRAND.description,
  icons: {
    apple: BRAND.icon.src,
    icon: [{ sizes: '512x512', type: 'image/png', url: BRAND.icon.src }],
  },
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  openGraph: {
    description: BRAND.description,
    images: [{ alt: `${BRAND.productName} logo`, height: 512, url: BRAND.icon.src, width: 512 }],
    locale: 'en_IN',
    siteName: BRAND.productName,
    title: `${BRAND.productName} | Recruitment Operations Platform`,
    type: 'website',
  },
  title: {
    default: BRAND.productName,
    template: `%s | ${BRAND.productName}`,
  },
  twitter: {
    card: 'summary',
    description: BRAND.description,
    images: [BRAND.icon.src],
    title: `${BRAND.productName} | Recruitment Operations Platform`,
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <AppQueryProvider>
          <main className="app-root">{children}</main>
        </AppQueryProvider>
      </body>
    </html>
  )
}
