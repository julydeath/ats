'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'

import { CANDIDATE_SOURCE_OPTIONS } from '@/lib/constants/recruitment'

type FileState = 'pending' | 'uploading' | 'uploaded' | 'error'

type QueuedFile = {
  error?: string
  file: File
  key: string
  state: FileState
}

type BulkResumeUploaderProps = {
  createURL: string
  filesBaseURL: string
  maxFileSizeBytes: number
  maxFiles: number
}

const ACCEPTED_EXTENSIONS = ['pdf', 'docx']

const getExtension = (filename: string): string => filename.split('.').pop()?.toLowerCase() || ''

const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`

export function BulkResumeUploader({
  createURL,
  filesBaseURL,
  maxFileSizeBytes,
  maxFiles,
}: BulkResumeUploaderProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState('')
  const [sourceDetails, setSourceDetails] = useState('')
  const [files, setFiles] = useState<QueuedFile[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [formError, setFormError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!isUploading) return

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [isUploading])

  const addFiles = (incoming: FileList | File[]) => {
    const nextRejected: string[] = []
    const existingKeys = new Set(files.map((item) => item.key))
    const accepted: QueuedFile[] = []

    Array.from(incoming).forEach((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`

      if (existingKeys.has(key)) return

      if (getExtension(file.name) === 'doc') {
        nextRejected.push(`${file.name}: old .doc files can't be read. Save as PDF or DOCX.`)
        return
      }

      if (!ACCEPTED_EXTENSIONS.includes(getExtension(file.name))) {
        nextRejected.push(`${file.name}: only PDF or DOCX files.`)
        return
      }

      if (file.size > maxFileSizeBytes) {
        nextRejected.push(`${file.name}: larger than ${formatSize(maxFileSizeBytes)}.`)
        return
      }

      if (files.length + accepted.length >= maxFiles) {
        nextRejected.push(`${file.name}: only ${maxFiles} resumes per upload.`)
        return
      }

      existingKeys.add(key)
      accepted.push({ file, key, state: 'pending' })
    })

    setSummary('')
    setRejected(nextRejected)
    setFiles((current) => [...current.filter((item) => item.state !== 'uploaded'), ...accepted])
  }

  const removeFile = (key: string) => {
    setFiles((current) => current.filter((item) => item.key !== key))
  }

  const updateFile = (key: string, patch: Partial<QueuedFile>) => {
    setFiles((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)

    if (!isUploading && event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files)
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setSummary('')

    const pendingFiles = files.filter((item) => item.state === 'pending')

    if (!source) {
      setFormError('Choose which platform these resumes came from.')
      return
    }

    if (source === 'other' && !sourceDetails.trim()) {
      setFormError('Type the platform name.')
      return
    }

    if (pendingFiles.length === 0) {
      setFormError('Choose at least one resume.')
      return
    }

    setIsUploading(true)

    try {
      const createResponse = await fetch(createURL, {
        body: JSON.stringify({ fileCount: pendingFiles.length, source, sourceDetails }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const created = (await createResponse.json().catch(() => ({}))) as {
        batchId?: number
        error?: string
      }

      if (!createResponse.ok || !created.batchId) {
        setFormError(created.error || 'Upload could not start. Please try again.')
        return
      }

      let uploadedCount = 0

      // One file per request keeps each request under the hosting body limit.
      for (const item of pendingFiles) {
        updateFile(item.key, { state: 'uploading' })

        const body = new FormData()
        body.append('resume', item.file)

        const response = await fetch(`${filesBaseURL}/${created.batchId}/files`, {
          body,
          method: 'POST',
        }).catch(() => null)
        const result = (await response?.json().catch(() => ({}))) as { error?: string } | undefined

        if (response?.ok) {
          uploadedCount += 1
          updateFile(item.key, { state: 'uploaded' })
        } else {
          updateFile(item.key, {
            error: result?.error || 'Upload failed. Check your connection and try again.',
            state: 'error',
          })
        }
      }

      setSummary(
        uploadedCount === pendingFiles.length
          ? `${uploadedCount} resume${uploadedCount === 1 ? '' : 's'} uploaded. Candidates are being created in the background, so you can leave this page.`
          : `${uploadedCount} of ${pendingFiles.length} uploaded. Remove the failed files or try them again.`,
      )
      setFiles((current) => current.filter((item) => item.state !== 'uploaded'))
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    } finally {
      setIsUploading(false)
    }
  }

  const retryFailed = () => {
    setFiles((current) =>
      current.map((item) => (item.state === 'error' ? { ...item, error: undefined, state: 'pending' } : item)),
    )
  }

  const pendingCount = files.filter((item) => item.state === 'pending').length
  const hasErrors = files.some((item) => item.state === 'error')

  return (
    <form className="candidate-import-form" onSubmit={onSubmit}>
      <section className="candidate-import-card">
        <div className="candidate-import-fields">
          <label>
            <span>Platform</span>
            <select
              disabled={isUploading}
              onChange={(event) => setSource(event.target.value)}
              required
              value={source}
            >
              <option value="">Where are these resumes from?</option>
              {CANDIDATE_SOURCE_OPTIONS.map((option) => (
                <option key={`bulk-source-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {source === 'other' ? (
            <label>
              <span>Platform name</span>
              <input
                disabled={isUploading}
                maxLength={80}
                onChange={(event) => setSourceDetails(event.target.value)}
                placeholder="e.g. Monster, Foundit"
                required
                value={sourceDetails}
              />
            </label>
          ) : null}
        </div>

        <label
          className={`candidate-bulk-dropzone${isDragging ? ' candidate-bulk-dropzone-active' : ''}`}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDrop={onDrop}
        >
          <input
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={isUploading}
            multiple
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files)
              event.target.value = ''
            }}
            ref={inputRef}
            type="file"
          />
          <strong>Drop resumes here or click to choose</strong>
          <small>
            Up to {maxFiles} files · PDF or DOCX · {formatSize(maxFileSizeBytes)} each
          </small>
        </label>

        {rejected.length > 0 ? (
          <ul className="candidate-import-error candidate-bulk-rejected">
            {rejected.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        {files.length > 0 ? (
          <ul className="candidate-bulk-file-list">
            {files.map((item) => (
              <li className={`candidate-bulk-file candidate-bulk-file-${item.state}`} key={item.key}>
                <div>
                  <strong>{item.file.name}</strong>
                  <small>{item.error || formatSize(item.file.size)}</small>
                </div>
                {item.state === 'pending' || item.state === 'error' ? (
                  <button
                    aria-label={`Remove ${item.file.name}`}
                    className="candidate-bulk-file-remove"
                    disabled={isUploading}
                    onClick={() => removeFile(item.key)}
                    type="button"
                  >
                    ×
                  </button>
                ) : (
                  <span className="candidate-bulk-file-state">
                    {item.state === 'uploading' ? 'Uploading…' : 'Uploaded'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        {formError ? (
          <p className="candidate-intake-message candidate-intake-message-error">{formError}</p>
        ) : null}
        {summary ? (
          <p className="candidate-intake-message candidate-intake-message-success">{summary}</p>
        ) : null}
      </section>

      <footer className="candidate-intake-footer">
        {hasErrors && !isUploading ? (
          <button className="candidate-intake-cancel" onClick={retryFailed} type="button">
            Try failed again
          </button>
        ) : null}
        <button
          className="candidate-intake-submit"
          disabled={isUploading || pendingCount === 0}
          type="submit"
        >
          {isUploading
            ? 'Uploading…'
            : `Upload${pendingCount > 0 ? ` ${pendingCount} resume${pendingCount === 1 ? '' : 's'}` : ''}`}
        </button>
      </footer>
    </form>
  )
}
