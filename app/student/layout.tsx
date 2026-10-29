'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, History, User, HelpCircle, LogOut } from 'lucide-react'
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
    <div className="min-h-screen bg-[#f2f1ed] text-[#161616]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-[#d8d2c9] bg-[#F2F1ED] px-5 py-5 lg:flex">
        <Link href="/student" className="mb-9 flex items-center gap-2.5 px-0.5">
          <span className="grid size-7 place-items-center rounded-md bg-[#710014] text-[#F2F1ED]">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h6m-6 0v7m0-7 4 4m-4-4 4-4m12 4h-6m6 0v-7m0 7-4-4m4 4-4 4" /></svg>
          </span>
          <span className="text-lg font-bold tracking-tight">phosub</span>
        </Link>

        <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6f5c4b]">Student</p>
        <nav aria-label="Student navigation" className="space-y-1.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname ?? '', href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${active ? 'bg-[#f3e9ea] font-semibold text-[#710014]' : 'text-[#6f5c4b] hover:bg-[#f2f1ed] hover:text-[#161616]'}`}
              >
                <Icon size={17} strokeWidth={1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto">
          <div className="rounded-lg bg-[#f2f1ed] px-3 py-3">
            <p className="text-xs font-semibold">Student workspace</p>
            <p className="mt-1 truncate text-xs text-[#6f5c4b]">Squad {squad}</p>
          </div>
          <button
            type="button"
            onClick={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))}
            className="mt-4 flex h-10 w-full items-center gap-2 px-3 text-sm text-[#6f5c4b] hover:text-[#710014]"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#24211e] bg-[#161616] px-4 text-[#F2F1ED] sm:px-6 lg:h-16">
          <div className="flex items-center gap-2 text-sm text-[#d8d2c9]">
            <span className="font-bold text-[#F2F1ED] lg:hidden">phosub</span>
            <span className="hidden lg:inline">Student workspace</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-[#F2F1ED]">{navItems.find((item) => isActive(pathname ?? '', item.href))?.label ?? 'Dashboard'}</span>
          </div>
          <Link href="/student/profile" aria-label="Open my profile" className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-[#24211e]">
            <ProfileAvatar avatarUrl={profile?.avatar_url} name={profile?.full_name || user.email || 'Student'} />
            <span className="hidden min-w-0 text-right sm:block">
              <span className="block max-w-40 truncate text-xs font-semibold text-[#F2F1ED]">{profile?.full_name || 'My profile'}</span>
              <span className="block text-[11px] text-[#d8d2c9]">Squad {squad}</span>
            </span>
          </Link>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </div>

      <nav aria-label="Student navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#24211e] bg-[#161616]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.16)] backdrop-blur lg:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center gap-2 px-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname ?? '', href)
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`mx-auto grid size-12 place-items-center rounded-xl transition-colors ${active ? 'bg-[#4a0010] text-[#710014]' : 'text-[#d8d2c9] hover:bg-[#24211e] hover:text-[#F2F1ED]'}`}
              >
                <Icon size={21} strokeWidth={1.9} />
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
