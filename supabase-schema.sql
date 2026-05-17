-- OLGTPS Payment and Enrollment Management System
-- Initial database schema only. RLS policies and seed data are intentionally not included yet.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('admin', 'staff')),
  status text check (status in ('active', 'inactive')),
  created_at timestamp with time zone default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  lrn text unique,
  first_name text,
  middle_name text,
  last_name text,
  gender text,
  birthdate date,
  address text,
  contact_number text,
  guardian_name text,
  guardian_contact text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists school_years (
  id uuid primary key default gen_random_uuid(),
  school_year text,
  status text check (status in ('active', 'inactive')),
  created_at timestamp with time zone default now()
);

create table if not exists grade_levels (
  id uuid primary key default gen_random_uuid(),
  grade_name text,
  status text check (status in ('active', 'inactive')) default 'active',
  created_at timestamp with time zone default now()
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  section_name text,
  grade_level_id uuid references grade_levels(id) on delete restrict,
  status text check (status in ('active', 'inactive')) default 'active',
  created_at timestamp with time zone default now()
);

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete restrict,
  school_year_id uuid references school_years(id) on delete restrict,
  grade_level_id uuid references grade_levels(id) on delete restrict,
  section_id uuid references sections(id) on delete restrict,
  enrollment_status text check (enrollment_status in ('pending', 'enrolled', 'inactive')),
  enrollment_date date,
  created_at timestamp with time zone default now()
);

create table if not exists fees (
  id uuid primary key default gen_random_uuid(),
  fee_name text,
  fee_type text,
  amount numeric,
  grade_level_id uuid references grade_levels(id) on delete restrict,
  school_year_id uuid references school_years(id) on delete restrict,
  status text check (status in ('active', 'inactive')),
  created_at timestamp with time zone default now()
);

create table if not exists student_fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete restrict,
  enrollment_id uuid references enrollments(id) on delete restrict,
  fee_id uuid references fees(id) on delete restrict,
  amount numeric,
  status text check (status in ('unpaid', 'partial', 'paid')),
  created_at timestamp with time zone default now(),
  unique (enrollment_id, fee_id)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete restrict,
  enrollment_id uuid references enrollments(id) on delete restrict,
  receipt_number text unique,
  payment_amount numeric,
  payment_method text,
  remarks text,
  received_by uuid references profiles(id) on delete restrict,
  payment_date date,
  created_at timestamp with time zone default now()
);

create table if not exists payment_details (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references payments(id) on delete cascade,
  fee_id uuid references fees(id) on delete restrict,
  amount_paid numeric,
  created_at timestamp with time zone default now()
);

-- Useful lookup indexes for foreign keys and common filters.
create index if not exists idx_profiles_user_id on profiles(user_id);

create index if not exists idx_sections_grade_level_id on sections(grade_level_id);

create index if not exists idx_enrollments_student_id on enrollments(student_id);
create index if not exists idx_enrollments_school_year_id on enrollments(school_year_id);
create index if not exists idx_enrollments_grade_level_id on enrollments(grade_level_id);
create index if not exists idx_enrollments_section_id on enrollments(section_id);

create index if not exists idx_fees_school_year_id on fees(school_year_id);
create index if not exists idx_fees_grade_level_id on fees(grade_level_id);

create index if not exists idx_student_fees_student_id on student_fees(student_id);
create index if not exists idx_student_fees_enrollment_id on student_fees(enrollment_id);
create index if not exists idx_student_fees_fee_id on student_fees(fee_id);

create index if not exists idx_payments_student_id on payments(student_id);
create index if not exists idx_payments_enrollment_id on payments(enrollment_id);
create index if not exists idx_payments_received_by on payments(received_by);
create index if not exists idx_payments_payment_date on payments(payment_date);

create index if not exists idx_payment_details_payment_id on payment_details(payment_id);
create index if not exists idx_payment_details_fee_id on payment_details(fee_id);
