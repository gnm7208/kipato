import { Outlet } from 'react-router-dom'
import { BottomTabBar } from './BottomTabBar'
import { TopBar } from './TopBar'
import { adminTabs } from './navigation'

export function AdminShell() {
  return (
    <div className="min-h-svh bg-canvas text-ink">
      <TopBar badge="Admin" homeTo="/admin" links={adminTabs} profileTo="/admin/profile" />
      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 md:px-6 md:pb-10 md:pt-10">
        <Outlet />
      </main>
      <BottomTabBar homeTo="/admin" tabs={adminTabs} />
    </div>
  )
}
