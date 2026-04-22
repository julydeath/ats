import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import type { ReactNode } from 'react'

import { AppQueryProvider } from '@/components/providers/AppQueryProvider'

import './styles.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['500', '600', '700', '800'],
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
      <body className={manrope.variable}>
        <AppQueryProvider>
          <main className="app-root">{children}</main>
        </AppQueryProvider>
      </body>
    </html>
  )
}
