'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, History, User, HelpCircle, LogOut, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { ProfileAvatar } from '@/components/profile-photo'
import { cn } from '@/lib/utils'

const STUDENT_NAV = [
  { id: 'dashboard', href: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'history', href: '/student/history', label: 'History', icon: History },
  { id: 'profile', href: '/student/profile', label: 'Profile', icon: User },
  { id: 'help', href: '/student/help', label: 'Help', icon: HelpCircle },
]

interface TopBarProps {
  name?: string
  avatarUrl?: string | null
  profileHref?: string
  onProfileClick?: () => void
  className?: string
}

export function TopBar({ name, avatarUrl, profileHref, onProfileClick, className }: TopBarProps) {
  const { user } = useAuth()
  const displayName = name?.trim() || user?.email?.split('@')[0] || 'User'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-[#F8F5F4]/85 text-[#171717] backdrop-blur',
        className
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-start px-4 sm:px-6 lg:h-[72px]">
        {profileHref ? (
          <Link href={profileHref} aria-label="Open profile" title="Open profile" className="flex min-w-0 items-center gap-3 rounded-full pr-4 text-left transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D71920]">
            <ProfileAvatar avatarUrl={avatarUrl ?? null} name={displayName} size="medium" />
            <span className="truncate text-sm font-semibold leading-5">{greeting}</span>
          </Link>
        ) : (
          <button type="button" aria-label="Open profile" title="Open profile" onClick={onProfileClick} className="flex min-w-0 items-center gap-3 rounded-full pr-4 text-left transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D71920]">
            <ProfileAvatar avatarUrl={avatarUrl ?? null} name={displayName} size="medium" />
            <span className="truncate text-sm font-semibold leading-5">{greeting}</span>
          </button>
        )}
      </div>
    </header>
  )
}

export interface BottomNavItem {
  id: string
  label: string
  icon: LucideIcon
  href?: string
}

interface DashboardSidebarProps {
  items?: BottomNavItem[]
  activeId?: string
  onSelect?: (id: string) => void
  onSignOut?: () => void
  label?: string
}

export function DashboardSidebar({ items = STUDENT_NAV, activeId, onSelect, onSignOut, label = 'Workspace navigation' }: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="dashboard-web-sidebar hidden flex-col border-r border-[#E9E0DE] bg-white px-5 py-6 lg:sticky lg:top-0 lg:z-10 lg:flex lg:w-auto">
      <Link href="/" className="mb-10 flex items-center gap-2.5 px-1">
        <span className="grid size-8 place-items-center rounded-xl bg-[#D71920] text-white">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h6m-6 0v7m0-7 4 4m-4-4 4-4m12 4h-6m6 0v-7m0 7-4-4m4 4-4 4" /></svg>
        </span>
        <span className="text-lg font-bold tracking-tight">phosub</span>
      </Link>
      <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5F5755]">Workspace</p>
      <nav aria-label={label} className="space-y-1">
        {items.map(({ id, href, label: itemLabel, icon: Icon }) => {
          const active = href
            ? href === '/student' ? pathname === '/student' : pathname === href || pathname.startsWith(`${href}/`)
            : activeId === id
          const className = cn(
            'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors',
            active ? 'bg-[#FCEBED] text-[#B5121B]' : 'text-[#525252] hover:bg-[#F8F5F4] hover:text-[#171717]'
          )
          const content = <><Icon size={18} strokeWidth={1.8} /><span>{itemLabel}</span></>

          return href ? (
            <Link key={id} href={href} aria-current={active ? 'page' : undefined} className={className}>{content}</Link>
          ) : (
            <button key={id} type="button" aria-current={active ? 'page' : undefined} onClick={() => onSelect?.(id)} className={className}>{content}</button>
          )
        })}
      </nav>
      {onSignOut && (
        <button type="button" onClick={onSignOut} className="mt-auto flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#5F5755] transition-colors hover:bg-[#F8F5F4] hover:text-[#B5121B]">
          <LogOut size={18} /> Sign out
        </button>
      )}
    </aside>
  )
}

interface BottomNavProps {
  items?: BottomNavItem[]
  activeId?: string
  onSelect?: (id: string) => void
  label?: string
  className?: string
}

export function BottomNav({ items = STUDENT_NAV, activeId, onSelect, label = 'Primary navigation', className }: BottomNavProps = {}) {
  const pathname = usePathname()

  return (
    <nav
      aria-label={label}
      className={cn(
        'fixed bottom-[calc(12px+env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-24px)] max-w-[520px] -translate-x-1/2 rounded-[28px] border border-[#E9E0DE] bg-white/95 p-1.5 shadow-[0_8px_28px_rgba(54,22,22,0.14)] backdrop-blur sm:bottom-6 lg:hidden',
        className
      )}
    >
      <div className="mx-auto flex h-[62px] w-full items-center justify-center gap-1 sm:gap-2">
        {items.map(({ id, href, label: itemLabel, icon: Icon }) => {
          const active = href
            ? href === '/student' ? pathname === '/student' : pathname === href || pathname.startsWith(`${href}/`)
            : activeId === id
          const itemClass = cn(
            'flex h-11 shrink-0 items-center justify-center rounded-full font-medium transition-colors',
            active ? 'flex-row gap-2 bg-[#D71920] px-3 text-white' : 'min-w-[56px] flex-col gap-0.5 px-2 text-[#5F5755] hover:bg-[#F8F5F4] hover:text-[#171717]'
          )
          const content = (
            <>
              <Icon size={18} strokeWidth={1.9} />
              <span className={cn('max-w-full truncate', active ? 'text-[11px]' : 'text-[10px]')}>{itemLabel}</span>
            </>
          )

          return (
            href ? (
              <Link key={id} href={href} title={itemLabel} aria-label={itemLabel} aria-current={active ? 'page' : undefined} className={itemClass}>
                {content}
              </Link>
            ) : (
              <button key={id} type="button" title={itemLabel} aria-label={itemLabel} aria-current={active ? 'page' : undefined} onClick={() => onSelect?.(id)} className={itemClass}>
                {content}
              </button>
            )
          )
        })}
      </div>
    </nav>
  )
}