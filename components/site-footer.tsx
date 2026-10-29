'use client'

import { usePathname } from 'next/navigation'

const repositoryUrl = 'https://github.com/manojponnusamy2032-star/build-phosub-frontend'
const feedbackEmail = 'manoj.ponnusamy.s.138@kalvium.community'

export default function SiteFooter() {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/student') || pathname?.startsWith('/mentor')

  if (isDashboard) {
    return (
      <footer className="border-t border-[#292929] bg-[#111] text-[#a5a5aa]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="font-bold tracking-tight text-[#e53935]">phosub</span>
          <nav aria-label="Project links" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href={repositoryUrl} target="_blank" rel="noreferrer" className="hover:text-white">GitHub</a>
            <a href={`mailto:${feedbackEmail}?subject=Phosub%20bug%20or%20feature%20report`} className="break-all hover:text-white">
              Report a bug or request a feature
            </a>
          </nav>
          <span className="text-[#77777d]">(c) {new Date().getFullYear()} Phosub</span>
        </div>
      </footer>
    )
  }

  return (
    <footer className="border-t border-[#292929] bg-[#111] text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-8">
        <div>
          <a href="/" className="text-xl font-bold tracking-tight text-[#e53935]">phosub</a>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#a5a5aa]">
            Phone handovers, clearly recorded for students and mentors.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Project</h2>
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm text-[#a5a5aa] transition-colors hover:text-white"
          >
            GitHub repository
          </a>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Feedback</h2>
          <p className="mt-3 text-sm text-[#a5a5aa]">Report a bug or request a feature</p>
          <a
            href={`mailto:${feedbackEmail}?subject=Phosub%20bug%20or%20feature%20report`}
            className="mt-1 inline-block break-all text-sm text-[#a5a5aa] transition-colors hover:text-white"
          >
            {feedbackEmail}
          </a>
        </div>
      </div>
      <div className="border-t border-[#292929]">
        <p className="mx-auto max-w-6xl px-5 py-4 text-xs text-[#77777d] sm:px-8">
          (c) {new Date().getFullYear()} Phosub
        </p>
      </div>
    </footer>
  )
}