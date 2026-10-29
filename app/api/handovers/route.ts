import { NextResponse } from 'next/server'
import { getAuthenticatedRequest } from '@/lib/supabase/authenticated-request'

const allowedStatuses = new Set(['pending', 'submitted', 'retrieved', 'not_submitted'])

export async function GET(request: Request) {
  const { userId } = await getAuthenticatedRequest(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) {
    console.error('Unable to load handover profile', { code: profileError.code })
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  }
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (profile.role === 'mentor') {
    const { data: sessions, error: sessionsError } = await admin
      .from('sessions')
      .select('id')
      .eq('mentor_id', userId)
    if (sessionsError) {
      console.error('Unable to load mentor sessions for handovers', { code: sessionsError.code })
      return NextResponse.json({ error: 'Unable to load sessions' }, { status: 500 })
    }
    const sessionIds = (sessions ?? []).map((session) => session.id)
    if (sessionIds.length === 0) return NextResponse.json({ handovers: [] })

    const { data: records, error: handoversError } = await admin
      .from('handovers')
      .select('id, student_id, session_id, status, reason, phone_model, updated_at')
      .in('session_id', sessionIds)
      .order('updated_at', { ascending: false })
    if (handoversError) {
      console.error('Unable to load mentor handovers', { code: handoversError.code })
      return NextResponse.json({ error: 'Unable to load handovers' }, { status: 500 })
    }

    const studentIds = [...new Set((records ?? []).map((handover) => handover.student_id))]
    const { data: students, error: studentsError } = studentIds.length
      ? await admin.from('profiles').select('id, full_name').in('id', studentIds)
      : { data: [], error: null }
    if (studentsError) {
      console.error('Unable to load handover student names', { code: studentsError.code })
      return NextResponse.json({ error: 'Unable to load student names' }, { status: 500 })
    }
    const studentNames = new Map((students ?? []).map((student) => [student.id, student.full_name]))
    const handovers = (records ?? []).map((handover) => ({
      ...handover,
      student: { full_name: studentNames.get(handover.student_id) ?? 'Student' },
    }))
    return NextResponse.json({ handovers })
  }

  if (profile.role !== 'student') {
    return NextResponse.json({ error: 'Unsupported account role' }, { status: 403 })
  }

  const url = new URL(request.url)
  const history = url.searchParams.get('history') === '1' || url.searchParams.get('view') === 'history'

  if (history) {
    const { data, error } = await admin
      .from('handovers')
      .select('id, student_id, session_id, status, reason, phone_model, updated_at, sessions(id, squad, name, status, started_at, ended_at)')
      .eq('student_id', userId)
      .order('updated_at', { ascending: false })
    if (error) {
      console.error('Unable to load student handover history', { code: error.code })
      return NextResponse.json({ error: 'Unable to load handovers' }, { status: 500 })
    }
    const { data: events, error: eventsError } = await admin
      .from('handover_events')
      .select('id, handover_id, session_id, student_id, status, reason, changed_by, changed_at')
      .eq('student_id', userId)
      .order('changed_at', { ascending: false })
    if (eventsError) {
      console.error('Unable to load student handover events', { code: eventsError.code })
      return NextResponse.json({ error: 'Unable to load handover history' }, { status: 500 })
    }
    return NextResponse.json({ handovers: data ?? [], events: events ?? [] })
  }

  const { data, error } = await admin
    .from('handovers')
    .select('id, student_id, session_id, status, reason, phone_model, updated_at, sessions!inner(squad, status)')
    .eq('student_id', userId)
    .eq('sessions.status', 'active')
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('Unable to load student handovers', { code: error.code })
    return NextResponse.json({ error: 'Unable to load handovers' }, { status: 500 })
  }
  return NextResponse.json({ handovers: data ?? [] })
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid handover payload' }, { status: 400 })
  }
  const body = payload as Record<string, unknown>
  if (typeof body.status !== 'string' || !allowedStatuses.has(body.status)) {
    return NextResponse.json({ error: 'Invalid handover payload' }, { status: 400 })
  }
  if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') {
    return NextResponse.json({ error: 'Reason must be text' }, { status: 400 })
  }
  if (body.phoneModel !== undefined && body.phoneModel !== null && typeof body.phoneModel !== 'string') {
    return NextResponse.json({ error: 'Phone model must be text' }, { status: 400 })
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  const phoneModel = typeof body.phoneModel === 'string' ? body.phoneModel.trim() : ''
  if (reason.length > 500) {
    return NextResponse.json({ error: 'Reason must be 500 characters or fewer' }, { status: 400 })
  }
  if (phoneModel.length > 100) {
    return NextResponse.json({ error: 'Phone model must be 100 characters or fewer' }, { status: 400 })
  }
  if (body.status === 'submitted' && !phoneModel) {
    return NextResponse.json({ error: 'Enter the phone model before marking it submitted' }, { status: 400 })
  }
  const { userId } = await getAuthenticatedRequest(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if ((body.status === 'not_submitted' || body.status === 'retrieved') && !reason) {
    return NextResponse.json({ error: 'A reason is required for this status' }, { status: 400 })
  }
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role, squad')
    .eq('id', userId)
    .single()
  if (profileError) {
    console.error('Unable to load handover submitter profile', { code: profileError.code })
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  }
  if (profile?.role !== 'student' || !profile.squad) {
    return NextResponse.json({ error: 'Only students with a squad can submit handovers' }, { status: 403 })
  }
  const { data: activeSession, error: sessionError } = await admin
    .from('sessions')
    .select('id')
    .eq('status', 'active')
    .eq('squad', profile.squad)
    .limit(1)
    .maybeSingle()
  if (sessionError) {
    console.error('Unable to find active handover session', { code: sessionError.code })
    return NextResponse.json({ error: 'Unable to find an active session' }, { status: 500 })
  }
  if (!activeSession) return NextResponse.json({ error: 'No active session for your squad' }, { status: 409 })
  const { error } = await admin.from('handovers').upsert({
    session_id: activeSession.id,
    student_id: userId,
    status: body.status,
    reason: reason || null,
    ...(phoneModel ? { phone_model: phoneModel } : {}),
    updated_by: userId,
  }, { onConflict: 'session_id,student_id' })
  if (error) {
    console.error('Unable to save handover status', { code: error.code })
    return NextResponse.json({ error: 'Unable to save handover status' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
