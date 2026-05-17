-- OLGTPS Row Level Security Policies
-- Run this in Supabase SQL Editor after the tables and first admin profile exist.
-- Do not use or expose the service role key in frontend code.

-- Helper functions
create or replace function public.get_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.get_user_role() = 'admin';
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.get_user_role() = 'staff';
$$;

create or replace function public.is_admin_or_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.get_user_role() in ('admin', 'staff');
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.school_years enable row level security;
alter table public.grade_levels enable row level security;
alter table public.sections enable row level security;
alter table public.enrollments enable row level security;
alter table public.fees enable row level security;
alter table public.student_fees enable row level security;
alter table public.payments enable row level security;
alter table public.payment_details enable row level security;

-- Remove old OLGTPS policies so this file can be safely rerun.
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Active admins can read all profiles" on public.profiles;
drop policy if exists "Active admins can insert profiles" on public.profiles;
drop policy if exists "Active admins can update profiles" on public.profiles;
drop policy if exists "Admins can delete profiles" on public.profiles;

drop policy if exists "Authenticated users can read school years" on public.school_years;
drop policy if exists "Admins can manage school years" on public.school_years;
drop policy if exists "Authenticated users can read grade levels" on public.grade_levels;
drop policy if exists "Admins can manage grade levels" on public.grade_levels;
drop policy if exists "Authenticated users can read sections" on public.sections;
drop policy if exists "Admins can manage sections" on public.sections;
drop policy if exists "Authenticated users can read fees" on public.fees;
drop policy if exists "Admins can manage fees" on public.fees;
drop policy if exists "Authenticated users can read student fees" on public.student_fees;
drop policy if exists "Active admin and staff can manage student fees" on public.student_fees;
drop policy if exists "Active admin and staff can read payments" on public.payments;
drop policy if exists "Active admin and staff can record payments" on public.payments;
drop policy if exists "Active admin and staff can read payment details" on public.payment_details;
drop policy if exists "Active admin and staff can record payment details" on public.payment_details;

drop policy if exists "Admin and staff can read students" on public.students;
drop policy if exists "Admin and staff can insert students" on public.students;
drop policy if exists "Admins can insert students" on public.students;
drop policy if exists "Admin and staff can update students" on public.students;
drop policy if exists "Admins can update students" on public.students;
drop policy if exists "Admins can delete students" on public.students;

drop policy if exists "Admin and staff can read school years" on public.school_years;
drop policy if exists "Admins can insert school years" on public.school_years;
drop policy if exists "Admins can update school years" on public.school_years;
drop policy if exists "Admins can delete school years" on public.school_years;

drop policy if exists "Admin and staff can read grade levels" on public.grade_levels;
drop policy if exists "Admins can insert grade levels" on public.grade_levels;
drop policy if exists "Admins can update grade levels" on public.grade_levels;
drop policy if exists "Admins can delete grade levels" on public.grade_levels;

drop policy if exists "Admin and staff can read sections" on public.sections;
drop policy if exists "Admins can insert sections" on public.sections;
drop policy if exists "Admins can update sections" on public.sections;
drop policy if exists "Admins can delete sections" on public.sections;

drop policy if exists "Admin and staff can read enrollments" on public.enrollments;
drop policy if exists "Admin and staff can insert enrollments" on public.enrollments;
drop policy if exists "Admins can insert enrollments" on public.enrollments;
drop policy if exists "Admin and staff can update enrollments" on public.enrollments;
drop policy if exists "Admins can update enrollments" on public.enrollments;
drop policy if exists "Admins can delete enrollments" on public.enrollments;

drop policy if exists "Admin and staff can read fees" on public.fees;
drop policy if exists "Admins can insert fees" on public.fees;
drop policy if exists "Admins can update fees" on public.fees;
drop policy if exists "Admins can delete fees" on public.fees;

drop policy if exists "Admin and staff can read student fees" on public.student_fees;
drop policy if exists "Admin and staff can insert student fees" on public.student_fees;
drop policy if exists "Admins can insert student fees" on public.student_fees;
drop policy if exists "Admin and staff can update student fees" on public.student_fees;
drop policy if exists "Admins can delete student fees" on public.student_fees;

drop policy if exists "Admin and staff can read payments" on public.payments;
drop policy if exists "Admin and staff can insert payments" on public.payments;
drop policy if exists "Admins can update payments" on public.payments;
drop policy if exists "Admins can delete payments" on public.payments;

drop policy if exists "Admin and staff can read payment details" on public.payment_details;
drop policy if exists "Admin and staff can insert payment details" on public.payment_details;
drop policy if exists "Admins can update payment details" on public.payment_details;
drop policy if exists "Admins can delete payment details" on public.payment_details;

-- Profiles
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "Active admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin_or_staff());

create policy "Active admins can insert profiles"
on public.profiles
for insert
to authenticated
with check (public.is_admin_or_staff());

create policy "Active admins can update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin_or_staff())
with check (public.is_admin_or_staff());

