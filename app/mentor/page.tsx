'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardCheck,
  Clock3,
  LogOut,
  Play,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { useAuth, LoadingSpinner } from '@/components/providers'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { getAccessToken } from '@/lib/supabase/auth-token'
import { ProfilePhotoEditor } from '@/components/profile-photo'
import { BottomNav, DashboardSidebar, TopBar } from '@/components/navigation/top-bar'
import { DashboardFooter } from '@/components/site-footer'

type Session = { id: string; squad: string; name: string; status: string; started_at: string; mentor_id: string }
type Handover = { id: string; student_id: string; session_id: string; status: string; reason: string | null; updated_at: string; student?: { full_name: string } }
type StudentAccount = { id: string; full_name: string; squad: string | null; created_at: string }
type View = 'sessions' | 'reports' | 'squads' | 'profile'

const squads = ['138', '139', '183']
const navigation: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'sessions', label: 'Sessions', icon: ClipboardCheck },
  { id: 'reports', label: 'Reports', icon: ChartNoAxesColumn },
  { id: 'squads', label: 'Squads', icon: UsersRound },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

function SessionBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: 'bg-[#D71920] text-white',
    ended: 'bg-[#F5F5F5] text-[#737373]',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${variants[status] || variants.ended}`}>
      {status}
    </span>
  )
}

function HandoverBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    submitted: 'bg-[#D71920] text-white',
    not_submitted: 'bg-[#F5F5F5] text-[#737373]',
    retrieved: 'bg-[#D71920] text-white',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${variants[status] || variants.not_submitted}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius

  return (
    <div className="relative grid size-[88px] shrink-0 place-items-center" role="img" aria-label={`${percent}% of handovers submitted`}>
      <svg className="size-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <span className="absolute text-lg font-bold text-white">{percent}%</span>
    </div>
  )
}

export default function MentorPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [handovers, setHandovers] = useState<Handover[]>([])
  const [students, setStudents] = useState<StudentAccount[]>([])
  const [profile, setProfile] = useState<{ role: string; squad: string | null; full_name: string; email: string; avatar_url: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedSquad, setSelectedSquad] = useState('')
  const [reportSessionId, setReportSessionId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [activeView, setActiveView] = useState<View>('sessions')

  useEffect(() => {
    if (authLoading || !user) return
    void loadData()
    const refreshTimer = window.setInterval(() => void loadData(false), 5000)
    const refreshOnFocus = () => void loadData(false)
    window.addEventListener('focus', refreshOnFocus)
    return () => {
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [user, authLoading])

  useEffect(() => {
    const handleAvatarUpdate = (event: Event) => {
      const avatarUrl = (event as CustomEvent<string>).detail
      if (avatarUrl) setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current)
    }
    window.addEventListener('phosub:avatar-updated', handleAvatarUpdate)
    return () => window.removeEventListener('phosub:avatar-updated', handleAvatarUpdate)
  }, [])

  async function loadData(showLoading = true) {
    if (showLoading) setLoading(true)
    try {
      const token = await getAccessToken()
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const [profRes, sessRes, handRes] = await Promise.all([
        fetch('/api/profile', { credentials: 'include', headers }),
        fetch('/api/sessions', { credentials: 'include', headers }),
        fetch('/api/handovers', { credentials: 'include', headers }),
      ])
      const prof = await profRes.json()
      const sess = await sessRes.json()
      const hand = await handRes.json()
      if (!profRes.ok || !sessRes.ok) {
        throw new Error(prof.error || sess.error || 'Unable to load your workspace')
      }
      const studentRes = await fetch('/api/students', { credentials: 'include', headers })
      const studentData = await studentRes.json()
      if (prof.profile?.role === 'mentor' && !studentRes.ok) {
        throw new Error(studentData.error || 'Unable to load student accounts')
      }
      setProfile(prof.profile ?? null)
      setSessions(sess.sessions ?? [])
      setHandovers(hand.handovers ?? [])
      setStudents(studentData.students ?? [])
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  async function startSession() {
    if (!selectedSquad) return
    setError('')
    setNotice('')
    setStarting(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Your sign-in has expired. Please sign in again.')
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ squad: selectedSquad }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 409) await loadData(false)
        if (response.status === 401) throw new Error('Your sign-in has expired. Please sign in again.')
        throw new Error(result.error || 'Unable to start session')
      }
      await loadData(false)
      setNotice(`Session for Squad ${selectedSquad} started.`)
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start session')
    } finally {
      setStarting(false)
    }
  }

  async function endSession(sessionId: string) {
    setError('')
    setNotice('')
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Your sign-in has expired. Please sign in again.')
      const res = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ id: sessionId }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Failed to end session')
      await loadData(false)
      setNotice(result.session?.squad ? `Session for Squad ${result.session.squad} ended.` : 'Session ended.')
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : 'Failed to end session')
    }
  }

  if (authLoading || loading) return <LoadingSpinner />

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF] p-6">
        <div className="max-w-md rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-[#171717]">Not signed in</h2>
          <p className="mb-4 text-sm text-[#171717]">Please sign in to access your dashboard.</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2 rounded-2xl bg-[#D71920] text-white font-semibold hover:bg-[#D71920] transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  const isMentor = profile?.role === 'mentor'
  const email = user.email ?? ''
  const displayName = profile?.full_name?.trim() || email.split('@')[0]?.replace(/[._-]/g, ' ') || 'Mentor'
  const reportSession = sessions.find((session) => session.id === reportSessionId)
  const reportHandovers = reportSessionId
    ? handovers.filter((handover) => handover.session_id === reportSessionId)
    : handovers.slice(0, 10)

  const activeSession = sessions.find((s) => s.status === 'active')
  const sessionHandovers = activeSession ? handovers.filter((h) => h.session_id === activeSession.id) : []
  const submittedCount = sessionHandovers.filter((h) => h.status === 'submitted').length
  const notSubmittedCount = sessionHandovers.filter((h) => h.status === 'not_submitted').length
  const retrievedCount = sessionHandovers.filter((h) => h.status === 'retrieved').length
  const completionPercent = sessionHandovers.length > 0 ? Math.round((submittedCount / sessionHandovers.length) * 100) : 0

  return (
    <div className="dashboard-web-stage min-h-screen bg-[#F8F5F4] text-[#171717]">
      <div className="dashboard-web-frame">
      <DashboardSidebar
        items={navigation}
        activeId={activeView}
        label="Mentor workspace"
        onSelect={(id) => {
          const view = id as View
          setActiveView(view)
          if (view === 'reports') setReportSessionId(null)
        }}
        onSignOut={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))}
      />
      <div className="dashboard-web-content min-w-0">
      <TopBar
        name={displayName}
        avatarUrl={profile?.avatar_url}
        onAction={() => {
          setActiveView('sessions')
          window.setTimeout(() => document.getElementById('start-session-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
        }}
      />
      <main className="dashboard-web-main mx-auto w-full max-w-[1200px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pt-8 lg:max-w-none lg:px-8 xl:px-10">
          {notice && (
            <div role="status" aria-live="polite" className="mb-5 rounded-2xl border border-[#E5E5E5] bg-[#E5E5E5] px-4 py-3 text-sm text-[#171717]">
              {notice}
            </div>
          )}
          {error && (
            <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] px-4 py-3 text-sm text-[#171717]">
              <span>{error}</span>
              {error.toLowerCase().includes('sign in again') && (
                <button type="button" onClick={() => router.replace('/login')} className="shrink-0 font-semibold underline underline-offset-2">Sign in</button>
              )}
            </div>
          )}

          {!isMentor ? (
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 text-base text-[#171717]">Your account is not registered as a mentor.</div>
          ) : activeView === 'sessions' ? (
            <>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="max-w-xl text-[30px] font-semibold leading-tight tracking-tight sm:text-4xl">Let’s make today productive</h1>
                </div>
                <p className="inline-flex items-center gap-2 pb-1 text-sm font-medium text-[#737373]">
                  <CalendarDays size={16} className="text-[#D71920]" />
                  {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                <section aria-labelledby="today-progress-title" className="dashboard-float-card overflow-hidden rounded-2xl bg-gradient-to-br from-[#D71920] to-[#A70F19] p-5 text-white shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white/75">Today’s progress</p>
                      <h2 id="today-progress-title" className="mt-1 text-xl font-semibold">{activeSession ? `Squad ${activeSession.squad} session` : 'Ready when you are'}</h2>
                    </div>
                    <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">
                      {activeSession ? 'In progress' : 'No active session'}
                    </span>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-6 sm:gap-8">
                    <ProgressRing percent={completionPercent} />
                    <div className="grid min-w-[190px] flex-1 grid-cols-3 gap-3">
                      <div className="border-l border-white/25 pl-3">
                        <p className="text-2xl font-semibold">{sessionHandovers.length}</p>
                        <p className="mt-1 text-xs text-white/75">Total</p>
                      </div>
                      <div className="border-l border-white/25 pl-3">
                        <p className="text-2xl font-semibold">{submittedCount}</p>
                        <p className="mt-1 text-xs text-white/75">Submitted</p>
                      </div>
                      <div className="border-l border-white/25 pl-3">
                        <p className="text-2xl font-semibold">{notSubmittedCount}</p>
                        <p className="mt-1 text-xs text-white/75">Pending</p>
                      </div>
                    </div>
                  </div>
                  {retrievedCount > 0 && <p className="mt-4 text-xs text-white/75">{retrievedCount} phone{retrievedCount === 1 ? '' : 's'} retrieved</p>}
                </section>

                <section aria-labelledby="start-session-title" className="dashboard-float-card rounded-2xl border border-[#E9E0DE] bg-white p-5 sm:p-6">
                  <h2 id="start-session-title" className="text-lg font-semibold">Start a session</h2>
                  <p className="mt-1 text-sm text-[#737373]">Choose the squad you are teaching today.</p>
                  <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Choose squad">
                    {squads.map((squad) => (
                      <button
                        key={squad}
                        type="button"
                        aria-pressed={selectedSquad === squad}
                        onClick={() => {
                          setSelectedSquad(squad)
                          setError('')
                        }}
                        className={`min-h-11 rounded-xl border px-2 text-sm transition-colors ${selectedSquad === squad ? 'border-[#D71920] bg-[#FCEBED] font-semibold text-[#B5121B]' : 'border-[#E9E0DE] bg-white text-[#525252] hover:border-[#D71920]/50'}`}
                      >Squad {squad}</button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={startSession}
                    disabled={!selectedSquad || starting}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#D71920] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#B5121B] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play size={16} /> {starting ? 'Starting...' : 'Start session'}
                  </button>
                </section>
              </div>

              <section className="mt-8" aria-labelledby="sessions-title">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 id="sessions-title" className="text-xl font-semibold">Sessions</h2>
                    <p className="mt-1 text-sm text-[#737373]">Phone handovers across your squads.</p>
                  </div>
                  <span className="rounded-full bg-[#FCEBED] px-3 py-1 text-xs font-semibold text-[#B5121B]">{sessions.length} total</span>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {sessions.map((session) => (
                    <article key={session.id} className="dashboard-float-card rounded-2xl border border-[#E9E0DE] bg-white p-4 shadow-[0_2px_8px_rgba(80,30,30,0.04)] sm:p-5">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-full ${session.status === 'active' ? 'bg-[#FCEBED] text-[#D71920]' : 'bg-[#F5F2F1] text-[#737373]'}`}>
                          <UsersRound size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-base font-semibold">Squad {session.squad}</h3>
                            <SessionBadge status={session.status} />
                          </div>
                          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#737373]">
                            <Clock3 size={13} /> {new Date(session.started_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F0E9E7] pt-3">
                        {session.mentor_id === user.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setReportSessionId(session.id)
                              setActiveView('reports')
                            }}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E9E0DE] px-3 text-sm font-medium text-[#525252] transition-colors hover:border-[#D71920] hover:text-[#B5121B]"
                          >View report</button>
                        )}
                        {session.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => endSession(session.id)}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#FCEBED] px-3 text-sm font-semibold text-[#B5121B] transition-colors hover:bg-[#F7DADD]"
                          >End session</button>
                        )}
                        {session.status === 'active' && session.mentor_id !== user.id && (
                          <p className="self-center text-sm text-[#737373]">Started by another mentor</p>
                        )}
                      </div>
                    </article>
                  ))}
                  {sessions.length === 0 && <p className="dashboard-float-card rounded-2xl border border-dashed border-[#D9CECB] bg-white px-4 py-10 text-center text-sm text-[#737373] xl:col-span-2">No sessions yet. Choose a squad above to get started.</p>}
                </div>
              </section>
            </>
          ) : activeView === 'squads' ? (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#171717]">Mentor workspace</p>
              <h1 className="text-3xl font-bold">Squads</h1>
              <p className="mb-6 mt-2 text-sm text-[#171717]">Choose a squad when starting a handover session.</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {squads.map((squad) => (
                  <button key={squad} type="button" onClick={() => { setSelectedSquad(squad); setActiveView('sessions') }} className="dashboard-float-card min-h-32 rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 text-left transition-colors hover:border-[#E5E5E5]">
                    <UsersRound size={20} className="mb-4 text-[#171717]" />
                    <span className="block text-base font-semibold">Squad {squad}</span>
                    <span className="mt-1.5 block text-sm text-[#171717]">{sessions.filter((session) => session.squad === squad && session.status === 'active').length} active sessions</span>
                    <span className="mt-1 block text-sm text-[#171717]">{students.filter((student) => student.squad === squad).length} registered accounts</span>
                  </button>
                ))}
              </div>
              <section className="mt-10" aria-labelledby="student-accounts-title">
                <h2 id="student-accounts-title" className="text-xl font-bold">Registered student accounts</h2>
                <p className="mb-5 mt-1.5 text-sm text-[#171717]">Students who have completed profile setup in Phosub.</p>
                <div className="grid gap-4 xl:grid-cols-3">
                  {squads.map((squad) => {
                    const squadStudents = students.filter((student) => student.squad === squad)
                    return (
                      <section key={squad} className="dashboard-float-card rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 sm:p-5" aria-label={`Registered students in Squad ${squad}`}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold">Squad {squad}</h3>
                          <span className="rounded-full bg-[#E5E5E5] px-2.5 py-1 text-xs font-semibold text-[#171717]">{squadStudents.length}</span>
                        </div>
                        {squadStudents.length ? (
                          <ul className="divide-y divide-[#E5E5E5]">
                            {squadStudents.map((student) => (
                              <li key={student.id} className="py-3 first:pt-1 last:pb-1">
                                <p className="text-sm font-medium">{student.full_name}</p>
                                <time dateTime={student.created_at} className="mt-1 block text-xs text-[#171717]">
                                  Account created {new Date(student.created_at).toLocaleDateString()}
                                </time>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="py-3 text-sm text-[#171717]">No student profiles yet.</p>
                        )}
                      </section>
                    )
                  })}
                </div>
              </section>
            </section>
          ) : activeView === 'reports' ? (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#171717]">Mentor workspace</p>
              <h1 className="text-3xl font-bold">{reportSession ? `${reportSession.name} report` : 'Recent handovers'}</h1>
              <p className="mb-6 mt-2 text-sm text-[#171717]">
                {reportSession ? `Squad ${reportSession.squad} handover statuses for this session.` : 'A record of recent student phone handovers.'}
              </p>
              <div className="space-y-3 lg:hidden">
                {reportHandovers.map((handover) => (
                  <article key={handover.id} className="dashboard-float-card rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-semibold">{handover.student?.full_name || 'Student'}</h2>
                      <span className="shrink-0 rounded-full bg-[#E5E5E5] px-2.5 py-1 text-xs font-semibold capitalize text-[#171717]">{handover.status.replace('_', ' ')}</span>
                    </div>
                    <p className="mt-3 text-sm text-[#171717]">{handover.reason || 'No reason provided'}</p>
                    <p className="mt-2 text-xs text-[#171717]">Updated {new Date(handover.updated_at).toLocaleString()}</p>
                  </article>
                ))}
                {reportHandovers.length === 0 && <p className="rounded-2xl border border-dashed border-[#E5E5E5] px-4 py-8 text-center text-sm text-[#171717]">{reportSession ? 'No handovers recorded for this session yet.' : 'No handovers to report yet.'}</p>}
              </div>
              <div className="dashboard-float-card hidden overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-[#FFFFFF] text-xs text-[#171717]"><tr><th className="px-5 py-4 font-medium">Student</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4 font-medium">Reason</th><th className="px-5 py-4 font-medium">Updated</th></tr></thead>
                    <tbody>
                      {reportHandovers.map((handover) => (
                        <tr key={handover.id} className="border-t border-[#E5E5E5]"><td className="px-5 py-4 font-semibold">{handover.student?.full_name || 'Student'}</td><td className="px-5 py-4 capitalize">{handover.status.replace('_', ' ')}</td><td className="px-5 py-4 text-[#171717]">{handover.reason || '—'}</td><td className="px-5 py-4 text-[#171717]">{new Date(handover.updated_at).toLocaleString()}</td></tr>
                      ))}
                      {reportHandovers.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-[#171717]">{reportSession ? 'No handovers recorded for this session yet.' : 'No handovers to report yet.'}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#171717]">Mentor workspace</p>
              <h1 className="text-3xl font-bold">Profile</h1>
              <div className="dashboard-float-card mt-6 max-w-2xl rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 sm:p-6">
                <div className="mb-6 border-b border-[#E5E5E5] pb-6">
                  <ProfilePhotoEditor
                    avatarUrl={profile?.avatar_url}
                    name={displayName}
                    onUploaded={(avatarUrl) => setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current)}
                  />
                </div>
                <p className="text-xs text-[#171717]">Name</p>
                <p className="mt-1.5 text-base font-semibold capitalize">{displayName}</p>
                <p className="mt-5 text-xs text-[#171717]">Email</p>
                <p className="mt-1.5 break-all text-base font-medium">{email}</p>
                <p className="mt-5 text-xs text-[#171717]">Role</p>
                <p className="mt-1.5 text-base font-medium">Mentor</p>
                <button
                  type="button"
                  onClick={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))}
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E9E0DE] px-4 text-sm font-semibold text-[#525252] transition-colors hover:border-[#D71920] hover:text-[#B5121B]"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </section>
          )}
          <DashboardFooter />
        </main>
      </div>
      <BottomNav
        items={navigation}
        activeId={activeView}
        label="Mentor navigation"
        onSelect={(id) => {
          const view = id as View
          setActiveView(view)
          if (view === 'reports') setReportSessionId(null)
        }}
      />
      </div>
    </div>
  )
}