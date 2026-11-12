create or replace function public.auto_end_scheduled_sessions()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  local_now timestamp without time zone := statement_timestamp() at time zone 'Asia/Kolkata';
  schedule_record record;
  start_local timestamp without time zone;
  schedule_applies boolean;
begin
  if not pg_try_advisory_xact_lock(hashtext('phosub-session-automation')) then
    return;
  end if;

  for schedule_record in
    select * from public.session_automation_schedules
    order by squad, start_time
    for update
  loop
    update public.sessions as scheduled_session
    set status = 'ended',
        ended_at = (
          (scheduled_session.started_at at time zone 'Asia/Kolkata')::date
          + schedule_record.stop_time
        ) at time zone 'Asia/Kolkata'
    where scheduled_session.status = 'active'
      and scheduled_session.automation_schedule_id = schedule_record.id
      and local_now >= (
        (scheduled_session.started_at at time zone 'Asia/Kolkata')::date
        + schedule_record.stop_time
      );
  end loop;

  for schedule_record in
    select * from public.session_automation_schedules
    where enabled
    order by squad, start_time
    for update
  loop
    schedule_applies := schedule_record.recurrence = 'daily'
      or (schedule_record.recurrence = 'today' and schedule_record.run_date = local_now::date)
      or (schedule_record.recurrence = 'selected' and extract(dow from local_now)::integer = any(schedule_record.selected_days));

    if not schedule_applies then
      continue;
    end if;

    start_local := local_now::date + schedule_record.start_time;

    if local_now >= start_local
      and local_now < local_now::date + schedule_record.stop_time
      and (schedule_record.last_started_on is null or schedule_record.last_started_on < local_now::date)
      and not exists (select 1 from public.sessions where squad = schedule_record.squad and status = 'active') then
      insert into public.sessions (mentor_id, squad, name, started_at, automation_schedule_id)
      values (
        schedule_record.created_by,
        schedule_record.squad,
        'Squad ' || schedule_record.squad || ' automated phone handover',
        start_local at time zone 'Asia/Kolkata',
        schedule_record.id
      );

      update public.session_automation_schedules
      set last_started_on = local_now::date, updated_at = now()
      where id = schedule_record.id;
    end if;
  end loop;
end;
$$;

revoke all on function public.auto_end_scheduled_sessions() from public, anon, authenticated;