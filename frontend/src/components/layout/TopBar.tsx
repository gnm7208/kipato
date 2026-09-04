import { CircleUserRound, MoveUpRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../features/auth/auth-context'
import { workerTabs, type NavItem } from './navigation'

interface TopBarProps {
  links?: NavItem[]
  homeTo?: string
  profileTo?: string
  badge?: string
}

export function TopBar({
  links = workerTabs,
  homeTo = '/app',
  profileTo = '/app/profile',
  badge,
}: TopBarProps) {
  const { user } = useAuth()

  return (
    <header className="border-b-3 border-ink bg-canvas">
      <div className="mx-auto flex min-h-18 max-w-5xl items-center justify-between gap-4 px-4 md:px-6">
        <NavLink aria-label="Kipato home" className="flex items-center gap-2.5" to={homeTo}>
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center border-3 border-ink bg-ink text-sun">
            <MoveUpRight size={17} strokeWidth={3} />
          </span>
          <span className="font-display text-lg font-bold tracking-[0.16em]">KIPATO</span>
          {badge && <span className="border-2 border-ink bg-sun px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em]">{badge}</span>}
        </NavLink>
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink
              className={({ isActive }) => `border-b-3 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors ${isActive ? 'border-ink text-ink' : 'border-transparent text-muted hover:border-ink hover:text-ink'}`}
              end={link.to === homeTo}
              key={link.to}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <NavLink aria-label={`Open profile for ${user?.full_name ?? 'your account'}`} className="flex h-11 w-11 items-center justify-center border-3 border-ink bg-sun shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none" to={profileTo}>
          <CircleUserRound aria-hidden="true" size={23} strokeWidth={2.5} />
        </NavLink>
      </div>
    </header>
  )
}
