'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, History, User, HelpCircle, LogOut, Settings } from 'lucide-react'
import { useAuth, LoadingSpinner } from '@/components/providers'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { getAccessToken } from '@/lib/supabase/auth-token'
import { ProfileAvatar } from '@/components/profile-photo'

type Profile = { role: string; squad: string | null; full_name?: string; email?: string; avatar_url?: string | null }

const navItems = [
  { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/history', label: 'My History', icon: History },
  { href: '/student/profile', label: 'My Profile', icon: User },
  { href: '/student/help', label: 'Help & Guidelines', icon: HelpCircle },
]

function isActive(pathname: string, href: string) {
  if (href === '/student') return pathname === '/student'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (authLoading || !user) return
    let cancelled = false
    async function loadProfile() {
      try {
        const token = await getAccessToken()
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch('/api/profile', { credentials: 'include', headers })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) setProfile(data.profile ?? null)
      } catch {
        // ignore; pages handle their own data
      }
    }
    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  useEffect(() => {
    const handleAvatarUpdate = (event: Event) => {
      const avatarUrl = (event as CustomEvent<string>).detail
      if (avatarUrl) setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current)
    }
    window.addEventListener('phosub:avatar-updated', handleAvatarUpdate)
    return () => window.removeEventListener('phosub:avatar-updated', handleAvatarUpdate)
  }, [])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  if (authLoading) return <LoadingSpinner />
  if (!user) return <LoadingSpinner />

  const squad = profile?.squad ?? '-'

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-[#EFEEE8] text-[#000000] lg:max-w-none">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-[#D3CCC7] bg-[#EFEEE8] px-5 py-5 lg:flex">
        <Link href="/student" className="mb-9 flex items-center gap-2.5 px-0.5">
          <span className="grid size-7 place-items-center rounded-md bg-[#EF0606] text-[#000000]">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h6m-6 0v7m0-7 4 4m-4-4 4-4m12 4h-6m6 0v-7m0 7-4-4m4 4-4 4" /></svg>
          </span>
          <span className="text-lg font-bold tracking-tight">phosub</span>
        </Link>

        <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.16em] text-[#000000]">Student</p>
        <nav aria-label="Student navigation" className="space-y-1.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname ?? '', href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${active ? 'bg-[#EFEEE8] font-semibold text-[#000000]' : 'text-[#000000] hover:bg-[#EFEEE8] hover:text-[#000000]'}`}
              >
                <Icon size={17} strokeWidth={1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto">
          <div className="rounded-lg bg-[#EFEEE8] px-3 py-3">
            <p className="text-xs font-semibold">Student workspace</p>
            <p className="mt-1 truncate text-xs text-[#000000]">Squad {squad}</p>
          </div>
          <button
            type="button"
            onClick={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))}
            className="mt-4 flex h-10 w-full items-center gap-2 px-3 text-sm text-[#000000] hover:text-[#000000]"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-h-screen w-full lg:pl-56">
        <header className="sticky top-0 z-20 border-b border-[#D3CCC7] bg-[#EFEEE8]/95 px-4 text-[#000000] backdrop-blur-md lg:flex lg:h-16 lg:items-center lg:justify-between lg:border-[#000000] lg:bg-[#000000] lg:px-6 lg:text-[#EFEEE8]">
          <div className="mx-auto flex h-16 max-w-md items-center justify-between lg:hidden">
            <Link href="/student/profile" aria-label="Open student profile" className="flex min-w-0 items-center gap-3">
              <ProfileAvatar avatarUrl={profile?.avatar_url} name={profile?.full_name || user.email || 'Student'} />
              <span className="min-w-0">
                <span className="block text-xs text-[#000000]">Good morning,</span>
                <span className="block truncate text-sm font-semibold">{profile?.full_name?.trim() || 'Student'}</span>
              </span>
            </Link>
            <Link href="/student/profile" title="Settings" aria-label="Open settings" className="grid size-10 shrink-0 place-items-center rounded-full border border-[#D3CCC7] bg-[#EFEEE8] text-[#000000] transition-all duration-200 active:scale-95">
              <Settings size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="hidden items-center gap-2 text-sm text-[#D3CCC7] lg:flex">
            <span className="font-medium text-[#EFEEE8]">Student workspace</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-[#EFEEE8]">{navItems.find((item) => isActive(pathname ?? '', item.href))?.label ?? 'Dashboard'}</span>
          </div>
          <Link href="/student/profile" aria-label="Open my profile" className="hidden min-w-0 items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-[#000000] lg:flex">
            <ProfileAvatar avatarUrl={profile?.avatar_url} name={profile?.full_name || user.email || 'Student'} />
            <span className="min-w-0 text-right">
              <span className="block max-w-40 truncate text-xs font-semibold text-[#EFEEE8]">{profile?.full_name || 'My profile'}</span>
              <span className="block text-[11px] text-[#D3CCC7]">Squad {squad}</span>
            </span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-md px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-5 sm:pt-8 lg:max-w-6xl lg:px-10 lg:pb-12">{children}</main>
      </div>

      <nav aria-label="Student navigation" className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-[#D3CCC7] bg-[#EFEEE8]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden">
        <div className="grid h-[4.25rem] grid-cols-4 items-center gap-1 px-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname ?? '', href)
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200 active:scale-95 ${active ? 'bg-[#EF0606]/10 font-semibold text-[#EF0606]' : 'text-[#000000] hover:bg-[#D3CCC7]/40'}`}
              >
                <Icon size={19} strokeWidth={1.9} />
                <span className="text-[10px] font-medium leading-none">{label === 'Dashboard' ? 'Home' : label === 'My History' ? 'History' : label === 'My Profile' ? 'Profile' : 'Help'}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
