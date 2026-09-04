import { NavLink } from 'react-router-dom'
import { workerTabs, type NavItem } from './navigation'

export function BottomTabBar({ tabs = workerTabs, homeTo = '/app' }: { tabs?: NavItem[]; homeTo?: string }) {
  return (
    <nav aria-label="Mobile primary navigation" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t-3 border-ink bg-paper/95 backdrop-blur md:hidden">
      <div className={`mx-auto grid max-w-2xl grid-cols-${tabs.length}`} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(({ label, to, icon: Icon }) => (
          <NavLink
            aria-label={label}
            className={({ isActive }) => `flex min-h-17 flex-col items-center justify-center gap-1 border-t-4 px-1 pt-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] transition-colors ${isActive ? 'border-ink text-ink' : 'border-transparent text-muted'}`}
            end={to === homeTo}
            key={to}
            to={to}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={2.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
