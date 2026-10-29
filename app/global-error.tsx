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
    <div className="min-h-screen flex items-center justify-center bg-[#f2f1ed] p-6">
      <div className="max-w-md rounded-xl border border-[#d8b9b0] bg-[#f3e9ea] p-6 text-center">
        <h2 className="mb-2 text-lg font-bold text-[#710014]">Application Error</h2>
        <p className="mb-4 text-sm text-[#6f5c4b]">{error.message}</p>
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