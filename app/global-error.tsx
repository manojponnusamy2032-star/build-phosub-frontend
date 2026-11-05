'use client'

import { useRouter } from 'next/navigation'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF] p-6">
      <div className="max-w-md rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 text-center">
        <h2 className="mb-2 text-lg font-bold text-[#171717]">Application Error</h2>
        <p className="mb-4 text-sm text-[#171717]">{error.message}</p>
        <button
          onClick={() => {
            reset()
            router.push('/login')
          }}
          className="w-full py-2 rounded-lg bg-[#D71920] text-white font-semibold hover:bg-[#D71920] transition-colors"
        >
          Go to Sign In
        </button>
      </div>
    </div>
  )
}