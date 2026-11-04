import { NextResponse } from 'next/server'
import { getAuthenticatedRequest } from '@/lib/supabase/authenticated-request'

function automationErrorMessage(code: string | undefined) {
  if (code === 'PGRST205' || code === '42P01') {
    return 'Session auto-end is not installed. Apply migration 20261105000100_auto_end_scheduled_sessions.sql to Supabase.'
  }
  return 'Unable to load session automation setting'
}

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
    console.error('Unable to verify session automation access', { code: profileError.code })
    return NextResponse.json({ error: 'Unable to verify mentor access' }, { status: 500 })
  }
  if (profile?.role !== 'mentor') return NextResponse.json({ error: 'Only mentors can view session automation settings' }, { status: 403 })

  const { data, error } = await admin
    .from('session_auto_end_settings')
    .select('enabled')
    .eq('id', true)
    .single()
  if (error) {
    console.error('Unable to load session automation setting', { code: error.code })
    return NextResponse.json({ error: automationErrorMessage(error.code) }, { status: error.code === 'PGRST205' || error.code === '42P01' ? 503 : 500 })
  }
  return NextResponse.json({ enabled: data.enabled })
}

export async function PATCH(request: Request) {
  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || typeof payload.enabled !== 'boolean') {
    return NextResponse.json({ error: 'Choose whether automatic session ending is enabled' }, { status: 400 })
  }

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
    console.error('Unable to verify session automation access', { code: profileError.code })
    return NextResponse.json({ error: 'Unable to verify mentor access' }, { status: 500 })
  }
  if (profile?.role !== 'mentor') return NextResponse.json({ error: 'Only mentors can change session automation settings' }, { status: 403 })

  const { data, error } = await admin
    .from('session_auto_end_settings')
    .update({ enabled: payload.enabled, updated_at: new Date().toISOString(), updated_by: userId })
    .eq('id', true)
    .select('enabled')
    .single()
  if (error) {
    console.error('Unable to update session automation setting', { code: error.code })
    return NextResponse.json({ error: automationErrorMessage(error.code) }, { status: error.code === 'PGRST205' || error.code === '42P01' ? 503 : 500 })
  }
  return NextResponse.json({ enabled: data.enabled })
}