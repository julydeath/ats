import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './styles.css'

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
      <body>
        <main className="app-root">{children}</main>
      </body>
    </html>
  )
}
