'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  Clock,
  ClipboardCheck,
  FileSpreadsheet,
  LogOut,
  Play,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth, LoadingSpinner } from '@/components/providers'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { getAccessToken } from '@/lib/supabase/auth-token'
import { ProfileAvatar, ProfilePhotoEditor } from '@/components/profile-photo'

type Session = { id: string; squad: string; name: string; status: string; started_at: string; mentor_id: string; mentor_name?: string }
type Handover = { id: string; student_id: string; session_id: string; status: string; reason: string | null; phone_model: string | null; updated_at: string; student?: { full_name: string } }
type StudentAccount = { id: string; full_name: string; squad: string | null; created_at: string }
type View = 'sessions' | 'reports' | 'squads' | 'profile'

const squads = ['138', '139', '183']
const navigation: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'sessions', label: 'Sessions', icon: ClipboardCheck },
  { id: 'reports', label: 'Reports', icon: ChartNoAxesColumn },
  { id: 'squads', label: 'Squads', icon: UsersRound },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

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
  const [activeSquads, setActiveSquads] = useState<string[]>([])
  const [starting, setStarting] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(false)
  const [reportSessionId, setReportSessionId] = useState<string | null>(null)
  const [reportFilter, setReportFilter] = useState<'submitted' | 'not_submitted' | 'not_responded' | null>(null)
  const [activeView, setActiveView] = useState<View>('sessions')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

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
      setActiveSquads((prev) => [...prev, selectedSquad].sort())
      setNotice(`Session for Squad ${selectedSquad} started.`)
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start session')
    } finally {
      setStarting(false)
    }
  }

  async function endSession(sessionId: string) {
    const session = sessions.find((s) => s.id === sessionId)
    if (session && user && session.mentor_id !== user.id) {
      const starterName = session.mentor_name || 'another mentor'
      if (!window.confirm(`This session was started by ${starterName}. Shall we stop it?`)) return
    }
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
      setActiveSquads((prev) => prev.filter((s) => s !== session?.squad))
      setNotice(result.session?.squad ? `Session for Squad ${result.session.squad} ended.` : 'Session ended.')
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : 'Failed to end session')
    }
  }

  async function downloadSessionReport(session: Session) {
    setError('')
    setNotice('')
    setDownloadingReport(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Your sign-in has expired. Please sign in again.')
      const response = await fetch(`/api/sessions/report?session_id=${encodeURIComponent(session.id)}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Unable to download session report')
      }

      const reportUrl = URL.createObjectURL(await response.blob())
      const downloadLink = document.createElement('a')
      downloadLink.href = reportUrl
      downloadLink.download = `squad-${session.squad}-handover-report.xlsx`
      document.body.append(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.setTimeout(() => URL.revokeObjectURL(reportUrl), 1000)
      setNotice('Excel report downloaded.')
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to download session report')
    } finally {
      setDownloadingReport(false)
    }
  }

  if (authLoading || loading) return <LoadingSpinner />

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EFEEE8] p-6">
        <div className="max-w-md rounded-xl border border-[#D3CCC7] bg-[#EFEEE8] p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-[#000000]">Not signed in</h2>
          <p className="mb-4 text-sm text-[#000000]">Please sign in to access your dashboard.</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2 rounded-lg bg-[#EF0606] text-[#000000] font-semibold hover:bg-[#EF0606] transition-colors"
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
  const activeTitle = navigation.find((item) => item.id === activeView)?.label ?? 'Sessions'
  const activeSessionCount = sessions.filter((session) => session.status === 'active').length
  const submittedHandoverCount = handovers.filter((handover) => handover.status === 'submitted').length
  const reportSession = sessions.find((session) => session.id === reportSessionId)
  const reportHandovers = reportSessionId
    ? handovers.filter((handover) => handover.session_id === reportSessionId)
    : handovers.slice(0, 10)

  const sessionSquadStudents = reportSession
    ? students.filter((student) => student.squad === reportSession.squad)
    : []
  const submittedStudentIds = new Set(
    reportHandovers.filter((handover) => handover.status === 'submitted').map((handover) => handover.student_id)
  )
  const notSubmittedStudentIds = new Set(
    reportHandovers.filter((handover) => handover.status !== 'submitted').map((handover) => handover.student_id)
  )
  const respondedStudentIds = new Set(reportHandovers.map((handover) => handover.student_id))
  const submittedStudents = sessionSquadStudents.filter((student) => submittedStudentIds.has(student.id))
  const notSubmittedStudents = sessionSquadStudents.filter((student) => notSubmittedStudentIds.has(student.id))
  const notRespondedStudents = sessionSquadStudents.filter((student) => !respondedStudentIds.has(student.id))

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-[#EFEEE8] text-[#000000] lg:max-w-none">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-[#262626] bg-[#000000] px-5 py-5 text-[#EFEEE8] lg:flex">
        <a href="#sessions" onClick={() => setActiveView('sessions')} className="mb-9 flex items-center gap-2.5 px-0.5">
          <span className="grid size-7 place-items-center rounded-md bg-[#EF0606] text-[#000000]">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h6m-6 0v7m0-7 4 4m-4-4 4-4m12 4h-6m6 0v-7m0 7-4-4m4 4-4 4" /></svg>
          </span>
          <span className="text-lg font-bold tracking-tight text-[#EFEEE8]">phosub</span>
        </a>

        <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.16em] text-[#D3CCC7]">Workspace</p>
        <nav aria-label="Mentor workspace" className="space-y-1.5">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveView(id)
                if (id === 'reports') setReportSessionId(null)
              }}
              aria-current={activeView === id ? 'page' : undefined}
              className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${activeView === id ? 'bg-[#EF0606] font-semibold text-[#000000]' : 'text-[#EFEEE8] hover:bg-[#202020] hover:text-white'}`}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="rounded-lg bg-[#181818] px-3 py-3">
            <p className="text-xs font-semibold">Mentor workspace</p>
            <p className="mt-1 truncate text-xs text-[#D3CCC7]">Connected workspace</p>
          </div>
          <button
            type="button"
            onClick={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))}
            className="mt-4 flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#EFEEE8] hover:bg-[#202020] hover:text-white"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-h-screen w-full lg:pl-56">
        <header className="sticky top-0 z-20 border-b border-[#262626] bg-[#000000]/95 px-4 text-[#EFEEE8] backdrop-blur-md lg:flex lg:h-16 lg:items-center lg:justify-between lg:border-[#000000] lg:bg-[#000000] lg:px-6 lg:text-[#EFEEE8]">
          <div className="mx-auto flex h-16 max-w-md items-center justify-between lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <ProfileAvatar avatarUrl={profile?.avatar_url} name={displayName} />
              <span className="min-w-0">
                <span className="block text-xs text-[#D3CCC7]">Good morning,</span>
                <span className="block truncate text-sm font-semibold">{displayName}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen)
                    setAccountMenuOpen(false)
                  }}
                  className="relative grid size-10 place-items-center rounded-full border border-[#303030] bg-[#181818] text-[#EFEEE8] transition-all duration-200 active:scale-95"
                >
                  <Bell size={18} strokeWidth={1.7} />
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-[#EF0606] ring-2 ring-[#181818]" />
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-[#303030] bg-[#000000] p-4 text-sm text-[#EFEEE8] shadow-lg">
                    <p className="font-semibold">Notifications</p>
                    <p className="mt-1 text-[#D3CCC7]">You’re all caught up.</p>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Account"
                  aria-expanded={accountMenuOpen}
                  onClick={() => {
                    setAccountMenuOpen(!accountMenuOpen)
                    setNotificationsOpen(false)
                  }}
                  className="grid size-10 place-items-center rounded-full border border-[#303030] bg-[#181818] text-[#EFEEE8] transition-all duration-200 active:scale-95"
                >
                  <UserRound size={18} strokeWidth={1.7} />
                </button>
                {accountMenuOpen && (
                  <div className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-[#303030] bg-[#000000] p-3 text-[#EFEEE8] shadow-lg">
                    <p className="truncate px-2 py-1 text-xs text-[#D3CCC7]">{email}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('profile')
                        setAccountMenuOpen(false)
                      }}
                      className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-[#202020]"
                    ><UserRound size={16} /> My Profile</button>
                    <button
                      type="button"
                      onClick={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))}
                      className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-[#202020]"
                    ><LogOut size={16} /> Sign out</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-[#D3CCC7] lg:flex">
            <span className="font-medium text-[#EFEEE8]">Mentor workspace</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-[#EFEEE8]">{activeTitle}</span>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen)
                  setAccountMenuOpen(false)
                }}
                className="relative grid size-10 place-items-center rounded-lg text-[#D3CCC7] hover:bg-[#000000] hover:text-[#EFEEE8]"
              >
                <Bell size={18} strokeWidth={1.7} />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-[#EF0606]" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-11 z-40 w-64 rounded-lg border border-[#000000] bg-[#000000] p-4 text-sm text-[#EFEEE8]">
                  <p className="font-semibold">Notifications</p>
                  <p className="mt-1 text-[#D3CCC7]">You’re all caught up.</p>
                </div>
              )}
            </div>
            <div className="relative border-l border-[#000000] pl-3">
              <button
                type="button"
                aria-expanded={accountMenuOpen}
                onClick={() => {
                  setAccountMenuOpen(!accountMenuOpen)
                  setNotificationsOpen(false)
                }}
                className="flex items-center gap-2 text-left text-[#EFEEE8]"
              >
                <ProfileAvatar avatarUrl={profile?.avatar_url} name={displayName} />
                <span className="hidden sm:block">
                  <span className="block max-w-40 truncate text-xs font-semibold">{displayName}</span>
                  <span className="block text-[11px] text-[#000000]">mentor</span>
                </span>
                <ChevronDown size={15} className="text-[#D3CCC7]" />
              </button>
              {accountMenuOpen && (
                <div className="absolute right-0 top-11 z-40 w-64 rounded-lg border border-[#000000] bg-[#000000] p-3 text-[#EFEEE8]">
                  <p className="truncate px-2 py-1 text-xs text-[#D3CCC7]">{email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('profile')
                      setAccountMenuOpen(false)
                    }}
                    className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-[#000000]"
                  ><UserRound size={16} /> My Profile</button>
                  <button
                    type="button"
                    onClick={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))}
                    className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-[#000000]"
                  ><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-5 sm:pt-8 lg:max-w-[1200px] lg:px-10 lg:pb-12">
          {notice && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <div className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm" />
              <div className="relative bg-[#EFEEE8] text-[#000000] rounded-xl border-2 border-[#EF0606] px-8 py-6 shadow-2xl flex flex-col items-center gap-4">
                <p className="text-lg font-bold">{notice}</p>
                <button
                  type="button"
                  onClick={() => setNotice('')}
                  className="px-6 py-2 rounded-lg bg-[#EF0606] text-sm font-bold text-[#000000] hover:bg-[#EF0606] transition-all shadow-lg"
                >
                  OK
                </button>
              </div>
            </div>
          )}
          {error && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <div className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm" />
              <div className="relative bg-[#EFEEE8] text-[#000000] rounded-xl border-2 border-[#D3CCC7] px-8 py-6 shadow-2xl flex flex-col items-center gap-4">
                <p className="text-lg font-bold">{error}</p>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="px-6 py-2 rounded-lg bg-[#EF0606] text-sm font-bold text-[#000000] hover:bg-[#EF0606] transition-all shadow-lg"
                >
                  OK
                </button>
                {error.toLowerCase().includes('sign in again') && (
                  <button type="button" onClick={() => router.replace('/login')} className="mt-3 text-sm font-semibold underline underline-offset-2">Sign in</button>
                )}
              </div>
            </div>
          )}
          {!isMentor ? (
            <div className="rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] p-6 text-base text-[#000000]">Your account is not registered as a mentor.</div>
          ) : activeView === 'sessions' ? (
            <>
              <div className="mb-5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#000000]">Mentor workspace</p>
                <h1 className="text-2xl font-bold leading-tight tracking-tight">Session dashboard</h1>
                <p className="mt-2 text-sm text-[#000000]">Start a session for one squad. Only students in that squad can submit phones.</p>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Active', value: activeSessionCount, icon: Play },
                  { label: 'Students', value: students.length, icon: UsersRound },
                  { label: 'Submitted', value: submittedHandoverCount, icon: Check },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="min-w-0 rounded-2xl border border-[#D3CCC7] bg-white p-3 shadow-sm">
                    <span className="mb-3 grid size-8 place-items-center rounded-xl bg-[#EFEEE8] text-[#000000]">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <p className="text-[10px] font-medium text-[#000000]">{label}</p>
                    <p className="mt-0.5 text-lg font-bold">{value}</p>
                  </div>
                ))}
              </div>

              <section aria-labelledby="start-session-title" className="w-full rounded-3xl border border-[#D3CCC7] bg-white p-4 shadow-sm sm:p-6">
                <h2 id="start-session-title" className="text-lg font-bold">Start a session</h2>
                <p className="mt-1.5 text-sm text-[#000000]">Choose the squad you are teaching today.</p>
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
                      className={`min-h-12 w-full rounded-2xl border px-2 text-xs transition-all duration-200 ease-out active:scale-95 motion-reduce:transition-none sm:text-sm ${selectedSquad === squad ? 'scale-[1.03] border-[#EF0606] bg-[#EF0606] font-semibold text-[#000000] shadow-[0_6px_16px_rgba(239,6,6,0.2)]' : activeSquads.includes(squad) ? 'border-[#EF0606] bg-[#EF0606]/10 font-semibold text-[#EF0606]' : 'border-[#D3CCC7] bg-[#EFEEE8] text-[#000000] hover:-translate-y-0.5 hover:border-[#EF0606]/60 hover:bg-white'}`}
                    >Squad {squad}</button>
                  ))}
                </div>
                {(() => {
                  const activeSessionForSquad = sessions.find((s) => s.squad === selectedSquad && s.status === 'active')
                  return (
                    <button
                      type="button"
                      onClick={activeSessionForSquad ? () => endSession(activeSessionForSquad.id) : startSession}
                      disabled={!selectedSquad || starting}
                      className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#EF0606] px-4 text-sm font-semibold text-[#000000] transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Play size={16} />
                      {starting ? 'Starting...' : activeSessionForSquad ? `Stop session for Squad ${selectedSquad}` : `Start session for Squad ${selectedSquad}`}
                    </button>
                  )
                })()}
              </section>
              <section className="mt-7">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#000000]">Your squads</p>
                    <h2 className="mt-1 text-lg font-bold">Sessions</h2>
                  </div>
                  <span className="text-xs text-[#000000]">{sessions.length} total</span>
                </div>
                <div className="space-y-3 lg:hidden">
                  {sessions.map((session) => {
                    const squadSize = students.filter((student) => student.squad === session.squad).length
                    const submittedCount = handovers.filter((handover) => handover.session_id === session.id && handover.status === 'submitted').length
                    const completion = squadSize ? Math.round((submittedCount / squadSize) * 100) : 0
                    return (
                    <article key={session.id} className="rounded-2xl border border-[#D3CCC7] bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-[#000000]">{session.name}</p>
                          <h3 className="mt-0.5 text-base font-bold">Squad {session.squad}</h3>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${session.status === 'active' ? 'bg-[#EF0606]/10 text-[#000000]' : 'bg-[#EFEEE8] text-[#000000]'}`}>{session.status}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#000000]">
                        <Clock size={14} aria-hidden="true" />
                        Started {new Date(session.started_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-[#000000]">{submittedCount} of {squadSize} phones submitted</span>
                          <span className="font-semibold">{completion}%</span>
                        </div>
                        <div role="progressbar" aria-label={`Squad ${session.squad} handover completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion} className="h-1.5 overflow-hidden rounded-full bg-[#EFEEE8]">
                          <div className="h-full rounded-full bg-[#EF0606] transition-all duration-200" style={{ width: `${completion}%` }} />
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReportSessionId(session.id)
                            setActiveView('reports')
                          }}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D3CCC7] bg-[#EFEEE8] px-3 text-xs font-semibold text-[#000000] transition-all duration-200 active:scale-95"
                        >View report</button>
                        {session.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => endSession(session.id)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#EF0606] px-3 text-xs font-semibold text-[#000000] transition-all duration-200 active:scale-95"
                          >End session</button>
                        )}
                      </div>
                    </article>
                    )
                  })}
                  {sessions.length === 0 && <p className="rounded-lg border border-dashed border-[#D3CCC7] px-4 py-8 text-center text-sm text-[#000000]">No sessions yet.</p>}
                </div>
                <div className="hidden overflow-hidden rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] lg:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-[#EFEEE8] text-xs text-[#000000]"><tr><th className="px-5 py-4 font-medium">Squad</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4 font-medium">Started</th><th className="px-5 py-4 font-medium">Submitted</th><th className="px-5 py-4 font-medium">Actions</th></tr></thead>
                      <tbody>
                        {sessions.map((session) => {
                          const squadSize = students.filter((student) => student.squad === session.squad).length
                          const submittedCount = handovers.filter((handover) => handover.session_id === session.id && handover.status === 'submitted').length
                          const completion = squadSize ? Math.round((submittedCount / squadSize) * 100) : 0
                          return (
                            <tr key={session.id} className="border-t border-[#D3CCC7]">
                              <td className="px-5 py-4 font-semibold">Squad {session.squad}</td>
                              <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${session.status === 'active' ? 'bg-[#EFEEE8] text-[#000000]' : 'bg-[#D3CCC7] text-[#000000]'}`}>{session.status}</span></td>
                              <td className="px-5 py-4 text-[#000000]">{new Date(session.started_at).toLocaleString(undefined, { hour12: true })}</td>
                              <td className="whitespace-nowrap px-5 py-4 text-sm">{submittedCount} of {squadSize} ({completion}%)</td>
                              <td className="whitespace-nowrap px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReportSessionId(session.id)
                                      setActiveView('reports')
                                    }}
                                    className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-md bg-[#EF0606] px-3 text-sm font-medium text-[#000000] hover:bg-[#EF0606] transition-colors"
                                  >View report</button>
                                  {session.status === 'active' && (
                                    <button
                                      type="button"
                                      onClick={() => endSession(session.id)}
                                      className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#EF0606] px-3 text-sm font-medium text-[#EF0606] transition-colors hover:bg-[#EF0606]/10"
                                    >End session</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        {sessions.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#000000]">No sessions yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </>
          ) : activeView === 'squads' ? (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#000000]">Mentor workspace</p>
              <h1 className="text-3xl font-bold">Squads</h1>
              <p className="mb-6 mt-2 text-sm text-[#000000]">Choose a squad when starting a handover session.</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {squads.map((squad) => (
                  <button key={squad} type="button" onClick={() => { setSelectedSquad(squad); setActiveView('sessions') }} className="min-h-32 rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] p-5 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#EF0606]/60 hover:bg-white active:scale-[0.98] motion-reduce:transition-none">
                    <UsersRound size={20} className="mb-4 text-[#000000]" />
                    <span className="block text-base font-semibold">Squad {squad}</span>
                    <span className="mt-1.5 block text-sm text-[#000000]">{sessions.filter((session) => session.squad === squad && session.status === 'active').length} active sessions</span>
                    <span className="mt-1 block text-sm text-[#000000]">{students.filter((student) => student.squad === squad).length} registered accounts</span>
                  </button>
                ))}
              </div>
              <section className="mt-10" aria-labelledby="student-accounts-title">
                <h2 id="student-accounts-title" className="text-xl font-bold">Registered student accounts</h2>
                <p className="mb-5 mt-1.5 text-sm text-[#000000]">Students who have completed profile setup in Phosub.</p>
                <div className="grid gap-4 xl:grid-cols-3">
                  {squads.map((squad) => {
                    const squadStudents = students.filter((student) => student.squad === squad)
                    return (
                      <section key={squad} className="rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] p-4 sm:p-5" aria-label={`Registered students in Squad ${squad}`}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold">Squad {squad}</h3>
                          <span className="rounded-full bg-[#D3CCC7] px-2.5 py-1 text-xs font-semibold text-[#000000]">{squadStudents.length}</span>
                        </div>
                        {squadStudents.length ? (
                          <ul className="divide-y divide-[#D3CCC7]">
                            {squadStudents.map((student) => (
                              <li key={student.id} className="py-3 first:pt-1 last:pb-1">
                                <p className="text-sm font-medium">{student.full_name}</p>
                                <time dateTime={student.created_at} className="mt-1 block text-xs text-[#000000]">
                                  Account created {new Date(student.created_at).toLocaleDateString()}
                                </time>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="py-3 text-sm text-[#000000]">No student profiles yet.</p>
                        )}
                      </section>
                    )
                  })}
                </div>
              </section>
            </section>
          ) : activeView === 'reports' ? (
            <section>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#000000]">Mentor workspace</p>
                  <h1 className="text-2xl font-bold sm:text-3xl">{reportSession ? `${reportSession.name} report` : 'Recent handovers'}</h1>
                  <p className="mt-2 text-sm text-[#000000]">
                    {reportSession ? `Squad ${reportSession.squad} handover statuses for this session.` : 'A record of recent student phone handovers.'}
                  </p>
                </div>
                {reportSession?.status === 'ended' && (
                  <button
                    type="button"
                    title="Download Excel report"
                    aria-label="Download Excel report"
                    aria-busy={downloadingReport}
                    disabled={downloadingReport}
                    onClick={() => void downloadSessionReport(reportSession)}
                    className="mt-1 grid size-11 shrink-0 place-items-center rounded-md border border-[#D3CCC7] bg-[#EFEEE8] text-[#000000] transition-colors hover:bg-[#D3CCC7] disabled:cursor-wait disabled:opacity-60"
                  >
                    <FileSpreadsheet size={19} aria-hidden="true" />
                  </button>
                )}
              </div>

              {reportSession ? (
                <>
                  <div className="mb-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3" role="group" aria-label="Handover submission filter">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={reportFilter === 'submitted'}
                      onClick={() => setReportFilter('submitted')}
                      className={`flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-xs font-semibold transition-all duration-200 active:scale-95 sm:min-h-11 sm:min-w-[140px] sm:flex-row sm:px-4 sm:text-sm ${reportFilter === 'submitted' ? 'bg-[#EF0606] border-[#EF0606] text-[#000000]' : 'border-[#D3CCC7] bg-white text-[#000000] hover:border-[#D3CCC7]'}`}
                    >
                      <Check size={15} strokeWidth={2} />
                      <span className="leading-tight">Submitted</span>
                      <span className="inline-flex items-center rounded-full bg-[#000000] px-2 py-0.5 text-[10px] text-[#EFEEE8] sm:ml-1">{submittedStudents.length}</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={reportFilter === 'not_submitted'}
                      onClick={() => setReportFilter('not_submitted')}
                      className={`flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-xs font-semibold transition-all duration-200 active:scale-95 sm:min-h-11 sm:min-w-[140px] sm:flex-row sm:px-4 sm:text-sm ${reportFilter === 'not_submitted' ? 'bg-[#EF0606] border-[#EF0606] text-[#000000]' : 'border-[#D3CCC7] bg-white text-[#000000] hover:border-[#D3CCC7]'}`}
                    >
                      <X size={15} strokeWidth={2} />
                      <span className="leading-tight">Not Submitted</span>
                      <span className="inline-flex items-center rounded-full bg-[#000000] px-2 py-0.5 text-[10px] text-[#EFEEE8] sm:ml-1">{notSubmittedStudents.length}</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={reportFilter === 'not_responded'}
                      onClick={() => setReportFilter('not_responded')}
                      className={`flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-xs font-semibold transition-all duration-200 active:scale-95 sm:min-h-11 sm:min-w-[140px] sm:flex-row sm:px-4 sm:text-sm ${reportFilter === 'not_responded' ? 'bg-[#EF0606] border-[#EF0606] text-[#000000]' : 'border-[#D3CCC7] bg-white text-[#000000] hover:border-[#D3CCC7]'}`}
                    >
                      <Clock size={15} strokeWidth={2} />
                      <span className="leading-tight">Not Responded</span>
                      <span className="inline-flex items-center rounded-full bg-[#000000] px-2 py-0.5 text-[10px] text-[#EFEEE8] sm:ml-1">{notRespondedStudents.length}</span>
                    </button>
                  </div>

                  <div className="rounded-3xl border border-[#D3CCC7] bg-white p-4 shadow-sm sm:p-5">
                    {reportFilter === null ? (
                      <p className="text-sm text-[#000000] text-center">Select Submitted, Not Submitted or Not Responded above to view students.</p>
                    ) : reportFilter === 'submitted' ? (
                      <>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#000000]">Submitted</h3>
                        {submittedStudents.length ? (
                          <ul className="divide-y divide-[#D3CCC7]">
                            {submittedStudents.map((student) => {
                              const handover = reportHandovers.find((h) => h.student_id === student.id)
                              return (
                                <li key={student.id} className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium">{student.full_name}</p>
                                    <p className="mt-0.5 text-xs text-[#000000]">Phone {handover?.phone_model || '—'}</p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-[#EFEEE8] px-2.5 py-1 text-xs font-semibold text-[#000000]">Submitted</span>
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <p className="py-4 text-center text-sm text-[#000000]">No students have submitted yet.</p>
                        )}
                      </>
                    ) : reportFilter === 'not_submitted' ? (
                      <>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#000000]">Not Submitted</h3>
                        {notSubmittedStudents.length ? (
                          <ul className="divide-y divide-[#D3CCC7]">
                            {notSubmittedStudents.map((student) => {
                              const handover = reportHandovers.find((h) => h.student_id === student.id)
                              return (
                                <li key={student.id} className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium">{student.full_name}</p>
                                    <p className="mt-0.5 text-xs text-[#000000]">Reason {handover?.reason || '—'}</p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-[#D3CCC7] px-2.5 py-1 text-xs font-semibold text-[#000000]">Not Submitted</span>
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <p className="py-4 text-center text-sm text-[#000000]">All students have submitted.</p>
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#000000]">Not Responded</h3>
                        {notRespondedStudents.length ? (
                          <ul className="divide-y divide-[#D3CCC7]">
                            {notRespondedStudents.map((student) => (
                              <li key={student.id} className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3">
                                <p className="text-sm font-medium">{student.full_name}</p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="py-4 text-center text-sm text-[#000000]">All students have responded.</p>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                reportHandovers.length ? (
                  <>
                  <div className="space-y-2 sm:hidden">
                    {reportHandovers.map((handover) => {
                      const session = sessions.find((item) => item.id === handover.session_id)
                      return (
                        <article key={handover.id} className="rounded-2xl border border-[#D3CCC7] bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="break-words text-sm font-semibold">{handover.student?.full_name || 'Student'}</h2>
                              <p className="mt-1 text-xs text-[#000000]">{session ? `${session.name} · Squad ${session.squad}` : 'Handover session'}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-[#EFEEE8] px-2.5 py-1 text-xs font-semibold capitalize">
                              {handover.status.replaceAll('_', ' ')}
                            </span>
                          </div>
                          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                            <div className="min-w-0">
                              <dt className="text-[11px] text-[#000000]">Phone</dt>
                              <dd className="break-words">{handover.phone_model || '—'}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-[11px] text-[#000000]">Updated</dt>
                              <dd className="text-xs">{new Date(handover.updated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
                            </div>
                            <div className="col-span-2 min-w-0">
                              <dt className="text-[11px] text-[#000000]">Reason</dt>
                              <dd className="break-words">{handover.reason || '—'}</dd>
                            </div>
                          </dl>
                        </article>
                      )
                    })}
                  </div>
                  <div className="hidden overflow-hidden rounded-2xl border border-[#D3CCC7] bg-white sm:block">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-[#EFEEE8] text-xs text-[#000000]">
                          <tr>
                            <th className="px-5 py-4 font-medium">Session</th>
                            <th className="px-5 py-4 font-medium">Student</th>
                            <th className="px-5 py-4 font-medium">Status</th>
                            <th className="px-5 py-4 font-medium">Phone</th>
                            <th className="px-5 py-4 font-medium">Reason</th>
                            <th className="px-5 py-4 font-medium">Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportHandovers.map((handover) => {
                            const session = sessions.find((item) => item.id === handover.session_id)
                            return (
                              <tr key={handover.id} className="border-t border-[#D3CCC7]">
                                <td className="px-5 py-4">
                                  <p className="font-medium">{session?.name || 'Handover session'}</p>
                                  {session && <p className="mt-1 text-xs text-[#000000]">Squad {session.squad}</p>}
                                </td>
                                <td className="px-5 py-4">{handover.student?.full_name || 'Student'}</td>
                                <td className="px-5 py-4 capitalize">{handover.status.replaceAll('_', ' ')}</td>
                                <td className="px-5 py-4">{handover.phone_model || '—'}</td>
                                <td className="px-5 py-4">{handover.reason || '—'}</td>
                                <td className="whitespace-nowrap px-5 py-4 text-[#000000]">
                                  {new Date(handover.updated_at).toLocaleString(undefined, { hour12: true })}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </>
                ) : (
                  <p className="rounded-lg border border-dashed border-[#D3CCC7] px-4 py-8 text-center text-sm text-[#000000]">No handovers to report yet.</p>
                )
              )}
            </section>
          ) : (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#000000]">Mentor workspace</p>
              <h1 className="text-3xl font-bold">Profile</h1>
              <div className="mt-6 max-w-2xl rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] p-5 sm:p-6">
                <div className="mb-6 border-b border-[#D3CCC7] pb-6">
                  <ProfilePhotoEditor
                    avatarUrl={profile?.avatar_url}
                    name={displayName}
                    onUploaded={(avatarUrl) => setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current)}
                  />
                </div>
                <p className="text-xs text-[#000000]">Name</p>
                <p className="mt-1.5 text-base font-semibold capitalize">{displayName}</p>
                <p className="mt-5 text-xs text-[#000000]">Email</p>
                <p className="mt-1.5 break-all text-base font-medium">{email}</p>
                <p className="mt-5 text-xs text-[#000000]">Role</p>
                <p className="mt-1.5 text-base font-medium">Mentor</p>
              </div>
            </section>
          )}
        </main>
        <nav aria-label="Mentor workspace" className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-[#262626] bg-[#000000]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.3)] backdrop-blur-md lg:hidden">
          <div className="grid h-[4.25rem] grid-cols-4 items-center gap-1 px-3">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-current={activeView === id ? 'page' : undefined}
                onClick={() => {
                  setActiveView(id)
                  if (id === 'reports') setReportSessionId(null)
                }}
                className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200 active:scale-95 ${activeView === id ? 'bg-[#EF0606] font-semibold text-[#000000]' : 'text-[#EFEEE8] hover:bg-[#202020]'}`}
              >
                <Icon size={19} strokeWidth={1.9} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}