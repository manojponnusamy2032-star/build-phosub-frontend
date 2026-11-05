import { NextResponse } from 'next/server'
import { getAuthenticatedRequest } from '@/lib/supabase/authenticated-request'

const squads = new Set(['138', '139', '183'])

export async function GET(request: Request) {
  const { userId } = await getAuthenticatedRequest(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin.from('profiles').select('role, squad').eq('id', userId).maybeSingle()
  if (profileError) {
    console.error('Unable to load sessions profile', { code: profileError.code })
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  }
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  const query = profile.role === 'mentor'
    ? admin.from('sessions').select('id, squad, name, status, started_at, ended_at, mentor_id, automation_schedule_id').order('started_at', { ascending: false })
    : admin.from('sessions').select('id, squad, name, status, started_at, ended_at, automation_schedule_id').eq('squad', profile.squad).eq('status', 'active').order('started_at', { ascending: false }).limit(1)
  const { data, error } = await query
  if (error) {
    console.error('Unable to load sessions', { code: error.code })
    return NextResponse.json({ error: 'Unable to load sessions' }, { status: 500 })
  }
  if (profile.role !== 'mentor') return NextResponse.json({ sessions: data ?? [], profile })

  const mentorIds = [...new Set((data ?? []).flatMap((session) => 'mentor_id' in session ? [session.mentor_id] : []))]
  const { data: mentors, error: mentorsError } = mentorIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', mentorIds)
    : { data: [], error: null }
  if (mentorsError) {
    console.error('Unable to load session starter names', { code: mentorsError.code })
    return NextResponse.json({ error: 'Unable to load session starters' }, { status: 500 })
  }
  const mentorNames = new Map((mentors ?? []).map((mentor) => [mentor.id, mentor.full_name]))
  const sessions = (data ?? []).map((session) => 'mentor_id' in session
    ? { ...session, mentor_name: mentorNames.get(session.mentor_id) ?? 'Another mentor' }
    : session)
  return NextResponse.json({ sessions, profile })
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid session payload' }, { status: 400 })
  }
  const body = payload as Record<string, unknown>
  const squad = typeof body.squad === 'string' ? body.squad : ''
  if (!squads.has(squad)) return NextResponse.json({ error: 'Choose squad 138, 139, or 183' }, { status: 400 })
  const { userId } = await getAuthenticatedRequest(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (profileError) {
    console.error('Unable to load session starter profile', { code: profileError.code })
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  }
  if (profile?.role !== 'mentor') return NextResponse.json({ error: 'Only mentors can start sessions' }, { status: 403 })
  const { data, error } = await admin.from('sessions').insert({ mentor_id: userId, squad, name: `Squad ${squad} phone handover` }).select().single()
  if (error?.code === '23505') {
    return NextResponse.json({ error: `Squad ${squad} already has an active session.` }, { status: 409 })
  }
  if (error) {
    console.error('Unable to start session', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Unable to start session' }, { status: 500 })
  }
  return NextResponse.json({ session: data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid session payload' }, { status: 400 })
  }
  const body = payload as Record<string, unknown>
  if (typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) {
    return NextResponse.json({ error: 'A valid session id is required' }, { status: 400 })
  }
  const { userId } = await getAuthenticatedRequest(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (profileError) {
    console.error('Unable to load session stopper profile', { code: profileError.code })
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  }
  if (profile?.role !== 'mentor') return NextResponse.json({ error: 'Only mentors can end sessions' }, { status: 403 })
  const { data, error } = await admin.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', body.id).eq('status', 'active').select().maybeSingle()
  if (error) {
    console.error('Unable to end session', { code: error.code })
    return NextResponse.json({ error: 'Unable to end session' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Session is not active or no longer exists' }, { status: 409 })
  return NextResponse.json({ session: data })
}

export async function DELETE(request: Request) {
  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid session payload' }, { status: 400 })
  }
  const body = payload as Record<string, unknown>
  if (typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) {
    return NextResponse.json({ error: 'A valid session id is required' }, { status: 400 })
  }
  const { userId } = await getAuthenticatedRequest(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (profileError) {
    console.error('Unable to load session deleter profile', { code: profileError.code })
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  }
  if (profile?.role !== 'mentor') return NextResponse.json({ error: 'Only mentors can delete sessions' }, { status: 403 })

  const { data: session, error: sessionError } = await admin
    .from('sessions')
    .select('id, squad, status')
    .eq('id', body.id)
    .maybeSingle()
  if (sessionError) {
    console.error('Unable to load session for deletion', { code: sessionError.code })
    return NextResponse.json({ error: 'Unable to load session' }, { status: 500 })
  }
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'ended') return NextResponse.json({ error: 'Only ended sessions can be deleted' }, { status: 409 })

  const { data, error } = await admin
    .from('sessions')
    .delete()
    .eq('id', body.id)
    .eq('status', 'ended')
    .select('id, squad')
    .maybeSingle()
  if (error) {
    console.error('Unable to delete session', { code: error.code })
    return NextResponse.json({ error: 'Unable to delete session' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Only ended sessions can be deleted' }, { status: 409 })
  return NextResponse.json({ session: data })
}
