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
    ? admin.from('sessions').select('id, squad, name, status, started_at, ended_at').eq('mentor_id', userId).order('started_at', { ascending: false })
    : admin.from('sessions').select('id, squad, name, status, started_at, ended_at').eq('squad', profile.squad).eq('status', 'active').order('started_at', { ascending: false }).limit(1)
  const { data, error } = await query
  if (error) {
    console.error('Unable to load sessions', { code: error.code })
    return NextResponse.json({ error: 'Unable to load sessions' }, { status: 500 })
  }
  return NextResponse.json({ sessions: data ?? [], profile })
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
  const { data, error } = await admin.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', body.id).eq('mentor_id', userId).eq('status', 'active').select().maybeSingle()
  if (error) {
    console.error('Unable to end session', { code: error.code })
    return NextResponse.json({ error: 'Unable to end session' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Session is not active or not owned by you' }, { status: 409 })
  return NextResponse.json({ session: data })
}
