import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const allowedStatuses = new Set(['pending', 'submitted', 'retrieved', 'not_submitted'])

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('handovers').select('id:student_id, student_id, status, reason, updated_at').order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Unable to load handovers' }, { status: 500 })
  return NextResponse.json({ handovers: data ?? [] })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.studentId !== 'string' || !allowedStatuses.has(body.status)) {
    return NextResponse.json({ error: 'Invalid handover payload' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub ?? null

  const { error } = await supabase.from('handovers').upsert({
    student_id: body.studentId,
    status: body.status,
    reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : null,
    updated_by: userId,
  }, { onConflict: 'student_id' })

  if (error) {
    return NextResponse.json({ error: 'Unable to save handover status' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
