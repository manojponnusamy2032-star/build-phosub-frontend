'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChartNoAxesColumn, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Plus, Trash2, UserRound, UsersRound, Zap } from 'lucide-react'
import { LoadingSpinner, useAuth } from '@/components/providers'
import { getAccessToken } from '@/lib/supabase/auth-token'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { BottomNav, DashboardSidebar, TopBar } from '@/components/navigation/top-bar'
import { DashboardFooter } from '@/components/site-footer'

const squads = ['138', '139', '183']
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const hourOptions = Array.from({ length: 12 }, (_, index) => { const value = String(index + 1); return { value, label: value } })
const minuteOptions = Array.from({ length: 60 }, (_, index) => { const value = String(index).padStart(2, '0'); return { value, label: value } })
const periodOptions = [{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }]
const wheelRowHeight = 36
const navigation = [
  { id: 'sessions', href: '/mentor', label: 'Sessions', icon: ClipboardCheck },
  { id: 'reports', href: '/mentor?view=reports', label: 'Reports', icon: ChartNoAxesColumn },
  { id: 'squads', href: '/mentor?view=squads', label: 'Squads', icon: UsersRound },
  { id: 'automation', href: '/mentor/automation', label: 'Automation', icon: CalendarDays },
  { id: 'profile', href: '/mentor?view=profile', label: 'Profile', icon: UserRound },
]

type Schedule = {
  id: string
  squad: string
  start_time: string
  stop_time: string
  enabled: boolean
  recurrence: 'today' | 'daily' | 'selected'
  selected_days: number[]
}

type FormState = { squad: string; start_time: string; stop_time: string; recurrence: 'today' | 'daily' | 'selected'; selected_days: number[] }
const emptyForm: FormState = { squad: '138', start_time: '08:50', stop_time: '09:40', recurrence: 'daily', selected_days: [] }

function displayTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function recurrenceLabel(schedule: Schedule) {
  if (schedule.recurrence === 'today') return 'Runs today only'
  if (schedule.recurrence === 'selected') return `Runs ${(schedule.selected_days ?? []).map((day) => weekDays[day]?.slice(0, 3)).join(', ')}`
  return 'Runs daily'
}

function timeParts(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
  return {
    hour: String(hours % 12 || 12),
    minute: String(minutes).padStart(2, '0'),
    period: hours >= 12 ? 'PM' : 'AM',
  }
}

function toTwentyFourHour(hour: string, minute: string, period: string) {
  let hours = Number(hour) % 12
  if (period === 'PM') hours += 12
  return `${String(hours).padStart(2, '0')}:${minute}`
}

