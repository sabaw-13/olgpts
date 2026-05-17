-- OLGTPS School Setup Migration
-- Run this once in Supabase SQL Editor if your grade_levels and sections tables
-- were created before status columns were added.

alter table grade_levels
add column if not exists status text check (status in ('active', 'inactive')) default 'active';

alter table sections
add column if not exists status text check (status in ('active', 'inactive')) default 'active';

update grade_levels
set status = 'active'
where status is null;

update sections
set status = 'active'
where status is null;
