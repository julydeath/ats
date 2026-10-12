import { describe, expect, it } from 'vitest'

import { getResumeImportMimeType } from '@/lib/candidates/resume-import-validation'

describe('Resume imports', () => {
  it('accepts valid resume MIME types', () => {
    expect(
      getResumeImportMimeType({
        filename: 'resume.pdf',
        mimeType: 'application/pdf',
      }),
    ).toBe('application/pdf')
  })

  it('infers MIME type from resume filename when browsers send a generic type', () => {
    expect(
      getResumeImportMimeType({
        filename: 'candidate-profile.docx',
        mimeType: '',
      }),
    ).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')

    expect(
      getResumeImportMimeType({
        filename: 'candidate-profile.doc',
        mimeType: 'application/octet-stream',
      }),
    ).toBe('application/msword')
  })

  it('rejects unsupported import file extensions', () => {
    expect(
      getResumeImportMimeType({
        filename: 'headshot.png',
        mimeType: 'image/png',
      }),
    ).toBeNull()
  })
})
