import { NextResponse } from 'next/server'
import { getAuthenticatedRequest } from '@/lib/supabase/authenticated-request'

export async function GET(request: Request) {
  const { userId, email } = await getAuthenticatedRequest(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!email?.trim().toLowerCase().endsWith('@kalvium.com')) {
    return NextResponse.json({ error: 'Mentor access required' }, { status: 403 })
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: mentor, error: mentorError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (mentorError) {
    console.error('Unable to verify student directory access', { code: mentorError.code })
    return NextResponse.json({ error: 'Unable to verify access' }, { status: 500 })
  }
  if (mentor?.role !== 'mentor') {
    return NextResponse.json({ error: 'Mentor access required' }, { status: 403 })
  }

  const { data: students, error } = await admin
    .from('profiles')
    .select('id, full_name, squad, created_at')
    .eq('role', 'student')
    .order('squad', { ascending: true })
    .order('full_name', { ascending: true })
  if (error) {
    console.error('Unable to load registered student profiles', { code: error.code })
    return NextResponse.json({ error: 'Unable to load student accounts' }, { status: 500 })
  }

  return NextResponse.json({ students: students ?? [] })

}