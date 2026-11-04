create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.session_auto_end_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.session_auto_end_settings default values
on conflict (id) do nothing;

alter table public.session_auto_end_settings enable row level security;
revoke all on public.session_auto_end_settings from anon, authenticated;
grant select, update on public.session_auto_end_settings to service_role;

create or replace function public.auto_end_scheduled_sessions()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  local_now timestamp without time zone := statement_timestamp() at time zone 'Asia/Kolkata';
  cutoff_local timestamp without time zone;
begin
  if not exists (
    select 1
    from public.session_auto_end_settings
    where id and enabled
  ) then
    return;
  end if;

  select local_now::date + cutoffs.stop_time
  into cutoff_local
  from (values
    (time '08:50'),
    (time '09:40'),
    (time '10:45'),
    (time '11:35'),
    (time '12:25'),
    (time '14:00'),
    (time '14:50')
  ) as cutoffs(stop_time)
  where cutoffs.stop_time <= local_now::time
  order by cutoffs.stop_time desc
  limit 1;

  if cutoff_local is null then
    cutoff_local := (local_now::date - 1) + time '14:50';
  end if;

  update public.sessions
  set status = 'ended',
      ended_at = cutoff_local at time zone 'Asia/Kolkata'
  where status = 'active'
    and squad in ('138', '139')
    and started_at <= cutoff_local at time zone 'Asia/Kolkata';
end;
$$;

revoke all on function public.auto_end_scheduled_sessions() from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid from cron.job where jobname = 'auto-end-scheduled-sessions'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'auto-end-scheduled-sessions',
    '* * * * *',
    'select public.auto_end_scheduled_sessions();'
  );
end;
$$;