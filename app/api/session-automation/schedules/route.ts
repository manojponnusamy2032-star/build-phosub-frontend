import { NextResponse } from 'next/server'
import { getAuthenticatedRequest } from '@/lib/supabase/authenticated-request'

const squads = new Set(['138', '139', '183'])
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

type SchedulePayload = {
  squad?: unknown
  start_time?: unknown
  stop_time?: unknown
  enabled?: unknown
  recurrence?: unknown
  selected_days?: unknown
}

const recurrenceModes = new Set(['today', 'daily', 'selected'])

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && timePattern.test(value)
}

function isMentorProfile(profile: { role?: string } | null) {
  return profile?.role === 'mentor'
}

async function getMentorContext(request: Request) {
  const { userId } = await getAuthenticatedRequest(request)
  if (!userId) return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile, error } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) {
    console.error('Unable to verify automation schedule access', { code: error.code })
    return { error: NextResponse.json({ error: 'Unable to verify mentor access' }, { status: 500 }) }
  }
  if (!isMentorProfile(profile)) {
    return { error: NextResponse.json({ error: 'Only mentors can manage automation schedules' }, { status: 403 }) }
  }
  return { admin, userId }
}

function scheduleError(code?: string) {
  if (code === 'PGRST205' || code === '42P01') {
    return 'Squad automation is not installed. Apply migration 20261105000200_squad_session_automation.sql to Supabase.'
  }
  return 'Unable to save automation schedule'
}

export async function GET(request: Request) {
  const context = await getMentorContext(request)
  if (context.error) return context.error
  const { admin } = context
  const { data, error } = await admin
    .from('session_automation_schedules')
    .select('id, squad, start_time, stop_time, enabled, recurrence, selected_days, created_at, updated_at')
    .order('squad')
    .order('start_time')
  if (error) {
    console.error('Unable to load automation schedules', { code: error.code })
    return NextResponse.json({ error: scheduleError(error.code) }, { status: error.code === 'PGRST205' || error.code === '42P01' ? 503 : 500 })
  }
  return NextResponse.json({ schedules: data ?? [] })
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as SchedulePayload | null
  const squad = payload?.squad
  const startTime = payload?.start_time
  const stopTime = payload?.stop_time
  if (typeof squad !== 'string' || !squads.has(squad)) {
    return NextResponse.json({ error: 'Choose squad 138, 139, or 183' }, { status: 400 })
  }
  if (!isValidTime(startTime) || !isValidTime(stopTime) || startTime >= stopTime) {
    return NextResponse.json({ error: 'Choose valid IST start and stop times. Stop must be later than start.' }, { status: 400 })
  }
  const recurrence = payload?.recurrence
  const selectedDays = payload?.selected_days
  if (typeof recurrence !== 'string' || !recurrenceModes.has(recurrence)) {
    return NextResponse.json({ error: 'Choose when this automation should run' }, { status: 400 })
  }
  if (recurrence === 'selected' && (!Array.isArray(selectedDays) || selectedDays.length === 0 || selectedDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6))) {
    return NextResponse.json({ error: 'Choose at least one day for this automation' }, { status: 400 })
  }

  const context = await getMentorContext(request)
  if (context.error) return context.error
  const { admin, userId } = context
  const { data, error } = await admin
    .from('session_automation_schedules')
    .insert({
      squad,
      start_time: startTime,
      stop_time: stopTime,
      enabled: payload?.enabled !== false,
      recurrence,
      selected_days: recurrence === 'selected' ? selectedDays : [],
      run_date: recurrence === 'today' ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()) : null,
      created_by: userId,
    })
    .select('id, squad, start_time, stop_time, enabled, recurrence, selected_days, created_at, updated_at')
    .single()
  if (error) {
    console.error('Unable to create automation schedule', { code: error.code })
    return NextResponse.json({ error: scheduleError(error.code) }, { status: error.code === 'PGRST205' || error.code === '42P01' ? 503 : 500 })
  }
  return NextResponse.json({ schedule: data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const payload = await request.json().catch(() => null) as SchedulePayload & { id?: unknown } | null
  if (typeof payload?.id !== 'string') {
    return NextResponse.json({ error: 'A valid automation schedule id is required' }, { status: 400 })
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (payload.squad !== undefined) {
    if (typeof payload.squad !== 'string' || !squads.has(payload.squad)) return NextResponse.json({ error: 'Choose a valid squad' }, { status: 400 })
    updates.squad = payload.squad
  }
  if (payload.start_time !== undefined) {
    if (!isValidTime(payload.start_time)) return NextResponse.json({ error: 'Choose a valid start time' }, { status: 400 })
    updates.start_time = payload.start_time
  }
  if (payload.stop_time !== undefined) {
    if (!isValidTime(payload.stop_time)) return NextResponse.json({ error: 'Choose a valid stop time' }, { status: 400 })
    updates.stop_time = payload.stop_time
  }
  if (payload.enabled !== undefined) {
    if (typeof payload.enabled !== 'boolean') return NextResponse.json({ error: 'Enabled must be true or false' }, { status: 400 })
    updates.enabled = payload.enabled
  }
  if (payload.recurrence !== undefined) {
    if (typeof payload.recurrence !== 'string' || !recurrenceModes.has(payload.recurrence)) return NextResponse.json({ error: 'Choose a valid recurrence option' }, { status: 400 })
    updates.recurrence = payload.recurrence
  }
  if (payload.selected_days !== undefined) {
    if (!Array.isArray(payload.selected_days) || payload.selected_days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return NextResponse.json({ error: 'Choose valid days' }, { status: 400 })
    updates.selected_days = payload.selected_days
  }

  const context = await getMentorContext(request)
  if (context.error) return context.error
  const { admin } = context
  const { data: current, error: currentError } = await admin.from('session_automation_schedules').select('start_time, stop_time').eq('id', payload.id).maybeSingle()
  if (currentError || !current) return NextResponse.json({ error: currentError ? scheduleError(currentError.code) : 'Automation schedule not found' }, { status: currentError?.code === 'PGRST205' || currentError?.code === '42P01' ? 503 : 404 })
  const startTime = typeof updates.start_time === 'string' ? updates.start_time : current.start_time
  const stopTime = typeof updates.stop_time === 'string' ? updates.stop_time : current.stop_time
  if (startTime >= stopTime) return NextResponse.json({ error: 'Stop must be later than start.' }, { status: 400 })

  const { data, error } = await admin
    .from('session_automation_schedules')
    .update(updates)
    .eq('id', payload.id)
    .select('id, squad, start_time, stop_time, enabled, recurrence, selected_days, created_at, updated_at')
    .single()
  if (error) {
    console.error('Unable to update automation schedule', { code: error.code })
    return NextResponse.json({ error: scheduleError(error.code) }, { status: error.code === 'PGRST205' || error.code === '42P01' ? 503 : 500 })
  }
  return NextResponse.json({ schedule: data })
}

export async function DELETE(request: Request) {
  const payload = await request.json().catch(() => null) as { id?: unknown } | null
  if (typeof payload?.id !== 'string') return NextResponse.json({ error: 'A valid automation schedule id is required' }, { status: 400 })
  const context = await getMentorContext(request)
  if (context.error) return context.error
  const { admin } = context
  const { error } = await admin.from('session_automation_schedules').delete().eq('id', payload.id)
  if (error) {
    console.error('Unable to delete automation schedule', { code: error.code })
    return NextResponse.json({ error: scheduleError(error.code) }, { status: error.code === 'PGRST205' || error.code === '42P01' ? 503 : 500 })
  }
  return NextResponse.json({ ok: true })
}
