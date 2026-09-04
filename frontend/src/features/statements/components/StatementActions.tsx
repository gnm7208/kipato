import { Download, Share2 } from 'lucide-react'
import { BrutalistButton } from '../../../components/ui'
import { useToast } from '../../../components/feedback'

export function StatementActions() {
  const { showToast } = useToast()

  const share = async () => {
    const shareData = { title: 'Kipato verified income statement', text: 'Here is my Kipato income statement.', url: window.location.href }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        showToast({ title: 'Statement link copied', description: 'You can paste it into a message.', variant: 'success' })
      } else {
        showToast({ title: 'Statement ready to share', description: 'Copy this page link from your browser.', variant: 'info' })
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      showToast({ title: 'Could not share statement', description: 'Try copying the page link instead.', variant: 'warning' })
    }
  }

  return <div className="print-hidden grid grid-cols-2 gap-3"><BrutalistButton icon={<Share2 aria-hidden="true" size={18} />} onClick={() => void share()} variant="outline">Share statement</BrutalistButton><BrutalistButton icon={<Download aria-hidden="true" size={18} />} onClick={() => window.print()} variant="ink">Print / Save PDF</BrutalistButton></div>
}
