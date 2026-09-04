import { request } from '../../lib/http'
import type { MpesaImport, MpesaImportPayload, MpesaImportResult, MpesaPreviewResponse } from '../../types'

export const mpesaApi = {
  async listImports() {
    return request<{ imports: MpesaImport[] }>('/api/mpesa/imports')
  },
  async createImport(payload: MpesaImportPayload) {
    return request<MpesaImportResult>('/api/mpesa/imports', { method: 'POST', json: payload })
  },
  async previewImport(rawText: string) {
    return request<MpesaPreviewResponse>('/api/mpesa/imports/preview', {
      method: 'POST',
      json: { raw_text: rawText },
    })
  },
}
