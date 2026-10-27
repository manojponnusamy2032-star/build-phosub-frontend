import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const allowedStatuses = new Set(['pending', 'submitted', 'retrieved', 'not_submitted'])

export async function GET() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data, error } = await supabase
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
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if ((body.status === 'not_submitted' || body.status === 'retrieved') && !reason) {
    return NextResponse.json({ error: 'A reason is required for this status' }, { status: 400 })
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, squad')
    .eq('id', userId)
    .single()
  if (profileError || profile?.role !== 'student' || !profile.squad) {
    return NextResponse.json({ error: 'Only students with a squad can submit handovers' }, { status: 403 })
  }
  const { data: activeSession, error: sessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('status', 'active')
    .eq('squad', profile.squad)
    .limit(1)
    .maybeSingle()
  if (sessionError) return NextResponse.json({ error: 'Unable to find an active session' }, { status: 500 })
  if (!activeSession) return NextResponse.json({ error: 'No active session for your squad' }, { status: 409 })
  const { error } = await supabase.from('handovers').upsert({
    session_id: activeSession.id,
    student_id: userId,
    status: body.status,
    reason: reason ? reason.slice(0, 500) : null,
    updated_by: userId,
  }, { onConflict: 'session_id,student_id' })
  if (error) return NextResponse.json({ error: 'Unable to save handover status' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
