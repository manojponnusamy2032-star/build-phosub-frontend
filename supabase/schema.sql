create table if not exists public.handovers (
  student_id text primary key,
  status text not null check (status in ('pending', 'submitted', 'retrieved', 'not_submitted')),
  reason text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.handovers enable row level security;

create policy "Authenticated users can read handovers"
  on public.handovers for select to authenticated using (true);

create policy "Authenticated users can create handovers"
  on public.handovers for insert to authenticated with check (true);

create policy "Authenticated users can update handovers"
  on public.handovers for update to authenticated using (true) with check (true);

grant select, insert, update on public.handovers to authenticated;
