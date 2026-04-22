import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.team.base, request.url)

const readString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.trim() : ''

const readNumber = (value: FormDataEntryValue | null): number => {
  const raw = readString(value)
  if (!raw) return 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

const readRequiredNumber = (value: FormDataEntryValue | null): number | null => {
  const raw = readString(value)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

const readBoolean = (value: FormDataEntryValue | null): boolean =>
  readString(value).toLowerCase() === 'on' || readString(value).toLowerCase() === 'true'

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: request.headers })
  const actor = auth.user as InternalUserLike

  if (!actor || !hasInternalRole(actor, ['admin'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  try {
    const formData = await request.formData()
    const employeeID = readRequiredNumber(formData.get('employeeId'))
    const effectiveFrom = readString(formData.get('effectiveFrom'))

    const annualCTC = readRequiredNumber(formData.get('annualCTC'))
    const monthlyGross = readRequiredNumber(formData.get('monthlyGross'))
    const basicMonthly = readRequiredNumber(formData.get('basicMonthly'))

    const hraMonthly = readNumber(formData.get('hraMonthly'))
    const specialAllowanceMonthly = readNumber(formData.get('specialAllowanceMonthly'))
    const otherAllowanceMonthly = readNumber(formData.get('otherAllowanceMonthly'))
    const variableMonthly = readNumber(formData.get('variableMonthly'))
    const reimbursementMonthly = readNumber(formData.get('reimbursementMonthly'))
    const taxRegime = readString(formData.get('taxRegime')) === 'old' ? 'old' : 'new'

    if (!employeeID || !effectiveFrom || annualCTC === null || monthlyGross === null || basicMonthly === null) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Employee, effective date, annual CTC, monthly gross, and basic are required.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const activeCompensations = await payload.find({
      collection: 'employee-compensation',
      depth: 0,
      limit: 50,
      overrideAccess: false,
      pagination: false,
      user: actor,
      where: {
        and: [
          {
            employee: {
              equals: employeeID,
            },
          },
          {
            isActive: {
              equals: true,
            },
          },
        ],
      },
    })

    const effectiveFromDate = new Date(effectiveFrom)
    effectiveFromDate.setHours(0, 0, 0, 0)
    const previousEffectiveTo = new Date(effectiveFromDate)
    previousEffectiveTo.setDate(previousEffectiveTo.getDate() - 1)

    for (const activeComp of activeCompensations.docs) {
      await payload.update({
        collection: 'employee-compensation',
        data: {
          effectiveTo: previousEffectiveTo.toISOString(),
          isActive: false,
        },
        id: activeComp.id,
        overrideAccess: false,
        user: actor,
      })
    }

    await payload.create({
      collection: 'employee-compensation',
      data: {
        annualCTC,
        basicMonthly,
        effectiveFrom: effectiveFromDate.toISOString(),
        employee: employeeID,
        esiEnabled: readBoolean(formData.get('esiEnabled')),
        hraMonthly,
        isActive: true,
        lwfEnabled: readBoolean(formData.get('lwfEnabled')),
        monthlyGross,
        otherAllowanceMonthly,
        pfEnabled: readBoolean(formData.get('pfEnabled')),
        professionalTaxEnabled: readBoolean(formData.get('professionalTaxEnabled')),
        reimbursementMonthly,
        specialAllowanceMonthly,
        taxRegime,
        tdsEnabled: readBoolean(formData.get('tdsEnabled')),
        variableMonthly,
      },
      overrideAccess: false,
      user: actor,
    })

    await payload.update({
      collection: 'employee-profiles',
      data: {
        payoutReady: true,
      },
      id: employeeID,
      overrideAccess: false,
      user: actor,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'compensationSaved')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to save compensation.',
    )
    return NextResponse.redirect(redirectURL, 303)
  }
}
