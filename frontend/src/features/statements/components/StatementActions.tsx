import { useQueryClient } from '@tanstack/react-query'
import { Copy, Download, LoaderCircle, Link2, Link2Off } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../../components/feedback'
import { BrutalistButton, HardCard } from '../../../components/ui'
import { queryKeys, useRevokeStatementShare, useShareStatement } from '../../../data/hooks'
import { ApiError } from '../../../lib/http'
import { formatDate } from '../../../lib/formatters'
import type { Statement } from '../../../types'

export function StatementActions({ statement }: { statement: Statement }) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const shareMutation = useShareStatement()
  const revokeMutation = useRevokeStatementShare()
  const [token, setToken] = useState<string | null>(statement.share_token ?? null)
  const [expiresAt, setExpiresAt] = useState<string | null>(statement.share_expires_at ?? null)

  const shareUrl = token ? `${window.location.origin}/s/${token}` : null

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.statements })
    await queryClient.invalidateQueries({ queryKey: queryKeys.statement(statement.id) })
  }

  const createLink = async () => {
    try {
      const result = await shareMutation.mutateAsync({ id: statement.id })
      setToken(result.statement.share_token ?? null)
      setExpiresAt(result.statement.share_expires_at ?? null)
      await refresh()
      await copyToClipboard(`${window.location.origin}${result.share_path}`)
      showToast({
        title: 'Link ready and copied',
        description: 'Anyone with this link can view the statement until it expires.',
        variant: 'success',
      })
    } catch (error: unknown) {
      showToast({
        title: 'Could not create the link',
        description: error instanceof ApiError ? error.message : 'Check your connection and try again.',
        variant: 'error',
      })
    }
  }

  const stopSharing = async () => {
    try {
      await revokeMutation.mutateAsync(statement.id)
      setToken(null)
      setExpiresAt(null)
      await refresh()
      showToast({
        title: 'Sharing stopped',
        description: 'The old link no longer opens this statement.',
        variant: 'info',
      })
    } catch {
      showToast({ title: 'Could not stop sharing', variant: 'error' })
    }
  }

  const copyLink = async () => {
    if (!shareUrl) return
    const copied = await copyToClipboard(shareUrl)
    showToast({
      title: copied ? 'Link copied' : 'Copy the link from the box above',
      variant: copied ? 'success' : 'info',
    })
  }

  const busy = shareMutation.isPending || revokeMutation.isPending

  return (
    <div className="print-hidden space-y-4">
      {shareUrl ? (
        <HardCard className="p-4" shadow="none">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            Anyone with this link can view it
          </p>
          <p className="mt-2 break-all border-2 border-ink bg-canvas p-2 font-mono text-xs">{shareUrl}</p>
          {expiresAt ? (
            <p className="mt-2 text-xs text-muted">Stops working on {formatDate(expiresAt)}.</p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <BrutalistButton
              icon={<Copy aria-hidden="true" size={17} />}
              onClick={() => void copyLink()}
              variant="outline"
            >
              Copy link
            </BrutalistButton>
            <BrutalistButton
              disabled={busy}
              icon={busy ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <Link2Off aria-hidden="true" size={17} />}
              onClick={() => void stopSharing()}
              variant="outline"
            >
              Stop sharing
            </BrutalistButton>
          </div>
        </HardCard>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <BrutalistButton
          disabled={busy}
          icon={busy ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <Link2 aria-hidden="true" size={18} />}
          onClick={() => void createLink()}
          variant="sun"
        >
          {shareUrl ? 'New link' : 'Share with a lender'}
        </BrutalistButton>
        <BrutalistButton
          icon={<Download aria-hidden="true" size={18} />}
          onClick={() => window.print()}
          variant="ink"
        >
          Print / Save PDF
        </BrutalistButton>
      </div>
    </div>
  )
}

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Clipboard access is refused in some browsers; the link is on screen anyway.
  }
  return false
}
