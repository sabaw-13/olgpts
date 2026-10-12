-- Run after supabase-rls-policies.sql. No records are deleted.
-- If several years are active, keep the most recently created active year.
begin;
lock table public.school_years in share row exclusive mode;
update public.school_years set status = 'inactive'
where status = 'active' and id <> (
  select id from public.school_years where status = 'active'
  order by created_at desc nulls last, id desc limit 1
);
create unique index if not exists school_years_one_active
  on public.school_years(status) where status = 'active';

create or replace function public.save_school_year(p_id uuid, p_school_year text, p_status text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid;
begin
  if not coalesce(public.is_admin_or_staff(), false) then
    raise exception 'An active admin or staff account is required.' using errcode = '42501';
  end if;
  if nullif(trim(p_school_year), '') is null or p_status is null or p_status not in ('active', 'inactive') then
    raise exception 'A school year name and valid status are required.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('school-year-activation', 0));
  if p_id is not null and not exists (select 1 from public.school_years where id = p_id) then
    raise exception 'School year not found.';
  end if;
  if p_status = 'active' then
    update public.school_years set status = 'inactive' where status = 'active' and id is distinct from p_id;
  end if;
  if p_id is null then
    insert into public.school_years(school_year, status) values (trim(p_school_year), p_status) returning id into saved_id;
  else
    update public.school_years set school_year = trim(p_school_year), status = p_status where id = p_id returning id into saved_id;
  end if;
  return saved_id;
end;
$$;
create or replace function public.activate_school_year(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not coalesce(public.is_admin_or_staff(), false) then
    raise exception 'An active admin or staff account is required.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('school-year-activation', 0));
  if p_id is null or not exists (select 1 from public.school_years where id = p_id) then
    raise exception 'School year not found.';
  end if;
  update public.school_years set status = 'inactive' where status = 'active' and id <> p_id;
  update public.school_years set status = 'active' where id = p_id;
end;
$$;
revoke all on function public.save_school_year(uuid, text, text) from public, anon;
revoke all on function public.activate_school_year(uuid) from public, anon;
grant execute on function public.save_school_year(uuid, text, text) to authenticated;
grant execute on function public.activate_school_year(uuid) to authenticated;
commit;
