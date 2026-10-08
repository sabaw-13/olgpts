-- Run AFTER supabase-schema.sql and supabase-rls-policies.sql.
-- All changes are transactional. Existing invalid/duplicate data aborts the migration
-- without deleting or rewriting historical records. See README for preflight queries.
begin;

create unique index if not exists profiles_one_per_user on public.profiles(user_id);
create unique index if not exists enrollments_one_per_school_year
  on public.enrollments(student_id, school_year_id);
create unique index if not exists payment_details_one_per_fee
  on public.payment_details(payment_id, fee_id);

alter table public.profiles
  alter column user_id set not null,
  alter column role set not null,
  alter column status set not null;
alter table public.enrollments
  alter column student_id set not null,
  alter column school_year_id set not null,
  alter column enrollment_status set not null,
  alter column enrollment_date set not null;
alter table public.fees
  alter column amount set not null,
  alter column school_year_id set not null;
alter table public.student_fees
  alter column student_id set not null,
  alter column enrollment_id set not null,
  alter column fee_id set not null,
  alter column amount set not null,
  alter column status set not null;
alter table public.payments
  alter column student_id set not null,
  alter column enrollment_id set not null,
  alter column payment_amount set not null,
  alter column receipt_number set not null,
  alter column received_by set not null,
  alter column payment_date set not null;
alter table public.payment_details
  alter column payment_id set not null,
  alter column fee_id set not null,
  alter column amount_paid set not null;

-- Drop only constraints owned by this migration so it can be safely rerun.
alter table public.fees drop constraint if exists fees_valid_amount;
alter table public.fees add constraint fees_valid_amount
  check (amount >= 0 and amount < 'Infinity'::numeric and scale(amount) <= 2);
alter table public.student_fees drop constraint if exists student_fees_valid_amount;
alter table public.student_fees add constraint student_fees_valid_amount
  check (amount >= 0 and amount < 'Infinity'::numeric and scale(amount) <= 2);
alter table public.payments drop constraint if exists payments_valid_amount;
alter table public.payments add constraint payments_valid_amount
  check (payment_amount > 0 and payment_amount < 'Infinity'::numeric and scale(payment_amount) <= 2);
alter table public.payment_details drop constraint if exists payment_details_valid_amount;
alter table public.payment_details add constraint payment_details_valid_amount
  check (amount_paid > 0 and amount_paid < 'Infinity'::numeric and scale(amount_paid) <= 2);

alter table public.payments add column if not exists request_id uuid;
alter table public.payments add column if not exists request_payload jsonb;
create unique index if not exists payments_request_id_unique on public.payments(request_id);

-- Use triggers for cross-table checks rather than extra foreign keys, preserving
-- the unambiguous PostgREST relationships used by existing nested selects.
create or replace function public.validate_enrollment_integrity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.section_id is not null and not exists (
    select 1 from public.sections s
    where s.id = new.section_id and s.grade_level_id = new.grade_level_id
  ) then
    raise exception 'The section must belong to the selected grade level.';
  end if;
  if tg_op = 'UPDATE' and exists (
    select 1 from public.student_fees sf join public.fees f on f.id = sf.fee_id
    where sf.enrollment_id = old.id and (
      sf.student_id <> new.student_id or f.school_year_id <> new.school_year_id
      or (f.grade_level_id is not null and f.grade_level_id is distinct from new.grade_level_id)
    )
  ) then
    raise exception 'Enrollment changes conflict with assessed fees. Keep the original student, year and applicable grade.';
  end if;
  if tg_op = 'UPDATE' and exists (
    select 1 from public.payments p where p.enrollment_id = old.id
  ) and (new.student_id is distinct from old.student_id
    or new.school_year_id is distinct from old.school_year_id) then
    raise exception 'An enrollment with payments cannot be reassigned.';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_enrollment_integrity on public.enrollments;
create trigger validate_enrollment_integrity before insert or update on public.enrollments
for each row execute function public.validate_enrollment_integrity();

create or replace function public.validate_student_fee_integrity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare paid_amount numeric;
begin
  if tg_op in ('UPDATE', 'DELETE') and exists (
    select 1 from public.payment_details d join public.payments p on p.id = d.payment_id
    where p.enrollment_id = old.enrollment_id and d.fee_id = old.fee_id
  ) then
    if tg_op = 'DELETE' then
      raise exception 'An assessed fee with payments cannot be deleted.';
    end if;
    if new.student_id is distinct from old.student_id
      or new.enrollment_id is distinct from old.enrollment_id
      or new.fee_id is distinct from old.fee_id
      or new.amount is distinct from old.amount then
      raise exception 'An assessed fee with payments cannot be reassigned or repriced.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if not exists (
    select 1 from public.enrollments e join public.fees f on f.id = new.fee_id
    where e.id = new.enrollment_id and e.student_id = new.student_id
      and e.school_year_id = f.school_year_id
      and (f.grade_level_id is null or f.grade_level_id = e.grade_level_id)
  ) then
    raise exception 'The assessed fee must match the enrollment student, school year and grade.';
  end if;
  select coalesce(sum(d.amount_paid), 0) into paid_amount
  from public.payment_details d join public.payments p on p.id = d.payment_id
  where p.enrollment_id = new.enrollment_id and d.fee_id = new.fee_id;
  new.status := case when paid_amount >= new.amount then 'paid'
    when paid_amount > 0 then 'partial' else 'unpaid' end;
  return new;
