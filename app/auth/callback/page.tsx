'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, LoadingSpinner } from '@/components/providers'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (user) {
      router.replace('/dashboard')
      return
    }

    const params = new URLSearchParams(window.location.search)
    const errorCode = params.get('error_code')
    if (errorCode) {
      setError(
        errorCode === 'otp_expired' || errorCode === 'access_denied'
          ? 'This confirmation link is invalid or has expired. Request a new confirmation email and try again.'
          : 'We could not confirm your email. Request a new confirmation email or sign in if your account is already confirmed.',
      )
      return
    }

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
  }, [loading, router, user])

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f1ed]">
      <div className="w-full max-w-md px-6">
        {success && (
          <div className="mb-6 rounded-lg border border-[#bb9a7b] bg-[#e9e0d4] p-4 text-sm text-[#4b3a2d]">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-[#bb9a7b] bg-[#f3e9ea] p-4 text-sm text-[#710014]">
            {error}
          </div>
        )}
        {!success && !error && (
          <p className="text-center text-sm text-[#6f5c4b]">Confirming your email...</p>
        )}
      </div>
    </div>
  )
}
