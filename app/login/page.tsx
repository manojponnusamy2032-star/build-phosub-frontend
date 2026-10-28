'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, LoadingSpinner } from '@/components/providers'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const { supabase, user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // If already signed in, go to dashboard
  if (user) {
    router.push('/dashboard')
    return <LoadingSpinner />
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase) return
    setError('')
    setSubmitting(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (err) throw err
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f8]">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#E53935] text-white">
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 0h6m-9 3V9m0 0l3 3m-3-3l3-3m9 3v-6m0 0l-3 3m3-3l-3-3"/></svg>
          </span>
          <span className="font-bold tracking-tight text-[21px]">phosub</span>
        </div>
        <h2 className="mb-2 text-xl font-bold">Sign in</h2>
        <p className="mb-8 text-sm text-[#666]">Enter your credentials to access your account.</p>
        {error && (
          <div className="mb-6 rounded-lg border border-[#ffcdd2] bg-[#fff8f8] p-4 text-sm text-[#C62828]">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#171717]">Email address</label>
            <input
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-[#e7e7ea] bg-white px-3 py-2 text-sm focus:border-[#E53935] focus:ring-1 focus:ring-[#E53935]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#171717]">Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full rounded-lg border border-[#e7e7ea] bg-white px-3 py-2 text-sm focus:border-[#E53935] focus:ring-1 focus:ring-[#E53935]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-2.5 rounded-lg bg-[#E53935] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#C62828] transition-colors"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-[#666]">
          Don't have an account?{' '}
          <Link href="/signup" className="text-[#E53935] font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}