import { NextResponse } from 'next/server'
import { getAuthenticatedRequest } from '@/lib/supabase/authenticated-request'

const squads = new Set(['138', '139', '183'])

export async function GET(request: Request) {
  const { userId } = await getAuthenticatedRequest(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data, error } = await admin.from('profiles').select('id, full_name, email, role, squad').eq('id', userId).maybeSingle()
  if (error) {
    console.error('Unable to load profile', { code: error.code })
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  }
  return NextResponse.json({ profile: data })
}

export async function POST(request: Request) {
  const { userId, email } = await getAuthenticatedRequest(request)
  if (!userId || typeof email !== 'string') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  // Use admin client for upsert (bypasses RLS) since we've already verified the user
  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid profile payload' }, { status: 400 })
  }
  const body = payload as Record<string, unknown>
  if (typeof body.fullName !== 'string') return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
  if (body.role !== 'mentor' && body.role !== 'student') {
    return NextResponse.json({ error: 'Choose a valid account type' }, { status: 400 })
  }
  if (body.squad !== undefined && body.squad !== null && typeof body.squad !== 'string') {
    return NextResponse.json({ error: 'Squad must be text' }, { status: 400 })
  }
  const fullName = body.fullName.trim()
  const requestedRole = body.role
  const normalizedEmail = email.trim().toLowerCase()
  const role = normalizedEmail.endsWith('@kalvium.com') ? 'mentor' : normalizedEmail.endsWith('@kalvium.community') ? 'student' : null
  const squad = typeof body?.squad === 'string' ? body.squad : null
  if (!fullName) return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
  if (fullName.length > 120) return NextResponse.json({ error: 'Full name must be 120 characters or fewer' }, { status: 400 })
  if (!role) return NextResponse.json({ error: 'Use a @kalvium.com mentor email or a @kalvium.community student email' }, { status: 403 })
  if (requestedRole !== role) return NextResponse.json({ error: 'Your email domain determines your account type' }, { status: 403 })
  if (role === 'student' && !squads.has(squad ?? '')) return NextResponse.json({ error: 'Choose squad 138, 139, or 183' }, { status: 400 })
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.from('profiles').upsert({ id: userId, full_name: fullName, email, role, squad: role === 'student' ? squad : null }, { onConflict: 'id' }).select('id, full_name, email, role, squad').single()
  if (error) {
    console.error('Unable to save profile', { code: error.code })
    return NextResponse.json({ error: 'Unable to save profile' }, { status: 500 })
  }
  return NextResponse.json({ profile: data })
}
