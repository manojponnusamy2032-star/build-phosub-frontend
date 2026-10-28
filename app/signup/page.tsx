'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, LoadingSpinner } from '@/components/providers'
import Link from 'next/link'
import { isValidEmailFormat } from '@/lib/email-validation'

const SQUADS = ['138', '139', '183']

export default function SignupPage() {
  const router = useRouter()
  const { supabase, user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [squad, setSquad] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signupAttempted, setSignupAttempted] = useState(false)

  useEffect(() => {
    if (user && !signupAttempted) router.replace('/dashboard')
  }, [router, signupAttempted, user])

  const normalizedEmail = email.trim().toLowerCase()
  const suggestedRole = normalizedEmail.endsWith('@kalvium.com') ? 'mentor' : normalizedEmail.endsWith('@kalvium.community') ? 'student' : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase) return

    setError('')
    setSuccess('')
    const normalizedEmail = email.trim()
    if (!isValidEmailFormat(normalizedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setSignupAttempted(true)
    setSubmitting(true)
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: new URL(
            '/auth/callback',
            process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
          ).toString(),
        },
      })
      if (authError) throw authError
      if (!data.user) throw new Error('No user returned')

      if (!data.session) {
        setSuccess('Account created. Check your email for a confirmation link, then sign in.')
        return
      }

      const accessToken = data.session.access_token

      const profileRole = suggestedRole ?? 'student'
      const profileSquad = profileRole === 'student' ? squad : null
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ fullName: fullName.trim(), role: profileRole, squad: profileSquad }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Profile creation failed')
      }

      const result = await res.json()
      // Go straight to the role dashboard (bypass /dashboard server redirect)
      router.push(result.profile?.role === 'mentor' ? '/mentor' : '/student')
    } catch (err: any) {
      const message = err.message || 'Signup failed'
      // Only set the detailed rate limit message if the error is actually about email rate limiting
      const isRateLimitError = /email rate limit exceeded/i.test(message)
      setError(
        isRateLimitError
          ? 'Too many confirmation emails have been requested. Please wait before trying again. The project owner can configure custom SMTP in Supabase to raise the email sending limit.'
          : message,
      )
    }
    finally {
      setSubmitting(false)
    }
  }

  if (loading || (user && !signupAttempted)) return <LoadingSpinner />

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f8]">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#E53935] text-white">
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 0h6m-9 3V9m0 0l3 3m-3-3l3-3m9 3v-6m0 0l-3 3m3-3l-3-3"/></svg>
          </span>
          <span className="font-bold tracking-tight text-[21px]">phosub</span>
        </div>
        <h2 className="mb-2 text-xl font-bold">Sign up</h2>
        <p className="mb-8 text-sm text-[#666]">Create your account to get started.</p>
        {error && (
          <div className="mb-6 rounded-lg border border-[#bbebca] bg-[#f2fbf5] p-4 text-sm text-[#166534]">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#171717]">Full name</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-lg border border-[#e7e7ea] bg-white px-3 py-2 text-sm focus:border-[#E53935] focus:ring-1 focus:ring-[#E53935]"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#171717]">Email address</label>
            <input
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-[#e7e7ea] bg-white px-3 py-2 text-sm focus:border-[#E53935] focus:ring-1 focus:ring-[#E53935]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {suggestedRole && (
              <p className="mt-1 text-xs text-[#666]">
                Registered as a {suggestedRole} based on your email domain.
              </p>
            )}
            {!suggestedRole && (
              <p className="mt-1 text-xs text-[#C62828]">Use @kalvium.com (mentor) or @kalvium.community (student).</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#171717]">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="mt-1 block w-full rounded-lg border border-[#e7e7ea] bg-white px-3 py-2 text-sm focus:border-[#E53935] focus:ring-1 focus:ring-[#E53935]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {suggestedRole === 'student' && (
            <div>
              <label className="block text-sm font-semibold text-[#171717]">Squad</label>
              <select
                required
                className="mt-1 block w-full rounded-lg border border-[#e7e7ea] bg-white px-3 py-2 text-sm focus:border-[#E53935] focus:ring-1 focus:ring-[#E53935]"
                value={squad}
                onChange={(e) => setSquad(e.target.value)}
              >
                <option value="">Select squad</option>
                {SQUADS.map((s) => (
                  <option key={s} value={s}>Squad {s}</option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || Boolean(success) || !suggestedRole || (suggestedRole === 'student' && !squad)}
            className="w-full flex justify-center py-2.5 rounded-lg bg-[#E53935] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#C62828] transition-colors"
          >
            {submitting ? 'Creating account...' : success ? 'Check your email' : 'Create account'}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-[#666]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#E53935] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
