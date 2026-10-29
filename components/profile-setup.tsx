'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getAccessToken } from '@/lib/supabase/auth-token'

const SQUADS = ['138', '139', '183']

export default function ProfileSetup({
  email = '',
  fullName: initialFullName = '',
  squad: initialSquad = '',
}: {
  email?: string | null
  fullName?: string | null
  squad?: string | null
}) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialFullName ?? '')
  const [squad, setSquad] = useState(SQUADS.includes(initialSquad ?? '') ? initialSquad ?? '' : '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isMentor = email?.trim().toLowerCase().endsWith('@kalvium.com') ?? false

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const token = await getAccessToken()
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ fullName: fullName.trim(), role: isMentor ? 'mentor' : 'student', squad: isMentor ? null : squad }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not save your profile')

      router.replace(isMentor ? '/mentor' : '/student')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save your profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f1ed] p-6">
      <div className="w-full max-w-md rounded-xl border border-[#d8d2c9] bg-[#F2F1ED] p-6">
        <h1 className="mb-2 text-lg font-bold">Complete your profile</h1>
        <p className="mb-6 text-sm text-[#6f5c4b]">Your account is signed in. Add the details needed to finish setting it up.</p>
        {error && (
          <div className="mb-5 rounded-lg border border-[#d8b9b0] bg-[#f3e9ea] p-3 text-sm text-[#710014]">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="full-name" className="block text-sm font-semibold text-[#161616]">Full name</label>
            <input
              id="full-name"
              type="text"
              required
              autoComplete="name"
              className="mt-1 block w-full rounded-lg border border-[#d8d2c9] bg-[#F2F1ED] px-3 py-2 text-sm focus:border-[#710014] focus:ring-1 focus:ring-[#710014]"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          {!isMentor && (
            <div>
              <label htmlFor="squad" className="block text-sm font-semibold text-[#161616]">Squad</label>
              <select
                id="squad"
                required
                className="mt-1 block w-full rounded-lg border border-[#d8d2c9] bg-[#F2F1ED] px-3 py-2 text-sm focus:border-[#710014] focus:ring-1 focus:ring-[#710014]"
                value={squad}
                onChange={(event) => setSquad(event.target.value)}
              >
                <option value="">Select squad</option>
                {SQUADS.map((option) => <option key={option} value={option}>Squad {option}</option>)}
              </select>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#710014] py-2.5 font-semibold text-[#F2F1ED] transition-colors hover:bg-[#710014] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Saving profile...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}