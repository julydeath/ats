import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'

import { AppQueryProvider } from '@/components/providers/AppQueryProvider'
import { BRAND } from '@/lib/constants/brand'

import './styles.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  description:
    'Recruitment Operations Platform for Realizing Dreams INSPiREX HR Services (Internal + Candidate architecture).',
  icons: {
    apple: BRAND.logoSrc,
    icon: BRAND.logoSrc,
  },
  title: {
    default: `${BRAND.name} HR`,
    template: `%s | ${BRAND.name} HR`,
  },
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
