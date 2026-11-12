/**
 * The business operates on India Standard Time. Servers (Vercel) run in UTC,
 * so any server-side formatting or calendar-day math must convert explicitly.
 * IST has no daylight saving, so a fixed offset is exact.
 */
export const APP_TIME_ZONE = 'Asia/Kolkata'

const IST_OFFSET_MINUTES = 330

const shiftToIST = (value: Date): Date => new Date(value.getTime() + IST_OFFSET_MINUTES * 60_000)

/** Minutes since midnight in IST for the given instant. */
export const getISTMinutesOfDay = (value: Date): number => {
  const shifted = shiftToIST(value)
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes()
}

/**
 * The IST calendar day of the given instant, represented as UTC midnight of that day
 * (the storage convention used for date-only fields like attendance dates).
 */
export const toISTDateOnly = (value: string | Date): Date => {
  const shifted = shiftToIST(new Date(value))
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()))
}
