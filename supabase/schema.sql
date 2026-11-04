create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('student', 'mentor')),
  squad text check (squad in ('138', '139', '183')),
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint mentor_has_no_squad check (role = 'student' or squad is null),
  constraint student_has_squad check (role = 'mentor' or squad is not null)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  squad text not null check (squad in ('138', '139', '183')),
  name text not null default 'Phone handover',
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint ended_session_has_end_time check ((status = 'active' and ended_at is null) or (status = 'ended' and ended_at is not null))
);

create or replace function public.validate_session_mentor()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = new.mentor_id and role = 'mentor') then
    raise exception 'Session owner must be a mentor';
  end if;
  return new;
end;
$$;

drop trigger if exists session_mentor_guard on public.sessions;
create trigger session_mentor_guard before insert or update of mentor_id on public.sessions
for each row execute function public.validate_session_mentor();

create unique index if not exists one_active_session_per_squad on public.sessions (squad) where status = 'active';

create table if not exists public.handovers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'retrieved', 'not_submitted')),
  reason text,
  phone_model text,
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id),
  constraint handovers_phone_model_length_check check (phone_model is null or char_length(btrim(phone_model)) between 1 and 100),
  constraint handovers_submitted_requires_phone_model_check check (status <> 'submitted' or phone_model is not null)
);

create table if not exists public.handover_events (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references public.handovers(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'submitted', 'retrieved', 'not_submitted')),
  reason text,
  changed_by uuid not null references public.profiles(id),
  changed_at timestamptz not null default now()
);

create or replace function public.record_handover_event()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  insert into public.handover_events (handover_id, session_id, student_id, status, reason, changed_by)
  values (new.id, new.session_id, new.student_id, new.status, new.reason, new.updated_by);
  return new;
end;
$$;

drop trigger if exists handover_event_after_change on public.handovers;
create trigger handover_event_after_change after insert or update of status, reason on public.handovers
for each row execute function public.record_handover_event();

create or replace function public.validate_profile_identity()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if new.id <> old.id or lower(new.email) <> lower(old.email) or new.role <> old.role then
    raise exception 'Profile identity and role are immutable';
  end if;
  if new.role = 'mentor' and new.squad is not null then
    raise exception 'Mentors cannot belong to a student squad';
  end if;
  if new.role = 'student' and new.squad not in ('138', '139', '183') then
    raise exception 'Students must belong to squad 138, 139, or 183';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_identity_guard on public.profiles;
create trigger profile_identity_guard before update on public.profiles
for each row execute function public.validate_profile_identity();

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.handovers enable row level security;
alter table public.handover_events enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "mentors can view squad students" on public.profiles;
create policy "mentors can view session students" on public.profiles for select to authenticated using (role = 'student' and exists (select 1 from public.profiles mentor join public.sessions s on s.mentor_id = mentor.id where mentor.id = (select auth.uid()) and mentor.role = 'mentor' and s.squad = profiles.squad));
drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "mentors manage own sessions" on public.sessions;
create policy "mentors manage own sessions" on public.sessions for all to authenticated using (mentor_id = (select auth.uid())) with check (mentor_id = (select auth.uid()));
drop policy if exists "students view active squad sessions" on public.sessions;
create policy "students view active squad sessions" on public.sessions for select to authenticated using (status = 'active' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student' and p.squad = sessions.squad));

drop policy if exists "students manage own handover" on public.handovers;
create policy "students manage own active handover" on public.handovers for insert to authenticated with check (student_id = (select auth.uid()) and exists (select 1 from public.sessions s join public.profiles p on p.id = (select auth.uid()) where s.id = session_id and s.status = 'active' and p.role = 'student' and p.squad = s.squad));
create policy "students update own active handover" on public.handovers for update to authenticated using (student_id = (select auth.uid()) and exists (select 1 from public.sessions s where s.id = session_id and s.status = 'active')) with check (student_id = (select auth.uid()) and exists (select 1 from public.sessions s where s.id = session_id and s.status = 'active'));
create policy "students view own handover" on public.handovers for select to authenticated using (student_id = (select auth.uid()));
drop policy if exists "mentors view squad handovers" on public.handovers;
create policy "mentors view own session handovers" on public.handovers for select to authenticated using (exists (select 1 from public.sessions s where s.id = handovers.session_id and s.mentor_id = (select auth.uid())));

drop policy if exists "mentors update squad handovers" on public.handovers;
create policy "mentors update own session handovers" on public.handovers for update to authenticated using (exists (select 1 from public.sessions s where s.id = handovers.session_id and s.mentor_id = (select auth.uid()))) with check (updated_by = (select auth.uid()));

create policy "students view own events" on public.handover_events for select to authenticated using (student_id = (select auth.uid()));
create policy "mentors view own session events" on public.handover_events for select to authenticated using (exists (select 1 from public.sessions s where s.id = handover_events.session_id and s.mentor_id = (select auth.uid())));

grant select, insert, update on public.profiles, public.sessions, public.handovers, public.handover_events to authenticated;

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
