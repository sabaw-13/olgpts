-- OLGTPS Student Fee Assessment Helpers
-- Run in Supabase SQL Editor to enforce no duplicate fee per enrollment.

create unique index if not exists idx_student_fees_enrollment_fee_unique
on student_fees(enrollment_id, fee_id);
