import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'

import { AppQueryProvider } from '@/components/providers/AppQueryProvider'

import './styles.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  description:
    'Recruitment Operations Platform for Realizing Dreams Inspirix HR Services (Internal + Candidate architecture).',
  title: {
    default: 'Recruitment Ops Platform',
    template: '%s | Recruitment Ops Platform',
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
