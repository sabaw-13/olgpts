alter table enrollments
  drop constraint if exists enrollments_enrollment_status_check;

alter table enrollments
  add constraint enrollments_enrollment_status_check
  check (enrollment_status in ('pending', 'enrolled', 'graduated', 'inactive'));
