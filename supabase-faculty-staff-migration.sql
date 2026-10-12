-- OLGTPS Faculty and Staff directory
-- Run in Supabase SQL Editor. Stores the school's teachers and non-teaching staff.
-- These are personnel records, separate from the login accounts in the profiles table.

create table if not exists public.faculty_staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  staff_type text not null default 'teaching' check (staff_type in ('teaching', 'non_teaching')),
  position text,
  advisory_section_id uuid references public.sections(id) on delete set null,
  contact_number text,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default now()
);

-- A section has at most one active adviser.
create unique index if not exists faculty_staff_one_adviser_per_section
  on public.faculty_staff (advisory_section_id)
  where advisory_section_id is not null and status = 'active';

alter table public.faculty_staff enable row level security;

drop policy if exists "Authenticated users can read faculty and staff" on public.faculty_staff;
drop policy if exists "Staff can manage faculty and staff" on public.faculty_staff;

create policy "Authenticated users can read faculty and staff"
on public.faculty_staff
for select
to authenticated
using (true);

create policy "Staff can manage faculty and staff"
on public.faculty_staff
for all
to authenticated
using (
  exists (
    select 1
    from profiles
    where profiles.user_id = auth.uid()
      and profiles.role in ('admin', 'staff')
      and profiles.status = 'active'
  )
)
with check (
  exists (
    select 1
    from profiles
    where profiles.user_id = auth.uid()
      and profiles.role in ('admin', 'staff')
      and profiles.status = 'active'
  )
);
