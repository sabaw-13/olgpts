-- Read-only diagnostics. Run before the payment integrity migration.
-- An empty result means these data checks passed; no records are modified.
select 'duplicate profiles.user_id' as issue, user_id::text as record_id
from public.profiles group by user_id having count(*) > 1
union all
select 'invalid profile fields', id::text from public.profiles
where user_id is null or role is null or status is null
union all
select 'duplicate enrollment student/year', min(id::text) from public.enrollments
group by student_id, school_year_id having count(*) > 1
union all
select 'invalid enrollment fields', id::text from public.enrollments
where student_id is null or school_year_id is null or enrollment_status is null or enrollment_date is null
union all
select 'enrollment section/grade mismatch', e.id::text
from public.enrollments e join public.sections s on s.id = e.section_id
where s.grade_level_id is distinct from e.grade_level_id
union all
select 'invalid fee fields/amount', id::text from public.fees
where school_year_id is null or amount is null or amount < 0 or amount >= 'Infinity'::numeric or scale(amount) > 2
union all
select 'invalid assessed fee fields/amount', id::text from public.student_fees
where student_id is null or enrollment_id is null or fee_id is null or status is null
  or amount is null or amount < 0 or amount >= 'Infinity'::numeric or scale(amount) > 2
union all
select 'assessed fee student/year/grade mismatch', sf.id::text
from public.student_fees sf join public.enrollments e on e.id = sf.enrollment_id
join public.fees f on f.id = sf.fee_id
where sf.student_id <> e.student_id or f.school_year_id <> e.school_year_id
  or (f.grade_level_id is not null and f.grade_level_id is distinct from e.grade_level_id)
union all
select 'invalid payment fields/amount', id::text from public.payments
where student_id is null or enrollment_id is null or receipt_number is null or received_by is null
  or payment_date is null or payment_amount is null or payment_amount <= 0
  or payment_amount >= 'Infinity'::numeric or scale(payment_amount) > 2
union all
select 'payment/enrollment student mismatch', p.id::text
from public.payments p join public.enrollments e on e.id = p.enrollment_id
where p.student_id <> e.student_id
union all
select 'payment total differs from allocations', p.id::text
from public.payments p left join public.payment_details d on d.payment_id = p.id
group by p.id having p.payment_amount <> coalesce(sum(d.amount_paid), 0)
union all
select 'duplicate payment allocation', min(id::text) from public.payment_details
group by payment_id, fee_id having count(*) > 1
union all
select 'invalid payment allocation fields/amount', id::text from public.payment_details
where payment_id is null or fee_id is null or amount_paid is null or amount_paid <= 0
  or amount_paid >= 'Infinity'::numeric or scale(amount_paid) > 2
union all
select 'payment allocation has no assessed fee', d.id::text
from public.payment_details d join public.payments p on p.id = d.payment_id
left join public.student_fees sf on sf.enrollment_id = p.enrollment_id and sf.fee_id = d.fee_id
where sf.id is null
union all
select 'assessed fee overpaid', sf.id::text
from public.student_fees sf join public.payments p on p.enrollment_id = sf.enrollment_id
join public.payment_details d on d.payment_id = p.id and d.fee_id = sf.fee_id
group by sf.id having sum(d.amount_paid) > sf.amount
order by issue, record_id;
