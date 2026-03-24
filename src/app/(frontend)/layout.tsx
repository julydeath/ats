import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import type { ReactNode } from 'react'

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
        <main className="app-root">{children}</main>
      </body>
    </html>
  )
}
