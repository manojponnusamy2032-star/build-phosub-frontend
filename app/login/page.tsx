'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, LoadingSpinner } from '@/components/providers'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const { supabase, user, loading } = useAuth()

  // Handle null supabase
  if (!supabase) {
    return <p className="text-center text-sm text-[#000000]">Configuration error: Supabase not initialized.</p>
  }

  // Use non-null supabase reference
  const supa = supabase

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showResend, setShowResend] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleGoogleSignIn() {
    setError(null)
    setSubmitting(true)
    try {
      const { error: authError } = await supa.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: new URL(
            '/auth/callback',
            process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
          ).toString(),
          queryParams: { prompt: 'select_account' },
        },
      })
      if (authError) throw authError
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Unable to continue with Google'
      setError(/unsupported provider|provider is not enabled/i.test(message)
        ? 'Google sign-in is not enabled yet. Ask the app administrator to configure Google in Supabase Auth.'
        : message)
      setSubmitting(false)
    }
  }

  // If already signed in, go to dashboard
  if (user) {
    router.push('/dashboard')
    return <LoadingSpinner />
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supa) return

    setError(null)
    setSubmitting(true)
    try {
      const { error: err } = await supa.auth.signInWithPassword({
        email,
        password,
      })

      if (err) {
        // Check if it's an unconfirmed email error
        const errorMessage = err.message || 'Login failed'
        const isUnconfirmed = /email\s+not\s+confirmed|invalid.*confirmation|email.*confirmation|confirmation.*required/i.test(errorMessage)

        if (isUnconfirmed) {
          setError('Please confirm your email before signing in.')
          setShowResend(true)
        } else {
          setError(errorMessage)
        }
        return
      }

      // Successful login
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle resend confirmation
  async function handleResendConfirm() {
    setShowResend(false)
    setError(null)
    setSubmitting(true)
    try {
        const { error } = await supa.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: new URL(
              '/auth/callback',
              process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
            ).toString(),
          },
      })
      if (error) {
          setShowResend(true)
          setError(/rate.?limit|too many requests/i.test(error.message)
            ? 'Too many confirmation emails have been requested. Please wait before trying again.'
            : error.message || 'Failed to send confirmation email')
      } else {
        setError('A new confirmation email has been sent to your email address.')
      }
    } catch (err: any) {
      setShowResend(true)
      setError(err.message || 'Failed to send confirmation email')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  // If there's a resend message showing, include the resend button
  const resendSection = showResend && (
    <div className="mt-4">
      <p className="text-sm text-[#000000]">
        Don't have a confirmation email?{' '}
        <button
          onClick={handleResendConfirm}
          className="ml-2 text-[#000000] font-semibold hover:underline cursor-pointer"
        >
          Resend confirmation email
        </button>
      </p>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EFEEE8]">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#EF0606] text-[#000000]">
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 0h6m-9 3V9m0 0l3 3m-3-3l3-3m9 3v-6m0 0l-3 3m3-3l-3-3"/></svg>
          </span>
          <span className="font-bold tracking-tight text-[21px]">phosub</span>
        </div>
        <h2 className="mb-2 text-xl font-bold">Sign in</h2>
        <p className="mb-8 text-sm text-[#000000]">Enter your credentials to access your account.</p>
        {error && (
          <div className="mb-6 rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] p-4 text-sm text-[#000000]">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] py-2.5 text-sm font-semibold text-[#000000] transition-colors hover:bg-[#EFEEE8] disabled:cursor-not-allowed"
        >
          {submitting ? 'Connecting to Google...' : 'Continue with Google'}
        </button>
        <div className="my-5 flex items-center gap-3 text-xs text-[#000000]">
          <span className="h-px flex-1 bg-[#D3CCC7]" />
          <span>or sign in with email</span>
          <span className="h-px flex-1 bg-[#D3CCC7]" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#000000]">Email address</label>
            <input
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] px-3 py-2 text-sm focus:border-[#EF0606] focus:ring-1 focus:ring-[#EF0606]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000000]">Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] px-3 py-2 text-sm focus:border-[#EF0606] focus:ring-1 focus:ring-[#EF0606]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-2.5 rounded-lg bg-[#EF0606] text-[#000000] font-semibold disabled:cursor-not-allowed hover:bg-[#EF0606] transition-colors"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {resendSection}
        <p className="mt-8 text-center text-sm text-[#000000]">
          Don't have an account?{' '}
          <Link href="/signup" className="text-[#000000] font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
