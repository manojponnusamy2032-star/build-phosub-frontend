'use client'

import { usePathname } from 'next/navigation'

const repositoryUrl = 'https://github.com/manojponnusamy2032-star/build-phosub-frontend'
const feedbackEmail = 'manoj.ponnusamy.s.138@kalvium.community'

export default function SiteFooter() {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/student') || pathname?.startsWith('/mentor')

  if (isDashboard) {
    return (
      <footer className="border-t border-[#000000] bg-[#000000] text-[#EFEEE8]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="font-bold tracking-tight text-[#D3CCC7]">phosub</span>
          <nav aria-label="Project links" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href={repositoryUrl} target="_blank" rel="noreferrer" className="hover:text-[#EFEEE8]">GitHub</a>
            <a href={`mailto:${feedbackEmail}?subject=Phosub%20bug%20or%20feature%20report`} className="break-all hover:text-[#EFEEE8]">
              Report a bug or request a feature
            </a>
          </nav>
          <span className="text-[#D3CCC7]">(c) {new Date().getFullYear()} Phosub</span>
        </div>
      </footer>
    )
  }

  return (
    <footer className="border-t border-[#000000] bg-[#000000] text-[#EFEEE8]">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-8">
        <div>
          <a href="/" className="text-xl font-bold tracking-tight text-[#D3CCC7]">phosub</a>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#D3CCC7]">
            Phone handovers, clearly recorded for students and mentors.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Project</h2>
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm text-[#D3CCC7] transition-colors hover:text-[#EFEEE8]"
          >
            GitHub repository
          </a>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Feedback</h2>
          <p className="mt-3 text-sm text-[#D3CCC7]">Report a bug or request a feature</p>
          <a
            href={`mailto:${feedbackEmail}?subject=Phosub%20bug%20or%20feature%20report`}
            className="mt-1 inline-block break-all text-sm text-[#D3CCC7] transition-colors hover:text-[#EFEEE8]"
          >
            {feedbackEmail}
          </a>
        </div>
      </div>
      <div className="border-t border-[#000000]">
        <p className="mx-auto max-w-6xl px-5 py-4 text-xs text-[#D3CCC7] sm:px-8">
          (c) {new Date().getFullYear()} Phosub
        </p>
      </div>
    </footer>
  )
}