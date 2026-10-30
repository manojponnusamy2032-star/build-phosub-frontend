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
    <div className="min-h-screen flex items-center justify-center bg-[#EFEEE8] p-6">
      <div className="max-w-md rounded-xl border border-[#D3CCC7] bg-[#EFEEE8] p-6 text-center">
        <h2 className="mb-2 text-lg font-bold text-[#000000]">Application Error</h2>
        <p className="mb-4 text-sm text-[#000000]">{error.message}</p>
        <button
          onClick={() => {
            reset()
            router.push('/login')
          }}
          className="w-full py-2 rounded-lg bg-[#EF0606] text-[#000000] font-semibold hover:bg-[#EF0606] transition-colors"
        >
          Go to Sign In
        </button>
      </div>
    </div>
  )
}