create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('student', 'mentor')),
  squad text check (squad in ('138', '139', '183')),
  email text not null,
  created_at timestamptz not null default now(),
  constraint mentor_has_no_squad check (role = 'student' or squad is null),
  constraint student_has_squad check (role = 'mentor' or squad is not null)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  squad text not null check (squad in ('138', '139', '183')),
  name text not null default 'Phone handover',
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.handovers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'retrieved', 'not_submitted')),
  reason text,
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.handovers enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "mentors can view squad students" on public.profiles for select to authenticated using (
  role = 'student' and exists (
    select 1 from public.profiles mentor where mentor.id = (select auth.uid()) and mentor.role = 'mentor'
  )
);
create policy "users create own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "users update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "mentors manage own sessions" on public.sessions for all to authenticated using (mentor_id = (select auth.uid())) with check (mentor_id = (select auth.uid()));
create policy "students view active squad sessions" on public.sessions for select to authenticated using (
  status = 'active' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student' and p.squad = sessions.squad)
);

create policy "students manage own handover" on public.handovers for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy "mentors view squad handovers" on public.handovers for select to authenticated using (
  exists (
    select 1 from public.sessions s join public.profiles p on p.id = (select auth.uid())
    where s.id = handovers.session_id and s.mentor_id = (select auth.uid())
  )
);
create policy "mentors update squad handovers" on public.handovers for update to authenticated using (
  exists (select 1 from public.sessions s where s.id = handovers.session_id and s.mentor_id = (select auth.uid()))
) with check (updated_by = (select auth.uid()));

grant select, insert, update on public.profiles, public.sessions, public.handovers to authenticated;
