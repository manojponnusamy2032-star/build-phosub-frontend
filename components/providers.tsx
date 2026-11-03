'use client'

import { createBrowserClient } from '@supabase/ssr'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

type SupabaseClient = ReturnType<typeof createClient>

const SupabaseContext = createContext<SupabaseClient | null>(null)

export function Providers({ children }: { children: ReactNode }) {
  const [supabase] = useState<SupabaseClient | null>(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  })

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF] p-6">
        <div className="max-w-md rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-[#171717]">Configuration Error</h2>
          <p className="mb-4 text-sm text-[#171717]">Failed to initialize Supabase client. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set.</p>
        </div>
      </div>
    )
  }

  return (
    <SupabaseContext.Provider value={supabase}>{children}</SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext)
  return ctx
}

export function useAuth() {
  const supabase = useSupabase()
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let mounted = true
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted) {
          setUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event: unknown, session: unknown) => {
      const s = session as { user: { id: string; email: string | null } | null } | null
      if (mounted) {
        setUser(s?.user ?? null)
        setLoading(false)
      }
    })
    return () => {
      mounted = false
      sub?.subscription.unsubscribe()
    }
  }, [supabase])

  return { user, loading, supabase }
}

export function LoadingSpinner() {
  return (
    <div role="status" aria-live="polite" className="loading-screen">
      <section className="loading-card">
        <div className="loading-emblem" aria-hidden="true">
          <span className="loading-orbit loading-orbit-outer" />
          <span className="loading-orbit loading-orbit-inner" />
          <span className="loading-emblem-core">P</span>
          <span className="loading-emblem-spark" />
        </div>
        <div className="loading-copy">
          <span className="loading-eyebrow">PHOSUB WORKSPACE</span>
          <h1>Preparing your workspace</h1>
          <p>Getting everything ready for you.</p>
        </div>
        <div className="loading-progress" aria-hidden="true">
          <span />
        </div>
        <span className="sr-only">Loading...</span>
      </section>
    </div>
  )
}