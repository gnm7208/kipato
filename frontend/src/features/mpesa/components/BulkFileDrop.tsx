import { FileUp, LoaderCircle, X } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'
import { HardCard } from '../../../components/ui'
import type { BulkFormat } from '../../../lib/mpesa-bulk'

export interface LoadedFile {
  name: string
  size: number
  text: string
}

interface BulkFileDropProps {
  file: LoadedFile | null
  format: BulkFormat | null
  onLoad: (file: LoadedFile) => void
  onClear: () => void
  onError: (message: string) => void
}

// A few megabytes covers years of messages; beyond that the phone is the wrong
// place to be doing this.
const MAX_FILE_BYTES = 8_000_000
const ACCEPTED = '.xml,.csv,.txt,text/xml,text/csv,text/plain,application/xml'

export function BulkFileDrop({ file, format, onLoad, onClear, onError }: BulkFileDropProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [reading, setReading] = useState(false)

  const read = async (picked: File) => {
    if (picked.size > MAX_FILE_BYTES) {
      onError(`${picked.name} is larger than 8 MB. Split the export and import it in parts.`)
      return
    }

    setReading(true)
    try {
      onLoad({ name: picked.name, size: picked.size, text: await picked.text() })
    } catch {
      onError('That file could not be read. Try exporting it again.')
    } finally {
      setReading(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) void read(dropped)
  }

  if (file) {
    return (
      <HardCard className="flex items-center justify-between gap-3 p-4" shadow="none">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold">{file.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {formatBytes(file.size)}
            {format ? ` · read as ${formatLabel(format)}` : null}
          </p>
        </div>
        <button
          aria-label={`Remove ${file.name}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-paper"
          onClick={onClear}
          type="button"
        >
          <X aria-hidden="true" size={17} />
        </button>
      </HardCard>
    )
  }

  return (
    <div
      className={`border-3 border-dashed p-5 text-center transition-colors ${dragging ? 'border-ink bg-sun/30' : 'border-muted/60 bg-paper'}`}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDrop={handleDrop}
    >
      <input
        accept={ACCEPTED}
        className="sr-only"
        id={inputId}
        onChange={(event) => {
          const picked = event.target.files?.[0]
          if (picked) void read(picked)
          event.target.value = ''
        }}
        ref={inputRef}
        type="file"
      />
      <div className="flex flex-col items-center gap-2">
        {reading ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={24} />
        ) : (
          <FileUp aria-hidden="true" size={24} />
        )}
        <p className="font-display text-sm font-bold">
          {reading ? 'Reading your file…' : 'Import your whole M-PESA history'}
        </p>
        <p className="max-w-sm text-xs leading-5 text-muted">
          An SMS backup (.xml), an M-PESA statement (.csv), or a text file of messages.
          Everything already in your record is skipped automatically.
        </p>
        <label
          className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 border-3 border-ink bg-sun px-4 font-display text-sm font-bold shadow-[3px_3px_0_var(--color-ink)]"
          htmlFor={inputId}
        >
          Choose file
        </label>
      </div>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatLabel(format: BulkFormat) {
  if (format === 'xml') return 'an SMS backup'
  if (format === 'csv') return 'an M-PESA statement'
  return 'message text'
}
