import { createBrowserClient } from '@supabase/ssr'

function requiredEnv(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing required Supabase environment variable: ${name}`)
  return value
}

export function createClient() {
  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return createBrowserClient(url, requiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY', key))
}
