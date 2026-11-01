'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, CalendarDays, Check, Clock3, RotateCcw, Smartphone, UsersRound, X } from 'lucide-react'
import { useAuth, LoadingSpinner } from '@/components/providers'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { getAccessToken } from '@/lib/supabase/auth-token'

type Session = { id: string; squad: string; name: string; status: string; started_at: string }
type Handover = { id: string; status: string; reason: string | null; phone_model: string | null; updated_at: string }
type HandoverStatus = 'submitted' | 'not_submitted' | 'retrieved'

export default function StudentPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [session, setSession] = useState<Session | null>(null)
  const [handovers, setHandovers] = useState<Handover[]>([])
  const [profile, setProfile] = useState<{ role: string; squad: string | null; full_name?: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState<HandoverStatus | ''>('')
  const [reasonStatus, setReasonStatus] = useState<HandoverStatus | null>(null)
  const [reason, setReason] = useState('')
  const [phoneModel, setPhoneModel] = useState('')

  useEffect(() => {
    if (authLoading || !user) return
    loadData()
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
      if (!profRes.ok) throw new Error(prof.error || 'Unable to load profile')
      if (!sessRes.ok) throw new Error(sess.error || 'Unable to load sessions')
      if (!handRes.ok) throw new Error(hand.error || 'Unable to load handovers')
      setProfile(prof.profile ?? null)
      setSession(sess.sessions?.[0] ?? null)
      setHandovers(hand.handovers ?? [])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load data')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const hasActiveSession = Boolean(session && session.status === 'active')

  async function updateHandover(status: HandoverStatus, reasonText = '', phoneModelText = '') {
    if (!user || !hasActiveSession) return
    const trimmedReason = reasonText.trim()
    const trimmedPhoneModel = phoneModelText.trim()
    if (status !== 'submitted' && !trimmedReason) {
      setError('Please enter a reason before updating your status.')
      return
    }
    if (status === 'submitted' && !trimmedPhoneModel) {
      setError('Enter your phone model before marking it submitted.')
      return
    }
    setError('')
    setNotice('')
    setUpdatingStatus(status)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Your sign-in has expired. Please sign in again.')
      const res = await fetch('/api/handovers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status, reason: trimmedReason, phoneModel: trimmedPhoneModel }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Failed to update handover')
      await loadData(false)
      setReasonStatus(null)
      setReason('')
      setPhoneModel('')
      setNotice('Your handover status was updated.')
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update handover')
    } finally {
      setUpdatingStatus('')
    }
  }

  if (authLoading || loading) return <LoadingSpinner />

  if (!user) {
    return (
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
    )
  }

  const isStudent = profile?.role === 'student'
  const squad = profile?.squad ?? '-'

  return (
    <>
      {notice && (
        <div role="status" aria-live="polite" className="mb-6 rounded-lg border border-[#D3CCC7] bg-[#D3CCC7] p-4 text-sm text-[#000000]">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] p-4 text-sm text-[#000000]">
          {error}
        </div>
      )}
      {!isStudent && (
        <div className="rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] p-6">
          <p className="text-[#000000]">Your account is not registered as a student.</p>
        </div>
      )}
      {isStudent && (
        <>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#000000]">Student workspace · Squad {squad}</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight">Phone handover</h1>
            <p className="mt-1 text-sm text-[#000000]">Your session and phone status at a glance.</p>
          </div>
          <section aria-labelledby="active-session-title" className="mb-5 rounded-3xl border border-[#D3CCC7] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#000000]">Session overview</p>
                <h2 id="active-session-title" className="mt-1 text-base font-bold">Active session</h2>
              </div>
              {session && hasActiveSession && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EF0606]/10 px-2.5 py-1 text-xs font-semibold text-[#000000]">
                  <span className="size-1.5 rounded-full bg-[#EF0606]" /> Live
                </span>
              )}
            </div>
            {session && hasActiveSession ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: 'Session', value: session.name || 'Phone handover', icon: Smartphone },
                  { label: 'Squad', value: session.squad, icon: UsersRound },
                  { label: 'Status', value: 'Active', icon: Activity },
                  { label: 'Started', value: new Date(session.started_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }), icon: Clock3 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="min-w-0 rounded-2xl border border-[#D3CCC7] bg-[#EFEEE8] p-3">
                    <span className="mb-3 grid size-8 place-items-center rounded-xl bg-[#EF0606]/10 text-[#EF0606]">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <p className="text-[11px] font-medium text-[#000000]">{label}</p>
                    <p className="mt-1 truncate text-sm font-bold">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D3CCC7] bg-[#EFEEE8] p-5 text-center">
                <p className="font-semibold text-[#000000]">No active session for your squad.</p>
                <p className="mt-1 text-sm text-[#000000]">Status updates are disabled until a mentor starts a session.</p>
              </div>
            )}
          </section>
          <section aria-labelledby="handover-title" className="mb-5 rounded-3xl border border-[#D3CCC7] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#000000]">Your device</p>
                <h2 id="handover-title" className="mt-1 text-base font-bold">Phone handover</h2>
              </div>
              {handovers[0] && (
                <span className="max-w-[45%] truncate rounded-full bg-[#EFEEE8] px-3 py-1 text-xs font-semibold capitalize">
                  {handovers[0].status.replaceAll('_', ' ')}
                </span>
              )}
            </div>
            {handovers.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#EFEEE8] p-3">
                  <p className="text-[11px] font-medium text-[#000000]">Phone model</p>
                  <p className="mt-1 break-words text-sm font-semibold">{handovers[0].phone_model || 'Not entered'}</p>
                </div>
                <div className="rounded-2xl bg-[#EFEEE8] p-3">
                  <p className="text-[11px] font-medium text-[#000000]">Last updated</p>
                  <p className="mt-1 text-sm font-semibold">{new Date(handovers[0].updated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                {handovers[0].reason && (
                  <div className="col-span-2 rounded-2xl bg-[#EFEEE8] p-3">
                    <p className="text-[11px] font-medium text-[#000000]">Reason</p>
                    <p className="mt-1 break-words text-sm">{handovers[0].reason}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-2xl bg-[#EFEEE8] p-3 text-sm text-[#000000]">No handover status recorded yet.</p>
            )}
            <div className="mt-4 grid gap-2.5">
              {[
                { status: 'submitted' as const, title: 'Mark submitted', detail: 'Phone model required', icon: Check, primary: true },
                { status: 'not_submitted' as const, title: 'Not submitted', detail: 'Add a reason for your status', icon: X, primary: false },
                { status: 'retrieved' as const, title: 'Phone retrieved', detail: 'Update the handover record', icon: RotateCcw, primary: false },
              ].map(({ status, title, detail, icon: Icon, primary }) => (
                <div key={status} className="flex items-center justify-between gap-3 rounded-2xl border border-[#D3CCC7] bg-white p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${primary ? 'bg-[#EF0606]/10 text-[#EF0606]' : 'bg-[#EFEEE8] text-[#000000]'}`}>
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{title}</span>
                      <span className="block truncate text-xs text-[#000000]">{detail}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`${title} status`}
                    onClick={() => {
                      setReasonStatus(status)
                      if (status === 'submitted') setPhoneModel('')
                      else setReason('')
                      setError('')
                      setNotice('')
                    }}
                    disabled={!hasActiveSession || Boolean(updatingStatus)}
                    className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-semibold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${primary ? 'bg-[#EF0606] text-[#000000]' : 'border border-[#D3CCC7] bg-[#EFEEE8] text-[#000000]'}`}
                  >
                    Update
                  </button>
                </div>
              ))}
            </div>
            {reasonStatus && (
              <form
                className="mt-4 rounded-2xl border border-[#D3CCC7] bg-[#EFEEE8] p-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void updateHandover(reasonStatus, reason, phoneModel)
                }}
              >
                {reasonStatus === 'submitted' ? (
                  <>
                    <label htmlFor="phone-model" className="block text-sm font-semibold">Phone model</label>
                    <input
                      id="phone-model"
                      type="text"
                      required
                      maxLength={100}
                      autoComplete="off"
                      placeholder="For example, Samsung Galaxy A55"
                      value={phoneModel}
                      onChange={(event) => setPhoneModel(event.target.value)}
                      disabled={Boolean(updatingStatus)}
                      className="mt-2 block min-h-11 w-full rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] px-3 py-2 text-sm focus:border-[#EF0606] focus:ring-1 focus:ring-[#EF0606] disabled:bg-[#D3CCC7]"
                    />
                    <p className="mt-1 text-right text-xs text-[#000000]">{phoneModel.length}/100</p>
                  </>
                ) : (
                  <>
                    <label htmlFor="handover-reason" className="block text-sm font-semibold">
                      Reason for {reasonStatus === 'retrieved' ? 'retrieving the phone' : 'not submitting'}
                    </label>
                    <textarea
                      id="handover-reason"
                      required
                      maxLength={500}
                      rows={3}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      disabled={Boolean(updatingStatus)}
                      className="mt-2 block w-full rounded-lg border border-[#D3CCC7] bg-[#EFEEE8] px-3 py-2 text-sm focus:border-[#EF0606] focus:ring-1 focus:ring-[#EF0606] disabled:bg-[#D3CCC7]"
                    />
                    <p className="mt-1 text-right text-xs text-[#000000]">{reason.length}/500</p>
                  </>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={Boolean(updatingStatus) || (reasonStatus === 'submitted' ? !phoneModel.trim() : !reason.trim())}
                    className="min-h-11 rounded-lg bg-[#EF0606] px-4 text-sm font-semibold text-[#000000] hover:bg-[#EF0606] disabled:cursor-not-allowed"
                  >
                    {updatingStatus === reasonStatus ? 'Saving...' : reasonStatus === 'submitted' ? 'Confirm submission' : 'Save status'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(updatingStatus)}
                    onClick={() => {
                      setReasonStatus(null)
                      setReason('')
                      setPhoneModel('')
                      setError('')
                    }}
                    className="min-h-11 rounded-lg border border-[#D3CCC7] px-4 text-sm font-semibold hover:bg-[#EFEEE8] "
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
          <section className="rounded-3xl border border-[#D3CCC7] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Recent Activity</h2>
              <Link href="/student/history" className="text-sm font-semibold text-[#000000] hover:underline">
                View full history
              </Link>
            </div>
            {handovers.length === 0 ? (
              <p className="text-[#000000]">No handover activity yet.</p>
            ) : (
              <>
              <ul className="divide-y divide-[#D3CCC7] sm:hidden">
                {handovers.slice(0, 5).map((handover) => (
                  <li key={handover.id} className="py-3 first:pt-1 last:pb-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold capitalize">{handover.status.replaceAll('_', ' ')}</span>
                      <time className="shrink-0 text-right text-xs text-[#000000]">
                        {new Date(handover.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </time>
                    </div>
                    {handover.phone_model && <p className="mt-1 text-sm">{handover.phone_model}</p>}
                    {handover.reason && <p className="mt-1 break-words text-sm text-[#000000]">{handover.reason}</p>}
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto sm:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#EFEEE8] text-xs text-[#000000]">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Phone model</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handovers.slice(0, 5).map((h) => (
                      <tr key={h.id} className="border-t border-[#D3CCC7]">
                        <td className="px-4 py-3 font-semibold">{h.status}</td>
                        <td className="px-4 py-3">{h.phone_model || '—'}</td>
                        <td className="px-4 py-3 text-[#000000]">{h.reason || '—'}</td>
                        <td className="px-4 py-3 text-[#000000]">{new Date(h.updated_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
              </>
            )}
          </section>
        </>
      )}
    </>
  )
}
