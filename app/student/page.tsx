'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [profile, setProfile] = useState<{ role: string; squad: string | null } | null>(null)
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

  async function updateHandover(status: HandoverStatus, reasonText = '', phoneModelText = '') {
    if (!user) return
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

  const isStudent = profile?.role === 'student'
  const squad = profile?.squad ?? '-'

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <header className="border-b border-[#e7e7ea] bg-white px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#E53935] text-white">
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 0h6m-9 3V9m0 0l3 3m-3-3l3-3m9 3v-6m0 0l-3 3m3-3l-3-3"/></svg>
            </span>
            <span className="font-bold tracking-tight text-[21px]">phosub</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#666]">
            <span>Squad {squad}</span>
            <button
              onClick={() => createSupabaseClient().auth.signOut().then(() => router.push('/login'))}
              className="text-[#E53935] hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-8">
        <h1 className="mb-6 text-2xl font-bold">Student Dashboard</h1>
        {notice && (
          <div role="status" aria-live="polite" className="mb-6 rounded-lg border border-[#bbebca] bg-[#f2fbf5] p-4 text-sm text-[#166534]">
            {notice}
          </div>
        )}
        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-[#ffcdd2] bg-[#fff8f8] p-4 text-sm text-[#C62828]">
            {error}
          </div>
        )}
        {!isStudent && (
          <div className="rounded-lg border border-[#e7e7ea] bg-white p-6">
            <p className="text-[#666]">Your account is not registered as a student.</p>
          </div>
        )}
        {isStudent && (
          <>
            <div className="mb-8 rounded-xl border border-[#e7e7ea] bg-white p-6">
              <h2 className="mb-4 text-lg font-bold">Active Session</h2>
              {session ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-[#e7e7ea] bg-[#f7f7f8] p-4">
                    <p className="text-xs text-[#666]">Session</p>
                    <p className="font-semibold">{session.name || 'Phone handover'}</p>
                  </div>
                  <div className="rounded-lg border border-[#e7e7ea] bg-[#f7f7f8] p-4">
                    <p className="text-xs text-[#666]">Squad</p>
                    <p className="font-semibold">{session.squad}</p>
                  </div>
                  <div className="rounded-lg border border-[#e7e7ea] bg-[#f7f7f8] p-4">
                    <p className="text-xs text-[#666]">Status</p>
                    <p className="font-semibold text-[#E53935]">{session.status}</p>
                  </div>
                  <div className="rounded-lg border border-[#e7e7ea] bg-[#f7f7f8] p-4">
                    <p className="text-xs text-[#666]">Started</p>
                    <p className="font-medium">{new Date(session.started_at).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[#666]">No active session for your squad.</p>
              )}
            </div>
            <div className="mb-8 rounded-xl border border-[#e7e7ea] bg-white p-6">
              <h2 className="mb-4 text-lg font-bold">Your Phone Handover</h2>
              {handovers.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#e7e7ea] bg-[#f7f7f8]">
                    <span className="text-sm font-semibold">Status</span>
                    <span className="text-sm font-semibold">{handovers[0].status}</span>
                  </div>
                  {handovers[0].reason && (
                    <div className="px-4 py-3 rounded-lg border border-[#e7e7ea] bg-[#f7f7f8]">
                      <p className="text-sm text-[#666]">{handovers[0].reason}</p>
                    </div>
                  )}
                  {handovers[0].phone_model && (
                    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-[#e7e7ea] bg-[#f7f7f8]">
                      <span className="text-sm font-semibold">Phone model</span>
                      <span className="text-right text-sm">{handovers[0].phone_model}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[#666]">No handover submitted yet.</p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setReasonStatus('submitted')
                    setPhoneModel('')
                    setError('')
                    setNotice('')
                  }}
                  disabled={!session || Boolean(updatingStatus)}
                  className="min-h-11 px-4 py-2 rounded-lg bg-[#15803D] text-white font-semibold disabled:opacity-50 hover:bg-[#15803D]/90 transition-colors"
                >
                  Mark Submitted
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReasonStatus('not_submitted')
                    setReason('')
                    setError('')
                    setNotice('')
                  }}
                  disabled={!session || Boolean(updatingStatus)}
                  className="min-h-11 px-4 py-2 rounded-lg bg-[#B91C1C] text-white font-semibold disabled:opacity-50 hover:bg-[#B91C1C]/90 transition-colors"
                >
                  Mark Not Submitted
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReasonStatus('retrieved')
                    setReason('')
                    setError('')
                    setNotice('')
                  }}
                  disabled={!session || Boolean(updatingStatus)}
                  className="min-h-11 px-4 py-2 rounded-lg bg-[#2563EB] text-white font-semibold disabled:opacity-50 hover:bg-[#2563EB]/90 transition-colors"
                >
                  Mark Retrieved
                </button>
              </div>
              {reasonStatus && (
                <form
                  className="mt-5 max-w-xl rounded-lg border border-[#e7e7ea] bg-[#fafafa] p-4"
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
                        className="mt-2 block min-h-11 w-full rounded-lg border border-[#e7e7ea] bg-white px-3 py-2 text-sm focus:border-[#E53935] focus:ring-1 focus:ring-[#E53935] disabled:bg-[#f1f1f2]"
                      />
                      <p className="mt-1 text-right text-xs text-[#77787d]">{phoneModel.length}/100</p>
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
                        className="mt-2 block w-full rounded-lg border border-[#e7e7ea] bg-white px-3 py-2 text-sm focus:border-[#E53935] focus:ring-1 focus:ring-[#E53935] disabled:bg-[#f1f1f2]"
                      />
                      <p className="mt-1 text-right text-xs text-[#77787d]">{reason.length}/500</p>
                    </>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={Boolean(updatingStatus) || (reasonStatus === 'submitted' ? !phoneModel.trim() : !reason.trim())}
                      className="min-h-11 rounded-lg bg-[#E53935] px-4 text-sm font-semibold text-white hover:bg-[#C62828] disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="min-h-11 rounded-lg border border-[#e7e7ea] px-4 text-sm font-semibold hover:bg-white disabled:opacity-50"
                    >Cancel</button>
                  </div>
                </form>
              )}
            </div>
            <div className="rounded-xl border border-[#e7e7ea] bg-white p-6">
              <h2 className="mb-4 text-lg font-bold">History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fafafa] text-xs text-[#666]">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Phone model</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handovers.map((h) => (
                      <tr key={h.id} className="border-t border-[#f0f0f1]">
                        <td className="px-4 py-3 font-semibold">{h.status}</td>
                        <td className="px-4 py-3">{h.phone_model || '—'}</td>
                        <td className="px-4 py-3 text-[#666]">{h.reason || '—'}</td>
                        <td className="px-4 py-3 text-[#666]">{new Date(h.updated_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}