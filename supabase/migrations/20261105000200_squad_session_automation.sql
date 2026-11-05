create table if not exists public.session_automation_schedules (
  id uuid primary key default gen_random_uuid(),
  squad text not null check (squad in ('138', '139', '183')),
  start_time time not null,
  stop_time time not null,
  enabled boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete cascade,
  last_started_on date,
  last_ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_automation_schedule_order check (start_time < stop_time)
);

alter table public.sessions
  add column if not exists automation_schedule_id uuid references public.session_automation_schedules(id) on delete set null;

create index if not exists session_automation_schedules_squad_idx
  on public.session_automation_schedules (squad, start_time);

alter table public.session_automation_schedules enable row level security;
revoke all on public.session_automation_schedules from anon, authenticated;
grant select, insert, update, delete on public.session_automation_schedules to service_role;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid from cron.job where jobname = 'auto-end-scheduled-sessions'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;
end;
$$;

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
  stop_local timestamp without time zone;
begin
  if not exists (
    select 1
    from public.session_auto_end_settings
    where id and enabled
  ) then
    return;
  end if;

  if not pg_try_advisory_xact_lock(hashtext('phosub-session-automation')) then
    return;
  end if;

  for schedule_record in
    select *
    from public.session_automation_schedules
    where enabled
    order by squad, start_time
    for update
  loop
    start_local := local_now::date + schedule_record.start_time;
    stop_local := local_now::date + schedule_record.stop_time;

    if local_now >= stop_local and (schedule_record.last_ended_on is null or schedule_record.last_ended_on < local_now::date) then
      update public.sessions
      set status = 'ended',
          ended_at = stop_local at time zone 'Asia/Kolkata'
      where status = 'active'
        and squad = schedule_record.squad
        and started_at < stop_local at time zone 'Asia/Kolkata';

      update public.session_automation_schedules
      set last_ended_on = local_now::date,
          updated_at = now()
      where id = schedule_record.id;
    end if;
  end loop;

  for schedule_record in
    select *
    from public.session_automation_schedules
    where enabled
    order by squad, start_time
    for update
  loop
    start_local := local_now::date + schedule_record.start_time;
    stop_local := local_now::date + schedule_record.stop_time;

    if local_now >= start_local
      and local_now < stop_local
      and (schedule_record.last_started_on is null or schedule_record.last_started_on < local_now::date)
      and not exists (
        select 1 from public.sessions where squad = schedule_record.squad and status = 'active'
      ) then
      insert into public.sessions (mentor_id, squad, name, started_at, automation_schedule_id)
      values (
        schedule_record.created_by,
        schedule_record.squad,
        'Squad ' || schedule_record.squad || ' automated phone handover',
        start_local at time zone 'Asia/Kolkata',
        schedule_record.id
      );

      update public.session_automation_schedules
      set last_started_on = local_now::date,
          updated_at = now()
      where id = schedule_record.id;
    end if;
  end loop;
end;
$$;

revoke all on function public.auto_end_scheduled_sessions() from public, anon, authenticated;

select cron.schedule(
  'auto-end-scheduled-sessions',
  '* * * * *',
  'select public.auto_end_scheduled_sessions();'
)
where not exists (
  select 1 from cron.job where jobname = 'auto-end-scheduled-sessions'
);
