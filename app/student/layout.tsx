'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuth, LoadingSpinner } from '@/components/providers'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { getAccessToken } from '@/lib/supabase/auth-token'
import { DashboardSidebar, TopBar, BottomNav } from '@/components/navigation/top-bar'
import { DashboardFooter } from '@/components/site-footer'

type Profile = { role: string; squad: string | null; full_name?: string; email?: string; avatar_url?: string | null }

export default function StudentLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="dashboard-web-stage min-h-screen bg-[#F8F5F4] text-[#171717]">
      <div className="dashboard-web-frame">
      <DashboardSidebar onSignOut={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))} label="Student workspace" />
      <div className="dashboard-web-content min-w-0">
        <TopBar name={profile?.full_name || user.email || 'Student'} avatarUrl={profile?.avatar_url} actionHref="/student#handover-actions" />

        <main className="dashboard-web-main mx-auto max-w-6xl px-5 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:max-w-none lg:px-8 xl:px-10">
          {children}
          <DashboardFooter />
        </main>
      </div>

      <BottomNav label="Student navigation" />
      </div>
    </div>
  )
}