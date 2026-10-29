import type { Metadata } from 'next'
import Link from 'next/link'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { BRAND } from '@/lib/constants/brand'
import { APP_ROUTES } from '@/lib/constants/routes'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  description: BRAND.description,
  title: {
    absolute: `${BRAND.productName} | Recruitment Operations Platform`,
  },
}

const HIGHLIGHTS = [
  {
    body: 'Bulk resume upload turns resumes into searchable candidates by skill and experience.',
    title: 'Candidate bank',
  },
  {
    body: 'Recruiter and lead ownership on every application, from sourcing to client interviews.',
    title: 'Hiring pipeline',
  },
  {
    body: 'Attendance, leave, payroll and team performance reports in the same workspace.',
    title: 'HR operations',
  },
] as const

export default function HomePage() {
  return (
    <div className="brand-landing">
      <main className="brand-landing-main">
        <BrandLogo className="brand-landing-logo" height={120} priority />

        <h1>Recruitment Operations Platform</h1>
        <p className="brand-landing-lead">
          One workspace for {BRAND.productName} recruiters, leads and HR to source candidates, run
          hiring pipelines and manage the team.
        </p>

        <div className="brand-landing-actions">
          <Link className="brand-button brand-button-primary" href={APP_ROUTES.internal.login}>
            Team sign in
          </Link>
          <Link className="brand-button brand-button-secondary" href={APP_ROUTES.candidate.login}>
            Candidate portal
          </Link>
        </div>

        <ul className="brand-landing-highlights">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="brand-footer">
        <span>
          © {new Date().getFullYear()} {BRAND.legalName}
        </span>
        <Link href={APP_ROUTES.payloadAdmin}>Admin console</Link>
      </footer>
    </div>
  )
}
