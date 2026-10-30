import Link from 'next/link'
import AuthRedirect from '@/components/auth-redirect'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#EFEEE8] text-[#000000]">
      <AuthRedirect />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
        <div className="flex items-center gap-2 font-bold tracking-tight text-[21px]">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#EF0606] text-[#000000]">
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 0h6m-9 3V9m0 0l3 3m-3-3l3-3m9 3v-6m0 0l-3 3m3-3l-3-3"/></svg>
          </span>
          <span>phosub</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-[#000000] md:flex">
          <Link href="/login" className="hover:text-[#000000]">Sign in</Link>
          <Link href="/signup" className="hover:text-[#000000]">Get started</Link>
        </nav>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1fr_1fr] lg:px-8 lg:pb-28 lg:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#EFEEE8] bg-[#EFEEE8] px-3 py-1.5 text-xs font-semibold text-[#000000]">
            <span className="flex items-center gap-1">Built for focused classrooms</span>
          </div>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.06] tracking-[-0.02em] md:text-5xl">
            Phone handovers.<br />
            <span className="text-[#000000]">Clear records.</span><br />
            Less friction.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#000000]">
            Phosub helps mentors coordinate phone submission and return while giving students a
            simple way to confirm their status — all recorded in Supabase.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/signup" className="px-5 py-2.5 rounded-lg bg-[#EF0606] text-[#000000] font-semibold hover:bg-[#EF0606] transition-colors">
              Get started
            </Link>
            <Link href="/login" className="px-5 py-2.5 rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] text-[#000000] font-semibold hover:bg-[#EFEEE8] transition-colors">
              Sign in
            </Link>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="relative rounded-2xl border border-[#D3CCC7] bg-[#EFEEE8] p-4">
            <div className="overflow-hidden rounded-xl border border-[#D3CCC7] bg-[#EFEEE8] p-1">
              <div className="flex items-center justify-between border-b border-[#D3CCC7] px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-[10px] bg-[#EF0606] text-[#000000]">
                    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 0h6m-9 3V9m0 0l3 3m-3-3l3-3m9 3v-6m0 0l-3 3m3-3l-3-3"/></svg>
                  </span>
                  <span className="ml-2 border-l border-[#D3CCC7] pl-3 text-xs text-[#000000]">Mentor workspace</span>
                </div>
                <div className="size-7 rounded-full bg-[#EFEEE8] text-center text-[10px] font-bold leading-7 text-[#000000]">AD</div>
              </div>
              <div className="grid grid-cols-[130px_1fr] h-[400px]">
                <div className="hidden border-r border-[#D3CCC7] p-4 sm:block">
                  <div className="space-y-2">
                    {['Overview', 'Sessions', 'Squads', 'Reports'].map((x, i) => (
                      <div key={x} className={`rounded-md px-2 py-2 text-[10px] ${i === 0 ? 'bg-[#EFEEE8] font-bold text-[#000000]' : 'text-[#000000]'}`}>
                        {x}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-[10px] text-[#000000]">Active session · Squad 138</p>
                  <div className="mt-1 flex items-center justify-between">
                    <h3 className="text-base font-bold">Phone Handover</h3>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#EFEEE8] px-2 py-1 text-[9px] font-bold text-[#000000]">Active</span>
                  </div>
                  <div className="mt-6 space-y-3">
                    {['Submitted', 'Not submitted', 'Retrieved'].map((s, i) => (
                      <div key={s} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#EFEEE8]">
                        <span className="text-xs text-[#000000]">{s}</span>
                        <span className="text-xs font-semibold">{i === 0 ? '12' : i === 1 ? '2' : '3'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}