end;
$$;
drop trigger if exists validate_student_fee_integrity on public.student_fees;
create trigger validate_student_fee_integrity before insert or update or delete on public.student_fees
for each row execute function public.validate_student_fee_integrity();

create or replace function public.validate_assessed_fee_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.school_year_id is distinct from old.school_year_id
    or new.grade_level_id is distinct from old.grade_level_id)
    and exists (select 1 from public.student_fees sf where sf.fee_id = old.id) then
    raise exception 'An assessed fee cannot be moved to another school year or grade. Create a new fee instead.';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_assessed_fee_scope on public.fees;
create trigger validate_assessed_fee_scope before update on public.fees
for each row execute function public.validate_assessed_fee_scope();

-- Validate cross-table relationships and totals already on disk before enabling
-- the new workflow. A failing check rolls back this entire migration.
do $$
begin
  if exists (
    select 1 from public.enrollments e join public.sections s on s.id = e.section_id
    where s.grade_level_id is distinct from e.grade_level_id
  ) or exists (
    select 1 from public.student_fees sf
    join public.enrollments e on e.id = sf.enrollment_id
    join public.fees f on f.id = sf.fee_id
    where sf.student_id <> e.student_id or f.school_year_id <> e.school_year_id
      or (f.grade_level_id is not null and f.grade_level_id is distinct from e.grade_level_id)
  ) or exists (
    select 1 from public.payments p join public.enrollments e on e.id = p.enrollment_id
    where p.student_id <> e.student_id
  ) or exists (
    select 1 from public.payments p left join public.payment_details d on d.payment_id = p.id
    group by p.id having p.payment_amount <> coalesce(sum(d.amount_paid), 0)
  ) or exists (
    select 1 from public.payment_details d join public.payments p on p.id = d.payment_id
    left join public.student_fees sf on sf.enrollment_id = p.enrollment_id and sf.fee_id = d.fee_id
    where sf.id is null
  ) or exists (
    select 1 from public.student_fees sf
    join public.payments p on p.enrollment_id = sf.enrollment_id
    join public.payment_details d on d.payment_id = p.id and d.fee_id = sf.fee_id
    group by sf.id having sum(d.amount_paid) > sf.amount
  ) then
    raise exception 'Existing enrollment/payment inconsistencies found. Review the README preflight queries; no changes were applied.';
  end if;
end;
$$;

-- Restrictive policies apply even if an older permissive policy file is rerun.
-- Financial writes must go through the validated RPC, whose owner bypasses RLS.
do $$
declare table_name text;
begin
  foreach table_name in array array['payments', 'payment_details'] loop
    execute format('drop policy if exists "Financial inserts require RPC" on public.%I', table_name);
    execute format('create policy "Financial inserts require RPC" on public.%I as restrictive for insert to authenticated with check (false)', table_name);
    execute format('drop policy if exists "Financial updates require RPC" on public.%I', table_name);
    execute format('create policy "Financial updates require RPC" on public.%I as restrictive for update to authenticated using (false) with check (false)', table_name);
    execute format('drop policy if exists "Financial records cannot be deleted" on public.%I', table_name);
    execute format('create policy "Financial records cannot be deleted" on public.%I as restrictive for delete to authenticated using (false)', table_name);
  end loop;
end;
$$;
revoke insert, update, delete on public.payments, public.payment_details from anon, authenticated;

drop policy if exists "Only admins can delete students" on public.students;
create policy "Only admins can delete students" on public.students as restrictive
for delete to authenticated using (public.is_admin());

-- Creating students and their initial enrollments also needs a transaction:
-- Staff cannot compensate a failed multi-request import by deleting students.
create or replace function public.enroll_new_students(
  p_students jsonb, p_school_year_id uuid, p_grade_level_id uuid,
  p_section_id uuid, p_enrollment_date date, p_enrollment_status text default 'pending'
) returns integer language plpgsql security invoker set search_path = '' as $$
declare
  student record;
  new_student_id uuid;
  new_enrollment_id uuid;
  student_count integer := 0;
