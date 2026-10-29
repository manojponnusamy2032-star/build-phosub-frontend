'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useAuth, LoadingSpinner } from '@/components/providers'
import { getAccessToken } from '@/lib/supabase/auth-token'

type SessionInfo = { id: string; squad: string; name: string; status: string; started_at: string; ended_at: string | null }
type Handover = {
  id: string
  status: string
  reason: string | null
  phone_model: string | null
  updated_at: string
  sessions?: SessionInfo | SessionInfo[] | null
}
type HandoverEvent = {
  id: string
  handover_id: string
  session_id: string
  status: string
  reason: string | null
  changed_at: string
}

function sessionOf(handover: Handover): SessionInfo | null {
  if (!handover.sessions) return null
  return Array.isArray(handover.sessions) ? handover.sessions[0] ?? null : handover.sessions
}

export default function StudentHistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const [handovers, setHandovers] = useState<Handover[]>([])
  const [events, setEvents] = useState<HandoverEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const token = await getAccessToken()
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch('/api/handovers?history=1', { credentials: 'include', headers })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to load history')
      setHandovers(data.handovers ?? [])
      setEvents(data.events ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading || !user) return
    void loadData()
  }, [user, authLoading])

  const filteredHandovers = useMemo(() => {
    return handovers.filter((handover) => {
      if (statusFilter !== 'all' && handover.status !== statusFilter) return false
      const session = sessionOf(handover)
      const dateValue = session?.started_at ?? handover.updated_at
      const date = new Date(dateValue)
      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00`)
        if (date < from) return false
      }
      if (toDate) {
        const to = new Date(`${toDate}T23:59:59`)
        if (date > to) return false
      }
      return true
    })
  }, [handovers, statusFilter, fromDate, toDate])

  if (authLoading || loading) return <LoadingSpinner />

  if (!user) {
    return <p className="text-[#666]">Please sign in to view your history.</p>
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My History</h1>
        <p className="mt-1 text-sm text-[#666]">Your previous phone handover sessions and status records.</p>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-[#ffcdd2] bg-[#fff8f8] p-4 text-sm text-[#C62828]">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-2 text-sm font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mb-6 rounded-xl border border-[#e7e7ea] bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-11 rounded-lg border border-[#e7e7ea] bg-white px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="not_submitted">Not submitted</option>
              <option value="retrieved">Retrieved</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="min-h-11 rounded-lg border border-[#e7e7ea] bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="min-h-11 rounded-lg border border-[#e7e7ea] bg-white px-3 py-2 text-sm"
            />
          </label>
          {(statusFilter !== 'all' || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all')
                setFromDate('')
                setToDate('')
              }}
              className="min-h-11 rounded-lg border border-[#e7e7ea] px-3 text-sm font-semibold hover:bg-[#f7f7f8]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-[#e7e7ea] bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">Sessions &amp; Handovers</h2>
        {filteredHandovers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d8d8dc] bg-[#fafafa] p-6 text-center">
            <p className="font-semibold text-[#333]">No handover records found.</p>
            <p className="mt-1 text-sm text-[#666]">Records appear here after you participate in a session.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fafafa] text-xs text-[#666]">
                <tr>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Session status</th>
                  <th className="px-4 py-3">Your status</th>
                  <th className="px-4 py-3">Phone model</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Session started</th>
                  <th className="px-4 py-3">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredHandovers.map((handover) => {
                  const session = sessionOf(handover)
                  return (
                    <tr key={handover.id} className="border-t border-[#f0f0f1]">
                      <td className="px-4 py-3 font-semibold">{session?.name || 'Phone handover'}</td>
                      <td className="px-4 py-3 capitalize">{session?.status || '—'}</td>
                      <td className="px-4 py-3 font-semibold">{handover.status}</td>
                      <td className="px-4 py-3">{handover.phone_model || '—'}</td>
                      <td className="px-4 py-3 text-[#666]">{handover.reason || '—'}</td>
                      <td className="px-4 py-3 text-[#666]">{session?.started_at ? new Date(session.started_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-[#666]">{new Date(handover.updated_at).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#e7e7ea] bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">Status Change History</h2>
        {events.length === 0 ? (
          <p className="text-[#666]">No recorded status changes are available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fafafa] text-xs text-[#666]">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Changed at</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-[#f0f0f1]">
                    <td className="px-4 py-3 font-semibold">{event.status}</td>
                    <td className="px-4 py-3 text-[#666]">{event.reason || '—'}</td>
                    <td className="px-4 py-3 text-[#666]">{new Date(event.changed_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
