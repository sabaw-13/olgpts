-- OLGTPS Student Fees RLS Policies
-- Admin and Staff can view assessed fees.
-- Staff and Admin can assign assessed enrollment fees and update payment status.

alter table student_fees enable row level security;

drop policy if exists "Authenticated users can read student fees" on student_fees;
drop policy if exists "Active admin and staff can manage student fees" on student_fees;
drop policy if exists "Active admins can assign student fees" on student_fees;
drop policy if exists "Active admin and staff can update student fees" on student_fees;
drop policy if exists "Active admins can delete student fees" on student_fees;

create policy "Authenticated users can read student fees"
on student_fees
for select
to authenticated
using (
  exists (
    select 1
    from profiles
    where profiles.user_id = auth.uid()
      and profiles.role in ('admin', 'staff')
      and profiles.status = 'active'
  )
);

create policy "Active admins can assign student fees"
on student_fees
for insert
to authenticated
with check (
  exists (
    select 1
    from profiles
    where profiles.user_id = auth.uid()
      and profiles.role in ('admin', 'staff')
      and profiles.status = 'active'
  )
);

create policy "Active admin and staff can update student fees"
on student_fees
for update
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

create policy "Active admins can delete student fees"
on student_fees
for delete
to authenticated
using (
  exists (
    select 1
    from profiles
    where profiles.user_id = auth.uid()
      and profiles.role in ('admin', 'staff')
      and profiles.status = 'active'
  )
);
