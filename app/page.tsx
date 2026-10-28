import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#171717]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
        <div className="flex items-center gap-2 font-bold tracking-tight text-[21px]">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#E53935] text-white">
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 0h6m-9 3V9m0 0l3 3m-3-3l3-3m9 3v-6m0 0l-3 3m3-3l-3-3"/></svg>
          </span>
          <span>phosub</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-[#666] md:flex">
          <Link href="/login" className="hover:text-[#171717]">Sign in</Link>
          <Link href="/signup" className="hover:text-[#171717]">Get started</Link>
        </nav>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1fr_1fr] lg:px-8 lg:pb-28 lg:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f2d6d4] bg-[#fff8f7] px-3 py-1.5 text-xs font-semibold text-[#C62828]">
            <span className="flex items-center gap-1">Built for focused classrooms</span>
          </div>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.06] tracking-[-0.02em] md:text-5xl">
            Phone handovers.<br />
            <span className="text-[#E53935]">Clear records.</span><br />
            Less friction.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#666]">
            Phosub helps mentors coordinate phone submission and return while giving students a
            simple way to confirm their status — all recorded in Supabase.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/signup" className="px-5 py-2.5 rounded-lg bg-[#E53935] text-white font-semibold hover:bg-[#C62828] transition-colors">
              Get started
            </Link>
            <Link href="/login" className="px-5 py-2.5 rounded-lg border border-[#e7e7ea] bg-white text-[#171717] font-semibold hover:bg-[#f7f7f8] transition-colors">
              Sign in
            </Link>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="relative rounded-2xl border border-[#e7e7ea] bg-[#f7f7f8] p-4 shadow-lg">
            <div className="overflow-hidden rounded-xl border border-[#e7e7ea] bg-white p-1">
              <div className="flex items-center justify-between border-b border-[#e7e7ea] px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-[10px] bg-[#E53935] text-white">
                    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 0h6m-9 3V9m0 0l3 3m-3-3l3-3m9 3v-6m0 0l-3 3m3-3l-3-3"/></svg>
                  </span>
                  <span className="ml-2 border-l border-[#e7e7ea] pl-3 text-xs text-[#666]">Mentor workspace</span>
                </div>
                <div className="size-7 rounded-full bg-[#f5d7d5] text-center text-[10px] font-bold leading-7 text-[#C62828]">AD</div>
              </div>
              <div className="grid grid-cols-[130px_1fr] h-[400px]">
                <div className="hidden border-r border-[#e7e7ea] p-4 sm:block">
                  <div className="space-y-2">
                    {['Overview', 'Sessions', 'Squads', 'Reports'].map((x, i) => (
                      <div key={x} className={`rounded-md px-2 py-2 text-[10px] ${i === 0 ? 'bg-[#fff2f1] font-bold text-[#C62828]' : 'text-[#888]'}`}>
                        {x}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-[10px] text-[#888]">Active session · Squad 138</p>
                  <div className="mt-1 flex items-center justify-between">
                    <h3 className="text-base font-bold">Phone Handover</h3>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#fff2f1] px-2 py-1 text-[9px] font-bold text-[#C62828]">Active</span>
                  </div>
                  <div className="mt-6 space-y-3">
                    {['Submitted', 'Not submitted', 'Retrieved'].map((s, i) => (
                      <div key={s} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#f7f7f8]">
                        <span className="text-xs text-[#666]">{s}</span>
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