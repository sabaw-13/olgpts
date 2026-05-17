-- OLGTPS Profiles Admin Policies
-- Run this after your first admin profile exists and can log in.
-- It lets active admin and staff users view and manage profiles while users can still read their own profile.

alter table profiles enable row level security;

drop policy if exists "Users can read their own profile" on profiles;
drop policy if exists "Active admins can read all profiles" on profiles;
drop policy if exists "Active admins can insert profiles" on profiles;
drop policy if exists "Active admins can update profiles" on profiles;

create policy "Users can read their own profile"
on profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Active admins can read all profiles"
on profiles
for select
to authenticated
using (
  exists (
    select 1
    from profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role in ('admin', 'staff')
      and admin_profile.status = 'active'
  )
);

create policy "Active admins can insert profiles"
on profiles
for insert
to authenticated
with check (
  exists (
    select 1
    from profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role in ('admin', 'staff')
      and admin_profile.status = 'active'
  )
);

create policy "Active admins can update profiles"
on profiles
for update
to authenticated
using (
  exists (
    select 1
    from profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role in ('admin', 'staff')
      and admin_profile.status = 'active'
  )
)
with check (
  exists (
    select 1
    from profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role in ('admin', 'staff')
      and admin_profile.status = 'active'
  )
);
