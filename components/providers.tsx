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
      <div className="min-h-screen flex items-center justify-center bg-[#f2f1ed] p-6">
        <div className="max-w-md rounded-xl border border-[#d8b9b0] bg-[#f3e9ea] p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-[#710014]">Configuration Error</h2>
          <p className="mb-4 text-sm text-[#6f5c4b]">Failed to initialize Supabase client. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set.</p>
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
    <div role="status" aria-live="polite" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f2f1ed]">
      <span className="relative grid size-14 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#d8d2c9] border-t-[#710014]" />
        <span aria-hidden="true" className="text-lg font-black text-[#710014]">K</span>
      </span>
      <span aria-hidden="true" className="text-sm font-black tracking-[0.18em] text-[#161616]">KALVIUM</span>
      <span className="sr-only">Loading...</span>
    </div>
  )
}