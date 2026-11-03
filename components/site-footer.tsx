'use client'

import { usePathname } from 'next/navigation'

const repositoryUrl = 'https://github.com/manojponnusamy2032-star/build-phosub-frontend'
const feedbackEmail = 'manoj.ponnusamy.s.138@kalvium.community'

export default function SiteFooter() {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/student') || pathname?.startsWith('/mentor')
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname?.startsWith('/auth/')

  if (isDashboard || isAuthPage) return null

  return (
    <footer className="public-footer-stage">
      <div className="public-footer-card">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <a href="/" className="text-xl font-bold tracking-tight text-[#171717]">phosub</a>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#5F5755]">
            Phone handovers, clearly recorded for students and mentors.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#171717]">Project</h2>
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm text-[#5F5755] transition-colors hover:text-[#B5121B]"
          >
            GitHub repository
          </a>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#171717]">Support</h2>
          <div className="mt-3 flex flex-col items-start gap-2 text-sm text-[#5F5755]">
            <a href={`mailto:${feedbackEmail}`} className="break-all transition-colors hover:text-[#B5121B]">{feedbackEmail}</a>
            <a href={`mailto:${feedbackEmail}?subject=Phosub%20bug%20or%20feature%20report`} className="transition-colors hover:text-[#B5121B]">
              Report a bug or request a feature
            </a>
          </div>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-3 border-t border-[#E9E0DE] pt-5 text-xs text-[#5F5755] sm:flex-row sm:items-center sm:justify-between">
        <p>
          (c) {new Date().getFullYear()} Phosub. All rights reserved.
        </p>
        <span>Phone handovers, clearly recorded.</span>
      </div>
      </div>
    </footer>
  )
}

export function DashboardFooter() {
  return (
    <footer className="mt-10 rounded-[28px] border border-white/90 bg-white/85 p-6 shadow-[0_16px_40px_rgba(39,31,29,0.12)] backdrop-blur-xl sm:p-8 lg:p-10">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))] lg:gap-10">
        <div>
          <a href="/" className="text-xl font-bold tracking-tight text-[#171717]">phosub</a>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#5F5755]">
            Phone handovers, clearly recorded for students and mentors.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#171717]">Workspace</h2>
          <nav aria-label="Workspace links" className="mt-3 flex flex-col items-start gap-2.5 text-sm text-[#5F5755]">
            <a href="/student" className="transition-colors hover:text-[#B5121B]">Student dashboard</a>
            <a href="/mentor" className="transition-colors hover:text-[#B5121B]">Mentor dashboard</a>
          </nav>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#171717]">Project</h2>
          <nav aria-label="Project links" className="mt-3 flex flex-col items-start gap-2.5 text-sm text-[#5F5755]">
            <a href={repositoryUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-[#B5121B]">GitHub repository</a>
          </nav>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#171717]">Support</h2>
          <div className="mt-3 flex flex-col items-start gap-2 text-sm text-[#5F5755]">
            <a href={`mailto:${feedbackEmail}`} className="break-all transition-colors hover:text-[#B5121B]">{feedbackEmail}</a>
            <a href={`mailto:${feedbackEmail}?subject=Phosub%20bug%20or%20feature%20report`} className="transition-colors hover:text-[#B5121B]">
              Report a bug or request a feature
            </a>
          </div>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-3 border-t border-[#E9E0DE] pt-5 text-xs text-[#5F5755] sm:flex-row sm:items-center sm:justify-between">
        <span>(c) {new Date().getFullYear()} Phosub. All rights reserved.</span>
        <span>Phone handovers, clearly recorded.</span>
      </div>
    </footer>
  )
}