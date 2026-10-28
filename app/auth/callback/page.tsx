'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, LoadingSpinner } from '@/components/providers'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const { supabase, user, loading } = useAuth()

  // If user already logged in, redirect
  if (user) {
    router.push('/dashboard')
    return null
  }

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    // Check for confirmation parameters in URL
    const params = new URLSearchParams(window.location.search)
    const type = params.get('type')

    if (type === 'signup') {
      // Email confirmation was initiated
      setSuccess('A confirmation email has been sent. Please check your email.')
      // Auto redirect after a moment
      const timeoutId = setTimeout(() => {
        router.push('/login')
      }, 3000)
      return () => clearTimeout(timeoutId)
    }
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f8]">
      <div className="w-full max-w-md px-6">
        {success && (
          <div className="mb-6 rounded-lg border border-[#bbebca] bg-[#f2fbf5] p-4 text-sm text-[#166534]">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-[#bbebca] bg-[#fef3f3] p-4 text-sm text-[#C62828]">
            {error}
          </div>
        )}
        {!success && !error && (
          <p className="text-center text-sm text-[#666]">Confirming your email...</p>
        )}
      </div>
    </div>
  )
}
