import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const squads = new Set(['138', '139', '183'])

export async function GET() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const { data, error } = await supabase.from('profiles').select('id, full_name, email, role, squad').eq('id', userId).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  return NextResponse.json({ profile: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  const email = claims?.claims?.email
  if (!userId || typeof email !== 'string') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''
  const requestedRole = body?.role === 'mentor' ? 'mentor' : 'student'
  const role = email.toLowerCase().endsWith('@kalvium.com') ? 'mentor' : 'student'
  const squad = typeof body?.squad === 'string' ? body.squad : null
  if (!fullName) return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
  if (requestedRole !== role) return NextResponse.json({ error: 'Your email domain determines your account type' }, { status: 403 })
  if (role === 'student' && !squads.has(squad ?? '')) return NextResponse.json({ error: 'Choose squad 138, 139, or 183' }, { status: 400 })
  const { data, error } = await supabase.from('profiles').upsert({ id: userId, full_name: fullName, email, role, squad: role === 'student' ? squad : null }, { onConflict: 'id' }).select('id, full_name, email, role, squad').single()
  if (error) return NextResponse.json({ error: 'Unable to save profile' }, { status: 500 })
  return NextResponse.json({ profile: data })
}
