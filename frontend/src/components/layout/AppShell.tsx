import { Outlet } from 'react-router-dom'
import { BottomTabBar } from './BottomTabBar'
import { OfflineBanner } from './OfflineBanner'
import { TopBar } from './TopBar'

export function AppShell() {
  return (
    <div className="min-h-svh bg-canvas text-ink">
      <TopBar />
      <OfflineBanner />
      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 md:px-6 md:pb-10 md:pt-10">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  )
}
