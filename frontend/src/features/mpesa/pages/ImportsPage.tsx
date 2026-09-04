import { useQueryClient } from '@tanstack/react-query'
import { ClipboardPaste, LoaderCircle, RotateCcw, Send } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { InlineAlert, useToast } from '../../../components/feedback'
import { PageHeader } from '../../../components/layout'
import { BrutalistButton, Field, SegmentedControl, TextArea, TextInput } from '../../../components/ui'
import { queryKeys, useCreateMpesaImport, useMpesaImports } from '../../../data/hooks'
import { ApiError } from '../../../lib/http'
import { detectFormat, parseBulk } from '../../../lib/mpesa-bulk'
import { BulkFileDrop, type LoadedFile } from '../components/BulkFileDrop'
import { ImportHistory } from '../components/ImportHistory'
import { ParsedPreview } from '../components/ParsedPreview'

type ImportSource = 'paste' | 'file'

export function ImportsPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [source, setSource] = useState<ImportSource>('paste')
  const [sourceRef, setSourceRef] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [file, setFile] = useState<LoadedFile | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [lastResult, setLastResult] = useState<{ created: number; duplicates: number } | null>(null)
  const importsQuery = useMpesaImports()
  const createMutation = useCreateMpesaImport()

  const rawText = source === 'file' ? (file?.text ?? '') : pastedText
  const parsedEntries = useMemo(() => parseBulk(rawText), [rawText])
  const format = rawText ? detectFormat(rawText) : null

  const reset = () => {
    setSourceRef('')
    setPastedText('')
    setFile(null)
    setNote('')
    setError('')
    setLastResult(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!sourceRef.trim()) {
      setError('Add an import reference so you can find this batch later.')
      return
    }
    if (!rawText.trim()) {
      setError(source === 'file' ? 'Choose a file to import first.' : 'Paste the M-PESA message text first.')
      return
    }
    if (parsedEntries.length === 0) {
      setError('No incoming M-PESA payments were found. Money you sent or paid out is never imported as income.')
      return
    }

    setError('')
    try {
      const result = await createMutation.mutateAsync({
        source_ref: sourceRef.trim(),
        raw_text: rawText,
        note: note.trim(),
        file_name: source === 'file' ? file?.name : undefined,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.imports })
      await queryClient.invalidateQueries({ queryKey: ['income'] })

      const created = result.created_count ?? result.entries_count
      const duplicates = result.duplicate_count ?? 0
      setLastResult({ created, duplicates })
      showToast({
        title: created > 0 ? 'Import saved' : 'Nothing new to add',
        description: created > 0
          ? `${created} ${created === 1 ? 'payment' : 'payments'} added to your record.`
          : 'Every payment in that file was already in your record.',
        variant: created > 0 ? 'success' : 'info',
      })
      setPastedText('')
      setFile(null)
      setSourceRef('')
      setNote('')
    } catch (mutationError: unknown) {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Could not save this import. Try again.')
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        description="Bring in your digital payments and make your record easier to verify."
        eyebrow="Digital payments"
        title="M-PESA Sync"
      />
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div>
          <div className="flex gap-3 border-2 border-ink bg-sun/25 p-4">
            <ClipboardPaste aria-hidden="true" className="mt-0.5 shrink-0" size={22} />
            <p className="text-sm leading-6">
              Paste one message, or import your whole history at once from a phone SMS backup or an
              M-PESA statement. Only money you <strong>received</strong> becomes income, and anything
              already in your record is skipped.
            </p>
          </div>

          {lastResult ? (
            <div className="mt-4">
              <InlineAlert tone="info" title={lastResult.created > 0 ? 'Import saved' : 'Nothing new to add'}>
                {lastResult.created} added
                {lastResult.duplicates > 0 ? `, ${lastResult.duplicates} already in your record` : null}.
              </InlineAlert>
            </div>
          ) : null}
          {error ? <div className="mt-4"><InlineAlert>{error}</InlineAlert></div> : null}

          <form className="mt-5" onSubmit={submit}>
            <div className="space-y-5">
              <SegmentedControl
                label="Where the records come from"
                onChange={(value) => {
                  setSource(value)
                  setError('')
                }}
                options={[
                  { value: 'paste', label: 'Paste' },
                  { value: 'file', label: 'Whole history' },
                ]}
                value={source}
              />

              <Field hint="Example: September-payments" id="import-reference" label="Import reference" required>
                <TextInput
                  id="import-reference"
                  onChange={(event) => setSourceRef(event.target.value)}
                  placeholder={source === 'file' ? 'Phone backup' : 'September payments'}
                  value={sourceRef}
                />
              </Field>

              {source === 'file' ? (
                <BulkFileDrop
                  file={file}
                  format={format}
                  onClear={() => setFile(null)}
                  onError={setError}
                  onLoad={(loaded) => {
                    setFile(loaded)
                    setError('')
                  }}
                />
              ) : (
                <Field
                  hint="Paste as many M-PESA messages as you like."
                  id="mpesa-text"
                  label="Paste SMS text"
                  required
                >
                  <TextArea
                    id="mpesa-text"
                    onChange={(event) => setPastedText(event.target.value)}
                    placeholder={'RJ12ABC123 Confirmed. You have received Ksh500.00 from JOHN DOE 254712345678 on 3/9/26 at 10:15 AM'}
                    value={pastedText}
                  />
                </Field>
              )}

              <Field hint="Optional — applied to the imported entries." id="mpesa-note" label="Note">
                <TextInput
                  id="mpesa-note"
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="M-PESA sales"
                  value={note}
                />
              </Field>
            </div>

            <ParsedPreview entries={parsedEntries} />

            <div className="mt-5 flex flex-wrap gap-3">
              <BrutalistButton
                disabled={createMutation.isPending}
                icon={createMutation.isPending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <Send aria-hidden="true" size={17} />}
                type="submit"
                variant="ink"
              >
                {createMutation.isPending
                  ? 'Saving…'
                  : parsedEntries.length > 0
                    ? `Import ${parsedEntries.length} ${parsedEntries.length === 1 ? 'payment' : 'payments'}`
                    : 'Confirm & save'}
              </BrutalistButton>
              <BrutalistButton
                disabled={createMutation.isPending}
                icon={<RotateCcw aria-hidden="true" size={16} />}
                onClick={reset}
                type="button"
                variant="outline"
              >
                Discard
              </BrutalistButton>
            </div>
          </form>
        </div>
        <ImportHistory imports={importsQuery.data?.imports ?? []} isLoading={importsQuery.isPending} />
      </section>
    </div>
  )
}