begin
  if not coalesce(public.is_admin_or_staff(), false) then
    raise exception 'An active admin or staff account is required.' using errcode = '42501';
  end if;
  if p_students is null or jsonb_typeof(p_students) <> 'array' then
    raise exception 'Provide at least one student.';
  end if;
  if jsonb_array_length(p_students) = 0 then raise exception 'Provide at least one student.'; end if;
  if p_enrollment_status is null or p_enrollment_status not in ('pending', 'enrolled') then
    raise exception 'New enrollments must be pending or enrolled.';
  end if;
  for student in select * from jsonb_to_recordset(p_students) as s(
    lrn text, first_name text, middle_name text, last_name text, gender text,
    birthdate date, address text, contact_number text, guardian_name text, guardian_contact text
  ) loop
    if nullif(trim(student.lrn), '') is null or nullif(trim(student.first_name), '') is null
      or nullif(trim(student.last_name), '') is null then
      raise exception 'Each student requires an LRN, first name and last name.';
    end if;
    insert into public.students(lrn, first_name, middle_name, last_name, gender, birthdate,
      address, contact_number, guardian_name, guardian_contact)
    values (trim(student.lrn), trim(student.first_name), student.middle_name, trim(student.last_name),
      student.gender, student.birthdate, student.address, student.contact_number, student.guardian_name, student.guardian_contact)
    returning id into new_student_id;
    insert into public.enrollments(student_id, school_year_id, grade_level_id, section_id, enrollment_status, enrollment_date)
    values (new_student_id, p_school_year_id, p_grade_level_id, p_section_id, p_enrollment_status, p_enrollment_date)
    returning id into new_enrollment_id;
    insert into public.student_fees(student_id, enrollment_id, fee_id, amount, status)
    select new_student_id, new_enrollment_id, f.id, f.amount, 'unpaid' from public.fees f
    where f.school_year_id = p_school_year_id and f.status = 'active'
      and (f.grade_level_id is null or f.grade_level_id = p_grade_level_id);
    student_count := student_count + 1;
  end loop;
  return student_count;
end;
$$;
revoke all on function public.enroll_new_students(jsonb, uuid, uuid, uuid, date, text) from public, anon;
grant execute on function public.enroll_new_students(jsonb, uuid, uuid, uuid, date, text) to authenticated;

