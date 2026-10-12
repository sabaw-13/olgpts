-- Run after supabase-payment-integrity-migration.sql and graduated-status migration.
-- Existing records are preserved. Promotion changes are atomic and retry-safe.
begin;

create or replace function public.promotion_grade_step(p_name text)
returns integer language sql immutable set search_path = '' as $$
  select case regexp_replace(lower(trim(p_name)), '[-_/[:space:]]+', ' ', 'g')
    when 'nursery' then 0
    when 'kinder i' then 1 when 'kinder 1' then 1
    when 'kindergarten' then 2 when 'kinder ii' then 2 when 'kinder 2' then 2
    when 'grade i' then 3 when 'grade 1' then 3 when 'grade one' then 3
    when 'grade ii' then 4 when 'grade 2' then 4 when 'grade two' then 4
    when 'grade iii' then 5 when 'grade 3' then 5 when 'grade three' then 5
    when 'grade iv' then 6 when 'grade 4' then 6 when 'grade four' then 6
    when 'grade v' then 7 when 'grade 5' then 7 when 'grade five' then 7
    when 'grade vi' then 8 when 'grade 6' then 8 when 'grade six' then 8
  end;
$$;

create or replace function public.promote_students(
  p_source_school_year_id uuid, p_target_school_year_id uuid, p_enrollment_date date
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  source record;
  next_grade uuid;
  grade_step integer;
  grade_count integer;
  target_id uuid;
  assessed numeric;
  paid numeric;
  new_status text;
  promoted integer := 0;
  graduated integer := 0;
  pending integer := 0;
  skipped integer := 0;
begin
  if not coalesce(public.is_admin_or_staff(), false) then
    raise exception 'An active admin or staff account is required.' using errcode = '42501';
  end if;
  if p_source_school_year_id is null or p_target_school_year_id is null
    or p_source_school_year_id = p_target_school_year_id or p_enrollment_date is null then
    raise exception 'Choose different source and target school years and an enrollment date.';
  end if;
  if not exists (select 1 from public.school_years where id = p_source_school_year_id)
    or not exists (select 1 from public.school_years where id = p_target_school_year_id) then
    raise exception 'The source and target school years must exist.';
  end if;
  -- Serialize this batch, then use the same student/enrollment/assessment lock
  -- order as record_payment. SQL reads have no Data API row limit.
  perform pg_advisory_xact_lock(hashtextextended('promotion:' || p_source_school_year_id::text, 0));
  perform 1 from public.students s where exists (
    select 1 from public.enrollments e where e.student_id = s.id
      and e.school_year_id = p_source_school_year_id
      and e.enrollment_status in ('pending', 'enrolled')
  ) order by s.id for update;
  for source in
    select e.* from public.enrollments e
    where e.school_year_id = p_source_school_year_id
      and e.enrollment_status in ('pending', 'enrolled')
    order by e.student_id for update
  loop
    if exists (select 1 from public.enrollments e where e.student_id = source.student_id
      and e.school_year_id = p_target_school_year_id) then
      -- Preserve pre-existing target records; retries cannot duplicate them.
      skipped := skipped + 1;
      continue;
    end if;
    select public.promotion_grade_step(g.grade_name) into grade_step
      from public.grade_levels g where g.id = source.grade_level_id;
    if grade_step is null then
      raise exception 'A source grade is unsupported. Review grade names before promotion.';
    end if;
    next_grade := null;
    if grade_step < 8 then
      select count(*), (array_agg(g.id))[1] into grade_count, next_grade
      from public.grade_levels g where g.status = 'active'
        and public.promotion_grade_step(g.grade_name) = grade_step + 1;
      if grade_count <> 1 then
        raise exception 'Each source grade needs exactly one active immediate next grade. Promotion was rolled back.';
      end if;
    end if;
    perform 1 from public.student_fees sf where sf.enrollment_id = source.id order by sf.id for update;
    select coalesce(sum(sf.amount), 0) into assessed from public.student_fees sf where sf.enrollment_id = source.id;
    select coalesce(sum(p.payment_amount), 0) into paid from public.payments p where p.enrollment_id = source.id;
    new_status := case when grade_step = 8 then 'graduated'
      when assessed > paid then 'pending' else 'enrolled' end;
    insert into public.enrollments(student_id, school_year_id, grade_level_id,
      enrollment_status, enrollment_date)
    values (source.student_id, p_target_school_year_id,
      coalesce(next_grade, source.grade_level_id), new_status, p_enrollment_date)
    returning id into target_id;
    if new_status <> 'graduated' then
      insert into public.student_fees(student_id, enrollment_id, fee_id, amount, status)
      select source.student_id, target_id, f.id, f.amount, 'unpaid' from public.fees f
      where f.school_year_id = p_target_school_year_id and f.status = 'active'
        and (f.grade_level_id is null or f.grade_level_id = next_grade);
    end if;
    update public.enrollments set enrollment_status = 'inactive' where id = source.id;
    promoted := promoted + 1;
    graduated := graduated + case when new_status = 'graduated' then 1 else 0 end;
    pending := pending + case when new_status = 'pending' then 1 else 0 end;
  end loop;
  return jsonb_build_object('promoted', promoted, 'graduated', graduated, 'pending', pending, 'skipped', skipped);
end;
$$;

revoke all on function public.promotion_grade_step(text) from public, anon, authenticated;
revoke all on function public.promote_students(uuid, uuid, date) from public, anon;
grant execute on function public.promote_students(uuid, uuid, date) to authenticated;

-- Also protect existing graduates left with older active enrollments by the
-- previous browser workflow. Preserve their records; reject new payments.
create or replace function public.reject_graduate_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare latest_status text;
begin
  select e.enrollment_status into latest_status from public.enrollments e
  where e.student_id = new.student_id
  order by e.created_at desc, e.id desc limit 1;
  if latest_status = 'graduated' then
    raise exception 'Graduated students cannot receive new enrollment payments.';
  end if;
  return new;
end;
$$;
drop trigger if exists reject_graduate_payment on public.payments;
create trigger reject_graduate_payment before insert on public.payments
for each row execute function public.reject_graduate_payment();
revoke all on function public.reject_graduate_payment() from public, anon, authenticated;
commit;
