import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const allowedStatuses = new Set(['pending', 'submitted', 'retrieved', 'not_submitted'])

export async function GET(request: Request) {
  const supabase = await createClient()
  // Try Bearer token first
  const authHeader = request.headers.get('Authorization')
  let userId: string | undefined
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: claims, error } = await supabase.auth.getClaims(token)
    if (!error && claims?.claims?.sub) {
      userId = claims.claims.sub
    }
  }
  if (!userId) {
    const { data: claims } = await supabase.auth.getClaims()
    userId = claims?.claims?.sub
  }
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (profile.role === 'mentor') {
    const { data: sessions, error: sessionsError } = await admin
      .from('sessions')
      .select('id')
      .eq('mentor_id', userId)
    if (sessionsError) return NextResponse.json({ error: 'Unable to load sessions' }, { status: 500 })
    const sessionIds = (sessions ?? []).map((session) => session.id)
    if (sessionIds.length === 0) return NextResponse.json({ handovers: [] })

    const { data: records, error: handoversError } = await admin
      .from('handovers')
      .select('id, student_id, session_id, status, reason, updated_at')
      .in('session_id', sessionIds)
      .order('updated_at', { ascending: false })
    if (handoversError) return NextResponse.json({ error: 'Unable to load handovers' }, { status: 500 })

    const studentIds = [...new Set((records ?? []).map((handover) => handover.student_id))]
    const { data: students, error: studentsError } = studentIds.length
      ? await admin.from('profiles').select('id, full_name').in('id', studentIds)
      : { data: [], error: null }
    if (studentsError) return NextResponse.json({ error: 'Unable to load student names' }, { status: 500 })
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

  const { data, error } = await admin
    .from('handovers')
    .select('id, student_id, session_id, status, reason, updated_at, sessions!inner(squad, status)')
    .eq('student_id', userId)
    .eq('sessions.status', 'active')
    .order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Unable to load handovers' }, { status: 500 })
  return NextResponse.json({ handovers: data ?? [] })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.status !== 'string' || !allowedStatuses.has(body.status)) {
    return NextResponse.json({ error: 'Invalid handover payload' }, { status: 400 })
  }
  const supabase = await createClient()
  // Try Bearer token first
  const authHeader = request.headers.get('Authorization')
  let userId: string | undefined
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: claims, error } = await supabase.auth.getClaims(token)
    if (!error && claims?.claims?.sub) {
      userId = claims.claims.sub
    }
  }
  if (!userId) {
    const { data: claims } = await supabase.auth.getClaims()
    userId = claims?.claims?.sub
  }
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
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
  if (profileError || profile?.role !== 'student' || !profile.squad) {
    return NextResponse.json({ error: 'Only students with a squad can submit handovers' }, { status: 403 })
  }
  const { data: activeSession, error: sessionError } = await admin
    .from('sessions')
    .select('id')
    .eq('status', 'active')
    .eq('squad', profile.squad)
    .limit(1)
    .maybeSingle()
  if (sessionError) return NextResponse.json({ error: 'Unable to find an active session' }, { status: 500 })
  if (!activeSession) return NextResponse.json({ error: 'No active session for your squad' }, { status: 409 })
  const { error } = await admin.from('handovers').upsert({
    session_id: activeSession.id,
    student_id: userId,
    status: body.status,
    reason: reason ? reason.slice(0, 500) : null,
    updated_by: userId,
  }, { onConflict: 'session_id,student_id' })
  if (error) return NextResponse.json({ error: 'Unable to save handover status' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
