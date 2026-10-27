import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function requiredEnv(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing required Supabase environment variable: ${name}`)
  return value
}

export async function createClient() {
  const cookieStore = await cookies()
  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createServerClient(
    url,
    requiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY', key),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Components cannot always write cookies; proxy handles refreshes.
          }
        },
      },
    },
  )
}
