'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  ChartNoAxesColumn,
  ChevronDown,
  ClipboardCheck,
  LogOut,
  Play,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { useAuth, LoadingSpinner } from '@/components/providers'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { getAccessToken } from '@/lib/supabase/auth-token'
import { ProfileAvatar, ProfilePhotoEditor } from '@/components/profile-photo'

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
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f8] p-6">
        <div className="max-w-md rounded-xl border border-[#ffcdd2] bg-[#fff8f8] p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-[#C62828]">Not signed in</h2>
          <p className="mb-4 text-sm text-[#666]">Please sign in to access your dashboard.</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2 rounded-lg bg-[#E53935] text-white font-semibold hover:bg-[#C62828] transition-colors"
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
  const reportSession = sessions.find((session) => session.id === reportSessionId)
  const reportHandovers = reportSessionId
    ? handovers.filter((handover) => handover.session_id === reportSessionId)
    : handovers.slice(0, 10)

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#202124]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-[#e4e4e7] bg-white px-5 py-5 lg:flex">
        <a href="#sessions" onClick={() => setActiveView('sessions')} className="mb-9 flex items-center gap-2.5 px-0.5">
          <span className="grid size-7 place-items-center rounded-md bg-[#e53935] text-white">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h6m-6 0v7m0-7 4 4m-4-4 4-4m12 4h-6m6 0v-7m0 7-4-4m4 4-4 4" /></svg>
          </span>
          <span className="text-lg font-bold tracking-tight">phosub</span>
        </a>

        <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.16em] text-[#92929b]">Workspace</p>
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
              className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${activeView === id ? 'bg-[#fff1f0] font-semibold text-[#d52b27]' : 'text-[#77787d] hover:bg-[#f7f7f8] hover:text-[#242424]'}`}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="rounded-lg bg-[#f6f6f7] px-3 py-3">
            <p className="text-xs font-semibold">Mentor workspace</p>
            <p className="mt-1 truncate text-xs text-[#77787d]">Connected workspace</p>
          </div>
          <button
            type="button"
            onClick={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))}
            className="mt-4 flex h-10 w-full items-center gap-2 px-3 text-sm text-[#77787d] hover:text-[#d52b27]"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#e4e4e7] bg-white px-4 sm:px-6 lg:h-16">
          <div className="flex items-center gap-2 text-sm text-[#77787d]">
            <span className="font-bold text-[#202124] lg:hidden">phosub</span>
            <span className="hidden lg:inline">Mentor workspace</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-[#333]">{activeTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen)
                  setAccountMenuOpen(false)
                }}
                className="relative grid size-10 place-items-center rounded-lg text-[#77787d] hover:bg-[#f7f7f8] hover:text-[#222]"
              >
                <Bell size={18} strokeWidth={1.7} />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-[#e53935]" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-11 z-40 w-64 rounded-lg border border-[#e4e4e7] bg-white p-4 text-sm shadow-lg">
                  <p className="font-semibold">Notifications</p>
                  <p className="mt-1 text-[#77787d]">You’re all caught up.</p>
                </div>
              )}
            </div>
            <div className="relative border-l border-[#e4e4e7] pl-3">
              <button
                type="button"
                aria-expanded={accountMenuOpen}
                onClick={() => {
                  setAccountMenuOpen(!accountMenuOpen)
                  setNotificationsOpen(false)
                }}
                className="flex items-center gap-2 text-left"
              >
                <ProfileAvatar avatarUrl={profile?.avatar_url} name={displayName} />
                <span className="hidden sm:block">
                  <span className="block max-w-40 truncate text-xs font-semibold">{displayName}</span>
                  <span className="block text-[11px] text-[#77787d]">mentor</span>
                </span>
                <ChevronDown size={15} className="text-[#888]" />
              </button>
              {accountMenuOpen && (
                <div className="absolute right-0 top-11 z-40 w-64 rounded-lg border border-[#e4e4e7] bg-white p-3 shadow-lg">
                  <p className="truncate px-2 py-1 text-xs text-[#77787d]">{email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('profile')
                      setAccountMenuOpen(false)
                    }}
                    className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-[#f7f7f8]"
                  ><UserRound size={16} /> My Profile</button>
                  <button
                    type="button"
                    onClick={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))}
                    className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-[#f7f7f8]"
                  ><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pt-8 lg:px-10 lg:pb-12">
          {notice && (
            <div role="status" aria-live="polite" className="mb-5 rounded-lg border border-[#bbebca] bg-[#f2fbf5] px-4 py-3 text-sm text-[#166534]">
              {notice}
            </div>
          )}
          {error && (
            <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-[#f0c9c7] bg-[#fff8f7] px-4 py-3 text-sm text-[#c62828]">
              <span>{error}</span>
              {error.toLowerCase().includes('sign in again') && (
                <button type="button" onClick={() => router.replace('/login')} className="shrink-0 font-semibold underline underline-offset-2">Sign in</button>
              )}
            </div>
          )}

          {!isMentor ? (
            <div className="rounded-lg border border-[#e4e4e7] bg-white p-6 text-base text-[#666]">Your account is not registered as a mentor.</div>
          ) : activeView === 'sessions' ? (
            <>
              <div className="mb-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e53935]">Mentor workspace</p>
                <h1 className="text-3xl font-bold leading-tight tracking-tight">Phone handover sessions</h1>
                <p className="mt-2 text-sm text-[#77787d]">Start a session for one squad. Only students in that squad can submit phones.</p>
              </div>

              <section aria-labelledby="start-session-title" className="w-full max-w-2xl rounded-lg border border-[#e4e4e7] bg-white p-5 sm:p-6">
                <h2 id="start-session-title" className="text-lg font-bold">Start a session</h2>
                <p className="mt-1.5 text-sm text-[#77787d]">Choose the squad you are teaching today.</p>
                <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Choose squad">
                  {squads.map((squad) => (
                    <button
                      key={squad}
                      type="button"
                      aria-pressed={selectedSquad === squad}
                      onClick={() => {
                        setSelectedSquad(squad)
                        setError('')
                      }}
                      className={`min-h-11 rounded-md border px-4 text-sm transition-colors ${selectedSquad === squad ? 'border-[#e53935] bg-[#fff2f1] font-semibold text-[#c62828]' : 'border-[#e4e4e7] bg-white text-[#343434] hover:border-[#d4a19f] hover:bg-[#fffafa]'}`}
                    >Squad {squad}</button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={startSession}
                  disabled={!selectedSquad || starting}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#e53935] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c62828] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play size={16} /> {starting ? 'Starting...' : 'Start session'}
                </button>
              </section>
              <section className="mt-10">
                <h2 className="mb-1.5 text-xl font-bold">Sessions</h2>
                <p className="mb-5 text-sm text-[#77787d]">Manage phone handover sessions for your squads.</p>
                <div className="space-y-3 lg:hidden">
                  {sessions.map((session) => (
                    <article key={session.id} className="rounded-lg border border-[#e4e4e7] bg-white p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold">Squad {session.squad}</h3>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${session.status === 'active' ? 'bg-[#fff2f1] text-[#c62828]' : 'bg-[#f1f1f2] text-[#666]'}`}>{session.status}</span>
                      </div>
                      <p className="mt-3 text-xs text-[#77787d]">Started {new Date(session.started_at).toLocaleString()}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {session.mentor_id === user.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setReportSessionId(session.id)
                              setActiveView('reports')
                            }}
                            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#e4e4e7] px-4 text-sm font-medium text-[#444] hover:bg-[#f7f7f8]"
                          >View report</button>
                        )}
                        {session.status === 'active' && session.mentor_id === user.id && (
                          <button
                            type="button"
                            onClick={() => endSession(session.id)}
                            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#f0c9c7] px-4 text-sm font-medium text-[#c62828] hover:bg-[#fff8f7]"
                          >End session</button>
                        )}
                        {session.status === 'active' && session.mentor_id !== user.id && (
                          <p className="self-center text-sm text-[#77787d]">Managed by another mentor</p>
                        )}
                      </div>
                    </article>
                  ))}
                  {sessions.length === 0 && <p className="rounded-lg border border-dashed border-[#d8d8dc] px-4 py-8 text-center text-sm text-[#77787d]">No sessions yet.</p>}
                </div>
                <div className="hidden overflow-hidden rounded-lg border border-[#e4e4e7] bg-white lg:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-[#fafafa] text-xs text-[#77787d]"><tr><th className="px-5 py-4 font-medium">Squad</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4 font-medium">Started</th><th className="px-5 py-4 font-medium">Report</th><th className="px-5 py-4 font-medium">Session action</th></tr></thead>
                      <tbody>
                        {sessions.map((session) => (
                          <tr key={session.id} className="border-t border-[#f0f0f1]">
                            <td className="px-5 py-4 font-semibold">Squad {session.squad}</td>
                            <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${session.status === 'active' ? 'bg-[#fff2f1] text-[#c62828]' : 'bg-[#f1f1f2] text-[#666]'}`}>{session.status}</span></td>
                            <td className="px-5 py-4 text-[#77787d]">{new Date(session.started_at).toLocaleString()}</td>
                            <td className="whitespace-nowrap px-5 py-4">
                              {session.mentor_id === user.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReportSessionId(session.id)
                                    setActiveView('reports')
                                  }}
                                  className="inline-flex min-h-10 min-w-28 justify-center font-medium text-[#555] hover:underline"
                                >View report</button>
                              ) : <span className="text-[#aaa]">—</span>}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4">
                              {session.status === 'active' && session.mentor_id === user.id ? (
                                <button
                                  type="button"
                                  aria-label={`End session for Squad ${session.squad}`}
                                  onClick={() => endSession(session.id)}
                                  className="inline-flex min-h-10 items-center font-medium text-[#d52b27] hover:underline"
                                >End Squad {session.squad}</button>
                              ) : session.status === 'active' ? (
                                <span className="text-[#77787d]">Managed by another mentor</span>
                              ) : <span className="text-[#aaa]">—</span>}
                            </td>
                          </tr>
                        ))}
                        {sessions.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#77787d]">No sessions yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </>
          ) : activeView === 'squads' ? (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e53935]">Mentor workspace</p>
              <h1 className="text-3xl font-bold">Squads</h1>
              <p className="mb-6 mt-2 text-sm text-[#77787d]">Choose a squad when starting a handover session.</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {squads.map((squad) => (
                  <button key={squad} type="button" onClick={() => { setSelectedSquad(squad); setActiveView('sessions') }} className="min-h-32 rounded-lg border border-[#e4e4e7] bg-white p-5 text-left transition-colors hover:border-[#e7a5a2]">
                    <UsersRound size={20} className="mb-4 text-[#e53935]" />
                    <span className="block text-base font-semibold">Squad {squad}</span>
                    <span className="mt-1.5 block text-sm text-[#77787d]">{sessions.filter((session) => session.squad === squad && session.status === 'active').length} active sessions</span>
                    <span className="mt-1 block text-sm text-[#77787d]">{students.filter((student) => student.squad === squad).length} registered accounts</span>
                  </button>
                ))}
              </div>
              <section className="mt-10" aria-labelledby="student-accounts-title">
                <h2 id="student-accounts-title" className="text-xl font-bold">Registered student accounts</h2>
                <p className="mb-5 mt-1.5 text-sm text-[#77787d]">Students who have completed profile setup in Phosub.</p>
                <div className="grid gap-4 xl:grid-cols-3">
                  {squads.map((squad) => {
                    const squadStudents = students.filter((student) => student.squad === squad)
                    return (
                      <section key={squad} className="rounded-lg border border-[#e4e4e7] bg-white p-4 sm:p-5" aria-label={`Registered students in Squad ${squad}`}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold">Squad {squad}</h3>
                          <span className="rounded-full bg-[#f1f1f2] px-2.5 py-1 text-xs font-semibold text-[#555]">{squadStudents.length}</span>
                        </div>
                        {squadStudents.length ? (
                          <ul className="divide-y divide-[#f0f0f1]">
                            {squadStudents.map((student) => (
                              <li key={student.id} className="py-3 first:pt-1 last:pb-1">
                                <p className="text-sm font-medium">{student.full_name}</p>
                                <time dateTime={student.created_at} className="mt-1 block text-xs text-[#77787d]">
                                  Account created {new Date(student.created_at).toLocaleDateString()}
                                </time>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="py-3 text-sm text-[#77787d]">No student profiles yet.</p>
                        )}
                      </section>
                    )
                  })}
                </div>
              </section>
            </section>
          ) : activeView === 'reports' ? (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e53935]">Mentor workspace</p>
              <h1 className="text-3xl font-bold">{reportSession ? `${reportSession.name} report` : 'Recent handovers'}</h1>
              <p className="mb-6 mt-2 text-sm text-[#77787d]">
                {reportSession ? `Squad ${reportSession.squad} handover statuses for this session.` : 'A record of recent student phone handovers.'}
              </p>
              <div className="space-y-3 lg:hidden">
                {reportHandovers.map((handover) => (
                  <article key={handover.id} className="rounded-lg border border-[#e4e4e7] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-semibold">{handover.student?.full_name || 'Student'}</h2>
                      <span className="shrink-0 rounded-full bg-[#f1f1f2] px-2.5 py-1 text-xs font-semibold capitalize text-[#444]">{handover.status.replace('_', ' ')}</span>
                    </div>
                    <p className="mt-3 text-sm text-[#77787d]">{handover.reason || 'No reason provided'}</p>
                    <p className="mt-2 text-xs text-[#888]">Updated {new Date(handover.updated_at).toLocaleString()}</p>
                  </article>
                ))}
                {reportHandovers.length === 0 && <p className="rounded-lg border border-dashed border-[#d8d8dc] px-4 py-8 text-center text-sm text-[#77787d]">{reportSession ? 'No handovers recorded for this session yet.' : 'No handovers to report yet.'}</p>}
              </div>
              <div className="hidden overflow-hidden rounded-lg border border-[#e4e4e7] bg-white lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-[#fafafa] text-xs text-[#77787d]"><tr><th className="px-5 py-4 font-medium">Student</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4 font-medium">Reason</th><th className="px-5 py-4 font-medium">Updated</th></tr></thead>
                    <tbody>
                      {reportHandovers.map((handover) => (
                        <tr key={handover.id} className="border-t border-[#f0f0f1]"><td className="px-5 py-4 font-semibold">{handover.student?.full_name || 'Student'}</td><td className="px-5 py-4 capitalize">{handover.status.replace('_', ' ')}</td><td className="px-5 py-4 text-[#77787d]">{handover.reason || '—'}</td><td className="px-5 py-4 text-[#77787d]">{new Date(handover.updated_at).toLocaleString()}</td></tr>
                      ))}
                      {reportHandovers.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-[#77787d]">{reportSession ? 'No handovers recorded for this session yet.' : 'No handovers to report yet.'}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : (
            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#e53935]">Mentor workspace</p>
              <h1 className="text-3xl font-bold">Profile</h1>
              <div className="mt-6 max-w-2xl rounded-lg border border-[#e4e4e7] bg-white p-5 sm:p-6">
                <div className="mb-6 border-b border-[#e4e4e7] pb-6">
                  <ProfilePhotoEditor
                    avatarUrl={profile?.avatar_url}
                    name={displayName}
                    onUploaded={(avatarUrl) => setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current)}
                  />
                </div>
                <p className="text-xs text-[#77787d]">Name</p>
                <p className="mt-1.5 text-base font-semibold capitalize">{displayName}</p>
                <p className="mt-5 text-xs text-[#77787d]">Email</p>
                <p className="mt-1.5 break-all text-base font-medium">{email}</p>
                <p className="mt-5 text-xs text-[#77787d]">Role</p>
                <p className="mt-1.5 text-base font-medium">Mentor</p>
              </div>
            </section>
          )}
        </main>
        <nav aria-label="Mentor workspace" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e4e4e7] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(20,20,20,0.06)] backdrop-blur lg:hidden">
          <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center gap-2 px-4">
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
                className={`mx-auto grid size-12 place-items-center rounded-xl transition-colors ${activeView === id ? 'bg-[#fff1f0] text-[#d52b27]' : 'text-[#77787d] hover:bg-[#f7f7f8]'}`}
              >
                <Icon size={21} strokeWidth={1.9} />
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}