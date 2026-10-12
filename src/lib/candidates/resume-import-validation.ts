export const RESUME_IMPORT_MIME_TYPES = new Set<string>([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const RESUME_IMPORT_EXTENSION_MIME_TYPES: Record<string, string> = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
}

export const getResumeImportMimeType = ({
  filename,
  mimeType,
}: {
  filename?: string | null
  mimeType?: string | null
}): string | null => {
  const normalizedMimeType = (mimeType || '').split(';')[0]?.trim().toLowerCase() || ''

  if (RESUME_IMPORT_MIME_TYPES.has(normalizedMimeType)) {
    return normalizedMimeType
  }

  const extension = filename?.split('.').pop()?.trim().toLowerCase()

  if (extension && RESUME_IMPORT_EXTENSION_MIME_TYPES[extension]) {
    return RESUME_IMPORT_EXTENSION_MIME_TYPES[extension]
  }

  return null
}
