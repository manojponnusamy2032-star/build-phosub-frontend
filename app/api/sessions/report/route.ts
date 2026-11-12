import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { getAuthenticatedRequest } from '@/lib/supabase/authenticated-request'

export async function GET(request: Request) {
  const { userId } = await getAuthenticatedRequest(request)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const sessionId = new URL(request.url).searchParams.get('session_id')
  if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return NextResponse.json({ error: 'A valid session id is required' }, { status: 400 })
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) {
    console.error('Unable to verify report access', { code: profileError.code })
    return NextResponse.json({ error: 'Unable to verify mentor access' }, { status: 500 })
  }
  if (profile?.role !== 'mentor') return NextResponse.json({ error: 'Only mentors can download session reports' }, { status: 403 })

  const { data: session, error: sessionError } = await admin
    .from('sessions')
    .select('id, squad, name, status, started_at, ended_at')
    .eq('id', sessionId)
    .maybeSingle()
  if (sessionError) {
    console.error('Unable to load session for report export', { code: sessionError.code })
    return NextResponse.json({ error: 'Unable to load session' }, { status: 500 })
  }
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'ended') {
    return NextResponse.json({ error: 'End the session before downloading its report' }, { status: 409 })
  }

  const [studentsResult, handoversResult, eventsResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student')
      .eq('squad', session.squad)
      .order('full_name', { ascending: true }),
    admin
      .from('handovers')
      .select('id, student_id, status, phone_model, reason, updated_at')
      .eq('session_id', session.id),
    admin
      .from('handover_events')
      .select('id, student_id, status, reason, changed_by, changed_at')
      .eq('session_id', session.id)
      .order('changed_at', { ascending: true }),
  ])

  if (studentsResult.error || handoversResult.error || eventsResult.error) {
    const error = studentsResult.error || handoversResult.error || eventsResult.error
    console.error('Unable to load session report data', { code: error?.code })
    return NextResponse.json({ error: 'Unable to load session report data' }, { status: 500 })
  }

  const students = studentsResult.data ?? []
  const handovers = handoversResult.data ?? []
  const events = eventsResult.data ?? []
  const studentNames = new Map(students.map((student) => [student.id, student.full_name]))
  const handoversByStudent = new Map(handovers.map((handover) => [handover.student_id, handover]))
  const eventsByStudent = new Map<string, typeof events>()
  for (const event of events) {
    const history = eventsByStudent.get(event.student_id) ?? []
    history.push(event)
    eventsByStudent.set(event.student_id, history)
  }

  const actorIds = [...new Set(events.map((event) => event.changed_by))]
  const { data: actors, error: actorsError } = actorIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', actorIds)
    : { data: [], error: null }
  if (actorsError) {
    console.error('Unable to load session report actors', { code: actorsError.code })
    return NextResponse.json({ error: 'Unable to load session report data' }, { status: 500 })
  }
  const actorNames = new Map((actors ?? []).map((actor) => [actor.id, actor.full_name]))

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Phosub'
  workbook.created = new Date()

  const summary = workbook.addWorksheet('Student Summary')
  summary.columns = [
    { header: 'Student', key: 'student', width: 30 },
    { header: 'Squad', key: 'squad', width: 12 },
    { header: 'Final Status', key: 'status', width: 20 },
    { header: 'Phone Model', key: 'phoneModel', width: 24 },
    { header: 'Reason', key: 'reason', width: 42 },
    { header: 'Last Updated', key: 'updatedAt', width: 24 },
    { header: 'Status Timeline', key: 'timeline', width: 70 },
  ]
  summary.addRows(students.map((student) => {
    const handover = handoversByStudent.get(student.id)
    const timeline = (eventsByStudent.get(student.id) ?? []).map((event) => {
      const reason = event.reason ? `: ${event.reason}` : ''
      return `${event.status.replaceAll('_', ' ')} (${new Date(event.changed_at).toISOString()})${reason}`
    })
    return {
      student: student.full_name,
      squad: session.squad,
      status: handover?.status.replaceAll('_', ' ') ?? 'not responded',
      phoneModel: handover?.phone_model ?? '',
      reason: handover?.reason ?? '',
      updatedAt: handover?.updated_at ? new Date(handover.updated_at) : '',
      timeline: timeline.join(' -> '),
    }
  }))

  const history = workbook.addWorksheet('Status History')
  history.columns = [
    { header: 'Student', key: 'student', width: 30 },
    { header: 'Squad', key: 'squad', width: 12 },
    { header: 'Status', key: 'status', width: 20 },
    { header: 'Reason', key: 'reason', width: 42 },
    { header: 'Changed By', key: 'changedBy', width: 30 },
    { header: 'Changed At', key: 'changedAt', width: 24 },
  ]
  history.addRows(events.map((event) => ({
    student: studentNames.get(event.student_id) ?? 'Student',
    squad: session.squad,
    status: event.status.replaceAll('_', ' '),
    reason: event.reason ?? '',
    changedBy: actorNames.get(event.changed_by) ?? 'Unknown',
    changedAt: new Date(event.changed_at),
  })))

  for (const sheet of [summary, history]) {
    sheet.getRow(1).font = { bold: true }
    sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + sheet.columnCount)}1` }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value instanceof Date) cell.numFmt = 'yyyy-mm-dd hh:mm:ss'
      })
    })
  }

  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer())
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="squad-${session.squad}-handover-report.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}