create or replace function public.record_payment(
  p_enrollment_id uuid, p_allocations jsonb, p_payment_date date,
  p_remarks text, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  receiver public.profiles%rowtype;
  enrollment public.enrollments%rowtype;
  existing_payment public.payments%rowtype;
  student_id_to_lock uuid;
  allocation record;
  assessed_amount numeric;
  paid_amount numeric;
  total_amount numeric;
  payment_id uuid;
  receipt text;
  normalized_allocations jsonb;
  payload jsonb;
begin
  select * into receiver from public.profiles
  where user_id = auth.uid() and status = 'active' and role in ('admin', 'staff') for share;
  if receiver.id is null then raise exception 'An active admin or staff account is required.' using errcode = '42501'; end if;
  if p_request_id is null or p_payment_date is null then raise exception 'A request ID and payment date are required.'; end if;
  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' then raise exception 'Select at least one fee.'; end if;
  if jsonb_array_length(p_allocations) = 0 then raise exception 'Select at least one fee.'; end if;

  select jsonb_agg(jsonb_build_object('fee_id', a.fee_id, 'amount_paid', a.amount_paid) order by a.fee_id),
    sum(a.amount_paid) into normalized_allocations, total_amount
  from jsonb_to_recordset(p_allocations) as a(fee_id uuid, amount_paid numeric);
  if exists (
    select 1 from jsonb_to_recordset(p_allocations) as a(fee_id uuid, amount_paid numeric)
    where a.fee_id is null or a.amount_paid is null or a.amount_paid <= 0
      or a.amount_paid >= 'Infinity'::numeric or scale(a.amount_paid) > 2
  ) then raise exception 'Each fee payment must be positive and have at most two decimal places.'; end if;
  if (select count(*) from jsonb_to_recordset(p_allocations) as a(fee_id uuid, amount_paid numeric))
    <> (select count(distinct a.fee_id) from jsonb_to_recordset(p_allocations) as a(fee_id uuid, amount_paid numeric)) then
    raise exception 'A fee can only occur once per payment.';
  end if;
  payload := jsonb_build_object('enrollment_id', p_enrollment_id, 'allocations', normalized_allocations,
    'payment_date', p_payment_date, 'remarks', coalesce(trim(p_remarks), ''));

  -- Serialize retries with the same request ID, even if enrollment was changed.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into existing_payment from public.payments where request_id = p_request_id;
  if existing_payment.id is not null then
    if existing_payment.received_by <> receiver.id or existing_payment.request_payload is distinct from payload then
      raise exception 'This request ID has already been used for a different payment.';
    end if;
    return jsonb_build_object('id', existing_payment.id, 'receipt_number', existing_payment.receipt_number);
  end if;

  select e.student_id into student_id_to_lock from public.enrollments e where e.id = p_enrollment_id;
  perform 1 from public.students s where s.id = student_id_to_lock for update;
  select * into enrollment from public.enrollments e where e.id = p_enrollment_id for update;
  if enrollment.id is null or enrollment.student_id is distinct from student_id_to_lock
    or enrollment.enrollment_status not in ('pending', 'enrolled') then
    raise exception 'Select a student with an active enrollment.';
  end if;
  -- Lock assessments before reading balances. All RPCs use the same lock order.
  perform 1 from public.student_fees sf where sf.enrollment_id = enrollment.id order by sf.id for update;

  for allocation in
    select * from jsonb_to_recordset(normalized_allocations) as a(fee_id uuid, amount_paid numeric)
  loop
    select sf.amount into assessed_amount from public.student_fees sf
    where sf.enrollment_id = enrollment.id and sf.student_id = enrollment.student_id and sf.fee_id = allocation.fee_id;
    if not found then raise exception 'A selected fee is not assessed for this enrollment.'; end if;
    select coalesce(sum(d.amount_paid), 0) into paid_amount
    from public.payment_details d join public.payments p on p.id = d.payment_id
    where p.enrollment_id = enrollment.id and d.fee_id = allocation.fee_id;
    if allocation.amount_paid > assessed_amount - paid_amount then
      raise exception 'Payment exceeds the current fee balance. Reload the account and try again.';
    end if;
  end loop;

  payment_id := gen_random_uuid();
  receipt := 'OLGTPS-' || to_char(p_payment_date, 'YYYYMMDD') || '-' || upper(replace(payment_id::text, '-', ''));
  insert into public.payments(id, student_id, enrollment_id, receipt_number, payment_amount,
    payment_method, remarks, received_by, payment_date, request_id, request_payload)
  values (payment_id, enrollment.student_id, enrollment.id, receipt, total_amount, 'Cash',
    coalesce(trim(p_remarks), ''), receiver.id, p_payment_date, p_request_id, payload);
  insert into public.payment_details(payment_id, fee_id, amount_paid)
  select payment_id, a.fee_id, a.amount_paid
  from jsonb_to_recordset(normalized_allocations) as a(fee_id uuid, amount_paid numeric);

  update public.student_fees sf set status = case
    when totals.paid >= sf.amount then 'paid' when totals.paid > 0 then 'partial' else 'unpaid' end
  from (
    select d.fee_id, sum(d.amount_paid) as paid from public.payment_details d
    join public.payments p on p.id = d.payment_id where p.enrollment_id = enrollment.id group by d.fee_id
  ) totals where sf.enrollment_id = enrollment.id and sf.fee_id = totals.fee_id;

  if exists (
    select 1 from public.student_fees sf join public.fees f on f.id = sf.fee_id
    where sf.enrollment_id = enrollment.id
      and lower(coalesce(f.fee_name, '') || ' ' || coalesce(f.fee_type, '')) like '%enrollment%'
  ) and not exists (
    select 1 from public.student_fees sf join public.fees f on f.id = sf.fee_id
    where sf.enrollment_id = enrollment.id and sf.status <> 'paid'
      and lower(coalesce(f.fee_name, '') || ' ' || coalesce(f.fee_type, '')) like '%enrollment%'
  ) then
    update public.enrollments set enrollment_status = 'enrolled' where id = enrollment.id;
  end if;
  return jsonb_build_object('id', payment_id, 'receipt_number', receipt);
end;
$$;
revoke all on function public.record_payment(uuid, jsonb, date, text, uuid) from public, anon;
grant execute on function public.record_payment(uuid, jsonb, date, text, uuid) to authenticated;

create or replace function public.delete_unpaid_student(p_student_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Only active admins can delete students.' using errcode = '42501'; end if;
  perform 1 from public.students where id = p_student_id for update;
  if not found then raise exception 'Student not found.'; end if;
  perform 1 from public.enrollments where student_id = p_student_id order by id for update;
  if exists (select 1 from public.payments where student_id = p_student_id) then
    raise exception 'Students with payment history cannot be deleted. Set their enrollment to inactive instead.';
  end if;
  delete from public.student_fees where student_id = p_student_id;
  delete from public.enrollments where student_id = p_student_id;
  delete from public.students where id = p_student_id;
end;
$$;
revoke all on function public.delete_unpaid_student(uuid) from public, anon;
grant execute on function public.delete_unpaid_student(uuid) to authenticated;

revoke all on function public.validate_enrollment_integrity() from public, anon, authenticated;
revoke all on function public.validate_student_fee_integrity() from public, anon, authenticated;
revoke all on function public.validate_assessed_fee_scope() from public, anon, authenticated;
commit;
