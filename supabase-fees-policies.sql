-- OLGTPS Fees RLS Policies
-- Staff and Admin can view and manage the enrollment fee.

alter table fees enable row level security;

drop policy if exists "Authenticated users can read fees" on fees;
drop policy if exists "Admins can manage fees" on fees;

create policy "Authenticated users can read fees"
on fees
for select
to authenticated
using (true);

create policy "Admins can manage fees"
on fees
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
