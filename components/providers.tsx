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
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f8] p-6">
        <div className="max-w-md rounded-xl border border-[#ffcdd2] bg-[#fff8f8] p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-[#C62828]">Configuration Error</h2>
          <p className="mb-4 text-sm text-[#666]">Failed to initialize Supabase client. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set.</p>
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
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f8]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E53935]"></div>
    </div>
  )
}