-- OLGTPS School Setup RLS Policies
-- Optional but recommended. Run in Supabase SQL Editor after profiles auth is working.
-- Staff and Admin can view, add, edit, and deactivate setup records.

alter table school_years enable row level security;
alter table grade_levels enable row level security;
alter table sections enable row level security;

drop policy if exists "Authenticated users can read school years" on school_years;
drop policy if exists "Admins can manage school years" on school_years;
drop policy if exists "Authenticated users can read grade levels" on grade_levels;
drop policy if exists "Admins can manage grade levels" on grade_levels;
drop policy if exists "Authenticated users can read sections" on sections;
drop policy if exists "Admins can manage sections" on sections;

create policy "Authenticated users can read school years"
on school_years
for select
to authenticated
using (true);

create policy "Admins can manage school years"
on school_years
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

create policy "Authenticated users can read grade levels"
on grade_levels
for select
to authenticated
using (true);

create policy "Admins can manage grade levels"
on grade_levels
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

create policy "Authenticated users can read sections"
on sections
for select
to authenticated
using (true);

create policy "Admins can manage sections"
on sections
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
