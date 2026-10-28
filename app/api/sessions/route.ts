import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const squads = new Set(['138', '139', '183'])

async function currentUser(request: Request) {
  const supabase = await createClient()
  // Try Bearer token first
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data, error } = await supabase.auth.getClaims(token)
    if (!error && data?.claims?.sub) {
      return { supabase, userId: data.claims.sub }
    }
  }
  const { data } = await supabase.auth.getClaims()
  return { supabase, userId: data?.claims?.sub ?? null }
}

export async function GET(request: Request) {
  const { supabase, userId } = await currentUser(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, squad').eq('id', userId).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  const query = profile.role === 'mentor'
    ? admin.from('sessions').select('id, squad, name, status, started_at, ended_at').eq('mentor_id', userId).order('started_at', { ascending: false })
    : admin.from('sessions').select('id, squad, name, status, started_at, ended_at').eq('squad', profile.squad).eq('status', 'active').order('started_at', { ascending: false }).limit(1)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Unable to load sessions' }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [], profile })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const squad = typeof body?.squad === 'string' ? body.squad : ''
  if (!squads.has(squad)) return NextResponse.json({ error: 'Choose squad 138, 139, or 183' }, { status: 400 })
  const { supabase, userId } = await currentUser(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).single()
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
  const body = await request.json().catch(() => null)
  if (typeof body?.id !== 'string') return NextResponse.json({ error: 'Session id is required' }, { status: 400 })
  const { supabase, userId } = await currentUser(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data, error } = await admin.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', body.id).eq('mentor_id', userId).eq('status', 'active').select().single()
  if (error || !data) return NextResponse.json({ error: 'Unable to end session' }, { status: 400 })
  return NextResponse.json({ session: data })
}