function WheelColumn({ ariaLabel, value, options, onChange }: { ariaLabel: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const [centerIndex, setCenterIndex] = useState(selectedIndex)
  const listId = `time-wheel-${ariaLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  useEffect(() => {
    setCenterIndex(selectedIndex)
    if (wheelRef.current) wheelRef.current.scrollTop = selectedIndex * wheelRowHeight
  }, [selectedIndex])

  useEffect(() => () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
  }, [])

  function chooseIndex(index: number) {
    const boundedIndex = Math.max(0, Math.min(options.length - 1, index))
    setCenterIndex(boundedIndex)
    if (wheelRef.current) wheelRef.current.scrollTop = boundedIndex * wheelRowHeight
    onChange(options[boundedIndex].value)
  }

  function handleScroll() {
    const wheel = wheelRef.current
    if (!wheel) return
    const index = Math.max(0, Math.min(options.length - 1, Math.round(wheel.scrollTop / wheelRowHeight)))
    setCenterIndex(index)
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => onChange(options[index].value), 120)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let nextIndex: number | null = null
    if (event.key === 'ArrowDown') nextIndex = centerIndex + 1
    if (event.key === 'ArrowUp') nextIndex = centerIndex - 1
    if (event.key === 'PageDown') nextIndex = centerIndex + 5
    if (event.key === 'PageUp') nextIndex = centerIndex - 5
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = options.length - 1
    if (nextIndex !== null) {
      event.preventDefault()
      chooseIndex(nextIndex)
    }
  }

  return (
    <div
      ref={wheelRef}
      id={listId}
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={`${listId}-option-${options[centerIndex]?.value}`}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      className="relative z-0 h-full min-w-0 snap-y snap-mandatory overflow-y-auto overscroll-contain text-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D71920]"
      style={{ scrollbarWidth: 'none', maskImage: 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)' }}
    >
      <div aria-hidden="true" className="h-[72px]" />
      {options.map((option, index) => (
        <div
          key={option.value}
          id={`${listId}-option-${option.value}`}
          role="option"
          aria-selected={centerIndex === index}
          onClick={() => chooseIndex(index)}
          className={`grid h-9 cursor-pointer snap-center place-items-center text-sm transition-colors ${centerIndex === index ? 'font-bold text-[#211D1C]' : 'text-[#A9A2A0]'}`}
        >
          {option.label}
        </div>
      ))}
      <div aria-hidden="true" className="h-[72px]" />
    </div>
  )
}

function RecurrencePicker({ value, onChange }: { value: FormState['recurrence']; onChange: (value: FormState['recurrence']) => void }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const options: { value: FormState['recurrence']; label: string }[] = [
    { value: 'today', label: 'Today only' },
    { value: 'daily', label: 'Daily' },
    { value: 'selected', label: 'Select days' },
  ]

  useEffect(() => {
    if (!open) return
    const closePicker = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closePicker)
    return () => document.removeEventListener('mousedown', closePicker)
  }, [open])

  return (
    <div ref={pickerRef} className="relative text-xs font-semibold text-[#F4E9E7]">
      <span>Runs</span>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="mt-1.5 flex h-11 w-full items-center justify-between rounded-xl border border-white/20 bg-white/10 px-3 text-left text-sm text-white outline-none transition-colors hover:border-[#FFD9D9] focus:border-[#FFD9D9]">
        {options.find((option) => option.value === value)?.label}
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div role="listbox" aria-label="Automation recurrence" className="absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-white/20 bg-[#302B2A] p-1 shadow-[0_16px_30px_rgba(0,0,0,0.3)]">{options.map((option) => <button key={option.value} type="button" role="option" aria-selected={value === option.value} onClick={() => { onChange(option.value); setOpen(false) }} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${value === option.value ? 'bg-[#F7DADD] font-semibold text-[#8F1D24]' : 'text-[#F4E9E7] hover:bg-white/10'}`}>{option.label}</button>)}</div>}
    </div>
  )
}

function SquadPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closePicker = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closePicker)
    return () => document.removeEventListener('mousedown', closePicker)
  }, [open])

  return (
    <div ref={pickerRef} className="relative text-xs font-semibold text-[#F4E9E7]">
      <span>Squad</span>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="mt-1.5 flex h-11 w-full items-center justify-between rounded-xl border border-white/20 bg-white/10 px-3 text-left text-sm text-white outline-none transition-colors hover:border-[#FFD9D9] focus:border-[#FFD9D9]">
        {value}
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div role="listbox" aria-label="Squad" className="absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-white/20 bg-[#302B2A] p-1 shadow-[0_16px_30px_rgba(0,0,0,0.3)]">{squads.map((squad) => <button key={squad} type="button" role="option" aria-selected={value === squad} onClick={() => { onChange(squad); setOpen(false) }} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${value === squad ? 'bg-[#F7DADD] font-semibold text-[#8F1D24]' : 'text-[#F4E9E7] hover:bg-white/10'}`}>{squad}</button>)}</div>}
    </div>
  )
}

function TimePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const parts = timeParts(value)
  const update = (part: 'hour' | 'minute' | 'period', nextValue: string) => {
    const nextParts = { ...parts, [part]: nextValue }
    onChange(toTwentyFourHour(nextParts.hour, nextParts.minute, nextParts.period))
  }

  return (
    <fieldset className="min-w-0">
      <legend className="text-xs font-semibold text-[#F4E9E7]">{label}</legend>
      <div className="mt-1.5 rounded-xl border border-[#E9E0DE] bg-[#F8F5F4] p-1.5">
        <div className="relative grid h-[180px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch overflow-hidden rounded-lg bg-white">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-[72px] z-10 h-9 rounded-lg border-y border-[#F2C9CB] bg-[#FFF1F2]/60" />
          <WheelColumn ariaLabel={`${label} hour`} value={parts.hour} options={hourOptions} onChange={(hour) => update('hour', hour)} />
          <span aria-hidden="true" className="relative z-20 grid place-items-center text-lg font-bold text-[#211D1C]">:</span>
          <WheelColumn ariaLabel={`${label} minute`} value={parts.minute} options={minuteOptions} onChange={(minute) => update('minute', minute)} />
          <span aria-hidden="true" className="relative z-20 grid place-items-center px-1 text-xs font-semibold text-[#A9A2A0]"> </span>
          <WheelColumn ariaLabel={`${label} AM or PM`} value={parts.period} options={periodOptions} onChange={(period) => update('period', period)} />
        </div>
      </div>
    </fieldset>
  )
}

export default function MentorAutomationPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [automationCreatedConfirmation, setAutomationCreatedConfirmation] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user) return
    void loadPage()
  }, [authLoading, user])

  async function authorizedFetch(input: RequestInfo | URL, init?: RequestInit) {
    const token = await getAccessToken()
    if (!token) throw new Error('Your sign-in has expired. Please sign in again.')
    return fetch(input, {
      ...init,
      credentials: 'include',
      headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
    })
  }

  async function loadPage() {
    setLoading(true)
    try {
      const profileResponse = await authorizedFetch('/api/profile')
      const profileData = await profileResponse.json()
      if (!profileResponse.ok) throw new Error(profileData.error || 'Unable to load your profile')
      if (profileData.profile?.role !== 'mentor') throw new Error('Only mentors can manage automation schedules')
      setProfile(profileData.profile)
      setError('')
      setLoading(false)

      setSchedulesLoading(true)
      const schedulesResponse = await authorizedFetch('/api/session-automation/schedules')
      const schedulesData = await schedulesResponse.json()
      if (!schedulesResponse.ok) throw new Error(schedulesData.error || 'Unable to load automation schedules')
      setSchedules(schedulesData.schedules ?? [])
      setSchedulesLoading(false)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load automation schedules')
      setLoading(false)
      setSchedulesLoading(false)
    }
  }

  async function addSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await authorizedFetch('/api/session-automation/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to add automation schedule')
      setSchedules((current) => [...current, result.schedule].sort((a, b) => a.squad.localeCompare(b.squad) || a.start_time.localeCompare(b.start_time)))
      setForm(emptyForm)
      setAutomationCreatedConfirmation(`The automation window for Squad ${form.squad} was created successfully.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add automation schedule')
    } finally {
      setSaving(false)
    }
  }

  async function toggleSchedule(schedule: Schedule) {
    setUpdatingId(schedule.id)
    setError('')
    try {
      const response = await authorizedFetch('/api/session-automation/schedules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: schedule.id, enabled: !schedule.enabled }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to update automation schedule')
      setSchedules((current) => current.map((item) => item.id === schedule.id ? result.schedule : item))
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update automation schedule')
    } finally {
      setUpdatingId(null)
    }
  }

  async function deleteSchedule(schedule: Schedule) {
    setDeletingId(schedule.id)
    setError('')
    try {
      const response = await authorizedFetch('/api/session-automation/schedules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: schedule.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to delete automation schedule')
      setSchedules((current) => current.filter((item) => item.id !== schedule.id))
      setNotice(`Automation removed from Squad ${schedule.squad}.`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete automation schedule')
    } finally {
      setDeletingId(null)
    }
  }

  if (authLoading || loading) return <LoadingSpinner />
  if (!user || !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8F5F4] p-6"><div className="rounded-2xl bg-white p-6 text-center shadow-sm"><p className="font-semibold">{error || 'Please sign in to continue.'}</p><button type="button" onClick={() => router.push('/login')} className="mt-4 rounded-xl bg-[#D71920] px-4 py-2 font-semibold text-white">Go to sign in</button></div></div>
  }

  const displayName = profile.full_name?.trim() || user.email?.split('@')[0] || 'Mentor'
  const selectedDays = form.selected_days ?? []

  return (
    <div className="dashboard-web-stage min-h-screen bg-[#F8F5F4] text-[#171717]">
      <div className="dashboard-web-frame">
        <DashboardSidebar items={navigation} activeId="automation" label="Mentor workspace" onSignOut={() => createSupabaseClient().auth.signOut().then(() => router.replace('/login'))} />
        <div className="dashboard-web-content min-w-0">
          <TopBar name={displayName} avatarUrl={profile.avatar_url} profileHref="/mentor?view=profile" />
          <main className="dashboard-web-main mx-auto w-full max-w-[1200px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pt-8 lg:px-8 xl:px-10">
            {notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-2xl border border-[#B9D8C1] bg-[#EDF7EF] px-4 py-3 text-sm font-medium text-[#285C36]"><CheckCircle2 size={18} />{notice}</div>}
            {error && <div role="alert" className="mb-5 rounded-2xl border border-[#E6B9BC] bg-[#FFF4F4] px-4 py-3 text-sm font-medium text-[#8F1D24]">{error}</div>}
            <section className="mb-8 max-w-3xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8F1D24]">Mentor workspace / automation</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Squad schedules</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5F5755]">Set as many daily start and stop windows as each squad needs. All times use India Standard Time, and sessions run automatically even when no mentor has the dashboard open.</p>
            </section>

            <section className="relative z-10 mb-8 overflow-visible rounded-[26px] border border-[#E9E0DE] bg-[#211D1C] text-white shadow-[0_18px_45px_rgba(54,22,22,0.12)]">
              <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#FFD9D9]"><Zap size={14} /> Add automation</div>
                  <h2 className="text-2xl font-bold">Create a new window</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#E7DAD8]">A session starts at the start time and ends at the stop time on every day that this schedule is enabled.</p>
                </div>
                <form onSubmit={addSchedule} className="grid gap-3 sm:grid-cols-2 lg:min-w-[620px] lg:grid-cols-4">
                  <SquadPicker value={form.squad} onChange={(squad) => setForm((current) => ({ ...current, squad }))} />
                  <TimePicker label="Starts" value={form.start_time} onChange={(start_time) => setForm((current) => ({ ...current, start_time }))} />
                  <TimePicker label="Stops" value={form.stop_time} onChange={(stop_time) => setForm((current) => ({ ...current, stop_time }))} />
                  <RecurrencePicker value={form.recurrence} onChange={(recurrence) => setForm((current) => ({ ...current, recurrence }))} />
                  {form.recurrence === 'selected' && <fieldset className="min-w-0 sm:col-span-2 lg:col-span-4"><legend className="text-xs font-semibold text-[#F4E9E7]">Choose days</legend><div className="mt-1.5 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{weekDays.map((day, index) => <label key={day} className="flex min-h-10 min-w-0 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2 text-xs text-[#F4E9E7]"><input type="checkbox" checked={selectedDays.includes(index)} onChange={(event) => setForm((current) => { const currentDays = current.selected_days ?? []; return { ...current, selected_days: event.target.checked ? [...currentDays, index].sort() : currentDays.filter((selectedDay) => selectedDay !== index) } })} className="shrink-0 accent-[#F7DADD]" /><span className="truncate">{day}</span></label>)}</div></fieldset>}
                  <button disabled={saving} type="submit" className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#F7DADD] px-4 text-sm font-bold text-[#8F1D24] transition-colors hover:bg-white disabled:opacity-60"><Plus size={17} />{saving ? 'Adding...' : 'Add window'}</button>
                </form>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-3">
              {squads.map((squad) => {
                const squadSchedules = schedules.filter((schedule) => schedule.squad === squad)
                return <article key={squad} className="rounded-[22px] border border-[#E9E0DE] bg-white p-5 shadow-[0_12px_30px_rgba(54,22,22,0.06)]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8F1D24]">Schedule group</p><h2 className="mt-1 text-xl font-bold">Squad {squad}</h2></div><span className="rounded-full bg-[#F8F5F4] px-2.5 py-1 text-xs font-semibold text-[#5F5755]">{squadSchedules.length} {squadSchedules.length === 1 ? 'window' : 'windows'}</span></div><div className="mt-5 space-y-3">{schedulesLoading ? <p className="rounded-xl border border-dashed border-[#E9E0DE] px-3 py-5 text-center text-sm text-[#7C7471]">Loading windows...</p> : squadSchedules.length === 0 ? <p className="rounded-xl border border-dashed border-[#E9E0DE] px-3 py-5 text-center text-sm text-[#7C7471]">No automated windows yet.</p> : squadSchedules.map((schedule) => <div key={schedule.id} className="rounded-2xl border border-[#EFE8E6] bg-[#FCFBFA] p-3.5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-bold"><Clock3 size={16} className="text-[#B5121B]" />{displayTime(schedule.start_time)} <span className="font-normal text-[#9A918E]">to</span> {displayTime(schedule.stop_time)}</div><button type="button" aria-label={`${schedule.enabled ? 'Disable' : 'Enable'} Squad ${squad} schedule`} onClick={() => void toggleSchedule(schedule)} disabled={updatingId === schedule.id} className={`relative h-6 w-11 rounded-full transition-colors ${schedule.enabled ? 'bg-[#D71920]' : 'bg-[#D7D1CF]'}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${schedule.enabled ? 'translate-x-6' : 'translate-x-1'}`} /></button></div><div className="mt-3 flex items-center justify-between gap-3"><span className={`text-xs font-semibold ${schedule.enabled ? 'text-[#285C36]' : 'text-[#7C7471]'}`}>{schedule.enabled ? recurrenceLabel(schedule) : 'Paused'}</span><button type="button" aria-label={`Delete Squad ${squad} schedule`} onClick={() => void deleteSchedule(schedule)} disabled={deletingId === schedule.id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8F1D24] hover:text-[#D71920] disabled:opacity-50"><Trash2 size={14} /> Remove</button></div></div>)}</div></article>
              })}
            </section>
            <DashboardFooter />
          </main>
        </div>
      </div>
      {automationCreatedConfirmation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#211D1C]/45 p-4 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" aria-labelledby="automation-created-title" aria-describedby="automation-created-description" className="w-full max-w-[420px] rounded-[26px] border border-white/90 bg-white/95 p-6 shadow-[0_24px_70px_rgba(27,20,19,0.28)] backdrop-blur-xl sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#EDF7EF] text-[#285C36]"><CheckCircle2 size={21} aria-hidden="true" /></span>
              <div className="min-w-0 pt-0.5"><h2 id="automation-created-title" className="text-lg font-semibold text-[#211D1C]">Automation created</h2><p id="automation-created-description" className="mt-2 text-sm leading-6 text-[#6D6664]">{automationCreatedConfirmation}</p></div>
            </div>
            <div className="mt-7 flex justify-end"><button type="button" autoFocus onClick={() => setAutomationCreatedConfirmation(null)} className="min-h-11 min-w-20 rounded-xl bg-[#D71920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#B5121B]">OK</button></div>
          </section>
        </div>
      )}
      <BottomNav items={navigation} activeId="automation" label="Mentor workspace navigation" className="!z-[100] !flex lg:!hidden" />
    </div>
  )
}
