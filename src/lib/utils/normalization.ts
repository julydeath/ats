import { createHash } from 'crypto'

export const compactWhitespace = (value: unknown): string =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

export const normalizeText = (value: unknown): string => compactWhitespace(value).toLowerCase()

export const normalizeEmail = (value: unknown): string => normalizeText(value)

export const normalizePhone = (value: unknown): string => String(value || '').replace(/\D/g, '')

export const buildStableHash = (value: string): string =>
  createHash('sha256').update(value).digest('hex')
