import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from '../features/auth/auth-context'
import { ToastProvider } from '../components/feedback'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      // React Query would otherwise pause everything while the browser reports
      // being offline. Kipato has its own offline layer — a read cache and an
      // outbox — and it can only do its job if the calls actually reach it.
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
