-- OLGTPS Payments RLS Policies
-- Admin and Staff can view and record payments.
-- Receipt printing and stricter audit rules can be added later.

alter table payments enable row level security;
alter table payment_details enable row level security;

drop policy if exists "Active admin and staff can read payments" on payments;
drop policy if exists "Active admin and staff can record payments" on payments;
drop policy if exists "Active admin and staff can read payment details" on payment_details;
drop policy if exists "Active admin and staff can record payment details" on payment_details;

create policy "Active admin and staff can read payments"
on payments
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

create policy "Active admin and staff can record payments"
on payments
for insert
to authenticated
with check (
  exists (
    select 1
    from profiles
    where profiles.user_id = auth.uid()
      and profiles.id = received_by
      and profiles.role in ('admin', 'staff')
      and profiles.status = 'active'
  )
);

create policy "Active admin and staff can read payment details"
on payment_details
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

create policy "Active admin and staff can record payment details"
on payment_details
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
