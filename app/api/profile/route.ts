import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const squads = new Set(['138', '139', '183'])

async function getAuth(supabase: Awaited<ReturnType<typeof createClient>>, request: Request) {
  // Try Bearer token first (for client-side requests that pass the access token)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: claims, error } = await supabase.auth.getClaims(token)
    if (!error && claims?.claims?.sub) {
      return { userId: claims.claims.sub, email: claims.claims.email as string | undefined }
    }
  }
  // Fall back to cookies
  const { data: claims } = await supabase.auth.getClaims()
  return { userId: claims?.claims?.sub, email: claims?.claims?.email as string | undefined }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { userId } = await getAuth(supabase, request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data, error } = await admin.from('profiles').select('id, full_name, email, role, squad').eq('id', userId).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  return NextResponse.json({ profile: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { userId, email } = await getAuth(supabase, request)
  if (!userId || typeof email !== 'string') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  // Use admin client for upsert (bypasses RLS) since we've already verified the user
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  const body = await request.json().catch(() => null)
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''
  const requestedRole = body?.role === 'mentor' ? 'mentor' : 'student'
  const normalizedEmail = email.trim().toLowerCase()
  const role = normalizedEmail.endsWith('@kalvium.com') ? 'mentor' : normalizedEmail.endsWith('@kalvium.community') ? 'student' : null
  const squad = typeof body?.squad === 'string' ? body.squad : null
  if (!fullName) return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
  if (!role) return NextResponse.json({ error: 'Use a @kalvium.com mentor email or a @kalvium.community student email' }, { status: 403 })
  if (requestedRole !== role) return NextResponse.json({ error: 'Your email domain determines your account type' }, { status: 403 })
  if (role === 'student' && !squads.has(squad ?? '')) return NextResponse.json({ error: 'Choose squad 138, 139, or 183' }, { status: 400 })
  const { data, error } = await adminClient.from('profiles').upsert({ id: userId, full_name: fullName, email, role, squad: role === 'student' ? squad : null }, { onConflict: 'id' }).select('id, full_name, email, role, squad').single()
  if (error) return NextResponse.json({ error: 'Unable to save profile' }, { status: 500 })
  return NextResponse.json({ profile: data })
}