create policy "Admins can delete profiles"
on public.profiles
for delete
to authenticated
using (public.is_admin_or_staff());

-- Students
create policy "Admin and staff can read students"
on public.students
for select
to authenticated
using (public.is_admin_or_staff());

create policy "Admins can insert students"
on public.students
for insert
to authenticated
with check (public.is_admin_or_staff());

create policy "Admins can update students"
on public.students
for update
to authenticated
using (public.is_admin_or_staff())
with check (public.is_admin_or_staff());

create policy "Admins can delete students"
on public.students
for delete
to authenticated
using (public.is_admin_or_staff());

-- School Years
create policy "Admin and staff can read school years"
on public.school_years
for select
to authenticated
using (public.is_admin_or_staff());

create policy "Admins can insert school years"
on public.school_years
for insert
to authenticated
with check (public.is_admin_or_staff());

create policy "Admins can update school years"
on public.school_years
for update
to authenticated
using (public.is_admin_or_staff())
with check (public.is_admin_or_staff());

create policy "Admins can delete school years"
on public.school_years
for delete
to authenticated
using (public.is_admin_or_staff());

-- Grade Levels
create policy "Admin and staff can read grade levels"
on public.grade_levels
for select
to authenticated
using (public.is_admin_or_staff());

create policy "Admins can insert grade levels"
on public.grade_levels
for insert
to authenticated
with check (public.is_admin_or_staff());

create policy "Admins can update grade levels"
on public.grade_levels
for update
to authenticated
using (public.is_admin_or_staff())
with check (public.is_admin_or_staff());

create policy "Admins can delete grade levels"
on public.grade_levels
for delete
to authenticated
using (public.is_admin_or_staff());

-- Sections
create policy "Admin and staff can read sections"
on public.sections
for select
to authenticated
using (public.is_admin_or_staff());

create policy "Admins can insert sections"
on public.sections
for insert
to authenticated
with check (public.is_admin_or_staff());

create policy "Admins can update sections"
on public.sections
for update
to authenticated
using (public.is_admin_or_staff())
with check (public.is_admin_or_staff());

create policy "Admins can delete sections"
on public.sections
for delete
to authenticated
using (public.is_admin_or_staff());

-- Enrollments
create policy "Admin and staff can read enrollments"
on public.enrollments
for select
to authenticated
using (public.is_admin_or_staff());

create policy "Admins can insert enrollments"
on public.enrollments
for insert
to authenticated
with check (public.is_admin_or_staff());

create policy "Admins can update enrollments"
on public.enrollments
for update
to authenticated
using (public.is_admin_or_staff())
with check (public.is_admin_or_staff());

create policy "Admins can delete enrollments"
on public.enrollments
for delete
to authenticated
using (public.is_admin_or_staff());

-- Fees
create policy "Admin and staff can read fees"
on public.fees
for select
to authenticated
using (public.is_admin_or_staff());

create policy "Admins can insert fees"
on public.fees
for insert
to authenticated
with check (public.is_admin_or_staff());

create policy "Admins can update fees"
on public.fees
for update
to authenticated
using (public.is_admin_or_staff())
with check (public.is_admin_or_staff());

create policy "Admins can delete fees"
on public.fees
for delete
to authenticated
using (public.is_admin_or_staff());

-- Student Fees
create policy "Admin and staff can read student fees"
on public.student_fees
for select
to authenticated
using (public.is_admin_or_staff());

create policy "Admins can insert student fees"
on public.student_fees
for insert
to authenticated
with check (public.is_admin_or_staff());

create policy "Admin and staff can update student fees"
on public.student_fees
for update
to authenticated
using (public.is_admin_or_staff())
with check (public.is_admin_or_staff());

create policy "Admins can delete student fees"
on public.student_fees
for delete
to authenticated
using (public.is_admin_or_staff());

-- Payments
create policy "Admin and staff can read payments"
on public.payments
for select
to authenticated
using (public.is_admin_or_staff());

create policy "Admin and staff can insert payments"
on public.payments
for insert
to authenticated
with check (
  public.is_admin_or_staff()
  and exists (
    select 1
    from public.profiles
    where profiles.id = received_by
      and profiles.user_id = auth.uid()
      and profiles.status = 'active'
  )
);

create policy "Admins can update payments"
on public.payments
for update
to authenticated
using (public.is_admin_or_staff())
with check (public.is_admin_or_staff());

create policy "Admins can delete payments"
on public.payments
for delete
to authenticated
using (public.is_admin_or_staff());

-- Payment Details
create policy "Admin and staff can read payment details"
on public.payment_details
for select
to authenticated
using (public.is_admin_or_staff());

create policy "Admin and staff can insert payment details"
on public.payment_details
for insert
to authenticated
with check (public.is_admin_or_staff());

create policy "Admins can update payment details"
on public.payment_details
for update
to authenticated
using (public.is_admin_or_staff())
with check (public.is_admin_or_staff());

create policy "Admins can delete payment details"
on public.payment_details
for delete
to authenticated
using (public.is_admin_or_staff());
