'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  ChartNoAxesColumn,
  ChevronDown,
  ClipboardCheck,
  House,
  LogOut,
  Play,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { useAuth, LoadingSpinner } from '@/components/providers'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { getAccessToken } from '@/lib/supabase/auth-token'

type Session = { id: string; squad: string; name: string; status: string; started_at: string; mentor_id: string }
type Handover = { id: string; student_id: string; status: string; reason: string | null; updated_at: string; student?: { full_name: string } }
type View = 'overview' | 'sessions' | 'squads' | 'reports' | 'profile'

const squads = ['138', '139', '183']
const navigation: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: House },
  { id: 'sessions', label: 'Sessions', icon: ClipboardCheck },
  { id: 'squads', label: 'Squads', icon: UsersRound },
  { id: 'reports', label: 'Reports', icon: ChartNoAxesColumn },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

export default function MentorPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [handovers, setHandovers] = useState<Handover[]>([])
  const [profile, setProfile] = useState<{ role: string; squad: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSquad, setSelectedSquad] = useState('')
  const [starting, setStarting] = useState(false)
  const [activeView, setActiveView] = useState<View>('overview')
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
      setProfile(prof.profile ?? null)
      setSessions(sess.sessions ?? [])
      setHandovers(hand.handovers ?? [])
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
        if (response.status === 401) throw new Error('Your sign-in has expired. Please sign in again.')
        throw new Error(result.error || 'Unable to start session')
      }
      await loadData(false)
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start session')
    } finally {
      setStarting(false)
    }
  }

  async function endSession(sessionId: string) {
    setError('')
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
  const displayName = email.split('@')[0]?.replace(/[._-]/g, ' ') || 'Mentor'
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const activeTitle = navigation.find((item) => item.id === activeView)?.label ?? 'Overview'

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#202124]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-44 flex-col border-r border-[#e4e4e7] bg-white px-[18px] py-4 lg:flex">
        <a href="#overview" onClick={() => setActiveView('overview')} className="mb-7 flex items-center gap-2 px-0.5">
          <span className="grid size-[22px] place-items-center rounded-md bg-[#e53935] text-white">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h6m-6 0v7m0-7 4 4m-4-4 4-4m12 4h-6m6 0v-7m0 7-4-4m4 4-4 4" /></svg>
          </span>
          <span className="text-[15px] font-bold tracking-tight">phosub</span>
        </a>

        <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#a1a1aa]">Workspace</p>
        <nav aria-label="Mentor workspace" className="space-y-1">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              aria-current={activeView === id ? 'page' : undefined}
              className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] transition-colors ${activeView === id ? 'bg-[#fff1f0] font-semibold text-[#d52b27]' : 'text-[#77787d] hover:bg-[#f7f7f8] hover:text-[#242424]'}`}
            >
              <Icon size={13} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="rounded-lg bg-[#f6f6f7] px-2.5 py-2">
            <p className="text-[9px] font-semibold">Mentor workspace</p>
            <p className="mt-0.5 truncate text-[9px] text-[#999]">Connected workspace</p>
          </div>
          <button
            type="button"
            onClick={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))}
            className="mt-3 flex h-7 w-full items-center gap-2 px-2 text-[10px] text-[#77787d] hover:text-[#d52b27]"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-44">
        <header className="sticky top-0 z-20 flex h-[52px] items-center justify-between border-b border-[#e4e4e7] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-2 text-[10px] text-[#8b8b91]">
            <span className="lg:hidden font-bold text-[#202124]">phosub</span>
            <span className="hidden lg:inline">Mentor workspace</span>
            <span aria-hidden="true">/</span>
            <span className="text-[#333]">{activeTitle}</span>
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
                className="relative grid size-7 place-items-center text-[#77787d] hover:text-[#222]"
              >
                <Bell size={14} strokeWidth={1.7} />
                <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[#e53935]" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-9 z-40 w-52 rounded-lg border border-[#e4e4e7] bg-white p-3 text-xs shadow-lg">
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
                <span className="grid size-6 place-items-center rounded-full bg-[#f8dedd] text-[9px] font-bold text-[#d52b27]">{initials}</span>
                <span className="hidden sm:block">
                  <span className="block max-w-36 truncate text-[9px] font-semibold">{displayName}</span>
                  <span className="block text-[8px] text-[#999]">mentor</span>
                </span>
                <ChevronDown size={12} className="text-[#888]" />
              </button>
              {accountMenuOpen && (
                <div className="absolute right-0 top-9 z-40 w-48 rounded-lg border border-[#e4e4e7] bg-white p-2 shadow-lg">
                  <p className="truncate px-2 py-1 text-[10px] text-[#77787d]">{email}</p>
                  <button
                    type="button"
                    onClick={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))}
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[10px] hover:bg-[#f7f7f8]"
                  ><LogOut size={12} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <nav aria-label="Mentor workspace" className="sticky top-[52px] z-10 flex gap-1 overflow-x-auto border-b border-[#e4e4e7] bg-white px-3 py-2 lg:hidden">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              aria-current={activeView === id ? 'page' : undefined}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[10px] ${activeView === id ? 'bg-[#fff1f0] font-semibold text-[#d52b27]' : 'text-[#77787d] hover:bg-[#f7f7f8]'}`}
            >
              <Icon size={12} strokeWidth={1.8} />{label}
            </button>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-[900px] px-5 pb-12 pt-6 sm:px-8">
          {error && (
            <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-md border border-[#f0c9c7] bg-[#fff8f7] px-3 py-2.5 text-[11px] text-[#c62828]">
              <span>{error}</span>
              {error.toLowerCase().includes('sign in again') && (
                <button type="button" onClick={() => router.replace('/login')} className="shrink-0 font-semibold underline underline-offset-2">Sign in</button>
              )}
            </div>
          )}

          {!isMentor ? (
            <div className="rounded-lg border border-[#e4e4e7] bg-white p-6 text-sm text-[#666]">Your account is not registered as a mentor.</div>
          ) : activeView === 'overview' ? (
            <>
              <div className="mb-5">
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#e53935]">Mentor workspace</p>
                <h1 className="text-[21px] font-bold leading-tight tracking-tight">Phone handover sessions</h1>
                <p className="mt-1.5 text-[10px] text-[#77787d]">Start a session for one squad. Only students in that squad can submit phones.</p>
              </div>

              <section aria-labelledby="start-session-title" className="w-full max-w-[478px] rounded-lg border border-[#e4e4e7] bg-white px-4 py-4">
                <h2 id="start-session-title" className="text-[12px] font-bold">Start a session</h2>
                <p className="mt-1.5 text-[10px] text-[#77787d]">Choose the squad you are teaching today.</p>
                <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Choose squad">
                  {squads.map((squad) => (
                    <button
                      key={squad}
                      type="button"
                      aria-pressed={selectedSquad === squad}
                      onClick={() => {
                        setSelectedSquad(squad)
                        setError('')
                      }}
                      className={`h-9 rounded-md border px-3 text-[10px] transition-colors ${selectedSquad === squad ? 'border-[#e53935] bg-[#fff2f1] font-semibold text-[#c62828]' : 'border-[#e4e4e7] bg-white text-[#343434] hover:border-[#d4a19f] hover:bg-[#fffafa]'}`}
                    >Squad {squad}</button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={startSession}
                  disabled={!selectedSquad || starting}
                  className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-md bg-[#e53935] px-3 text-[10px] font-semibold text-white transition-colors hover:bg-[#c62828] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play size={11} /> {starting ? 'Starting...' : 'Start session'}
                </button>
              </section>
            </>
          ) : activeView === 'sessions' ? (
            <section>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#e53935]">Mentor workspace</p>
              <h1 className="text-[21px] font-bold">Sessions</h1>
              <p className="mb-5 mt-1.5 text-[10px] text-[#77787d]">Manage phone handover sessions for your squads.</p>
              <div className="overflow-hidden rounded-lg border border-[#e4e4e7] bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[10px]">
                    <thead className="bg-[#fafafa] text-[9px] text-[#77787d]"><tr><th className="px-4 py-3 font-medium">Session</th><th className="px-4 py-3 font-medium">Squad</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Started</th><th className="px-4 py-3 font-medium">Action</th></tr></thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id} className="border-t border-[#f0f0f1]">
                          <td className="px-4 py-3 font-semibold">{session.name || 'Phone Handover'}</td>
                          <td className="px-4 py-3">{session.squad}</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${session.status === 'active' ? 'bg-[#fff2f1] text-[#c62828]' : 'bg-[#f1f1f2] text-[#666]'}`}>{session.status}</span></td>
                          <td className="px-4 py-3 text-[#77787d]">{new Date(session.started_at).toLocaleString()}</td>
                          <td className="px-4 py-3">{session.status === 'active' && <button type="button" onClick={() => endSession(session.id)} className="font-medium text-[#d52b27] hover:underline">End session</button>}</td>
                        </tr>
                      ))}
                      {sessions.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[#77787d]">No sessions yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : activeView === 'squads' ? (
            <section>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#e53935]">Mentor workspace</p>
              <h1 className="text-[21px] font-bold">Squads</h1>
              <p className="mb-5 mt-1.5 text-[10px] text-[#77787d]">Choose a squad when starting a handover session.</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {squads.map((squad) => (
                  <button key={squad} type="button" onClick={() => { setSelectedSquad(squad); setActiveView('overview') }} className="rounded-lg border border-[#e4e4e7] bg-white p-4 text-left transition-colors hover:border-[#e7a5a2]">
                    <UsersRound size={15} className="mb-3 text-[#e53935]" />
                    <span className="block text-[12px] font-semibold">Squad {squad}</span>
                    <span className="mt-1 block text-[9px] text-[#888]">{sessions.filter((session) => session.squad === squad && session.status === 'active').length} active sessions</span>
                  </button>
                ))}
              </div>
            </section>
          ) : activeView === 'reports' ? (
            <section>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#e53935]">Mentor workspace</p>
              <h1 className="text-[21px] font-bold">Recent handovers</h1>
              <p className="mb-5 mt-1.5 text-[10px] text-[#77787d]">A record of recent student phone handovers.</p>
              <div className="overflow-hidden rounded-lg border border-[#e4e4e7] bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-[10px]">
                    <thead className="bg-[#fafafa] text-[9px] text-[#77787d]"><tr><th className="px-4 py-3 font-medium">Student</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Reason</th><th className="px-4 py-3 font-medium">Updated</th></tr></thead>
                    <tbody>
                      {handovers.slice(0, 10).map((handover) => (
                        <tr key={handover.id} className="border-t border-[#f0f0f1]"><td className="px-4 py-3 font-semibold">{handover.student?.full_name || 'Student'}</td><td className="px-4 py-3">{handover.status.replace('_', ' ')}</td><td className="px-4 py-3 text-[#77787d]">{handover.reason || '—'}</td><td className="px-4 py-3 text-[#77787d]">{new Date(handover.updated_at).toLocaleString()}</td></tr>
                      ))}
                      {handovers.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#77787d]">No handovers to report yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : (
            <section>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#e53935]">Mentor workspace</p>
              <h1 className="text-[21px] font-bold">Profile</h1>
              <div className="mt-5 max-w-lg rounded-lg border border-[#e4e4e7] bg-white p-4">
                <p className="text-[9px] text-[#888]">Name</p>
                <p className="mt-1 text-[12px] font-semibold capitalize">{displayName}</p>
                <p className="mt-4 text-[9px] text-[#888]">Email</p>
                <p className="mt-1 break-all text-[12px] font-medium">{email}</p>
                <p className="mt-4 text-[9px] text-[#888]">Role</p>
                <p className="mt-1 text-[12px] font-medium">Mentor</p>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}