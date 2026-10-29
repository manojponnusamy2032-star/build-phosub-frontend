'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  const [message, setMessage] = useState(error.message)
  const router = useRouter()

  useEffect(() => {
    // Auto-recover: try going to login on unexpected errors
    const t = setTimeout(() => reset(), 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f1ed] p-6">
      <div className="max-w-md rounded-xl border border-[#d8b9b0] bg-[#f3e9ea] p-6 text-center">
        <h2 className="mb-2 text-lg font-bold text-[#710014]">Something went wrong</h2>
        <p className="mb-4 text-sm text-[#6f5c4b]">{message}</p>
        <button
          onClick={() => {
            reset()
            router.push('/login')
          }}
          className="w-full py-2 rounded-lg bg-[#710014] text-[#F2F1ED] font-semibold hover:bg-[#710014] transition-colors"
        >
          Go to Sign In
        </button>
      </div>
    </div>
  )
}