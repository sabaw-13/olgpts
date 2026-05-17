-- OLGTPS Admin Profile Setup
-- Step 1: Create the user first in Supabase Dashboard:
-- Authentication > Users > Add user
--
-- Step 2: Copy the new user's UUID from Authentication > Users.
--
-- Step 3: Replace the values below, then run this script in Supabase SQL Editor.

insert into profiles (
  user_id,
  full_name,
  role,
  status
)
values (
  'd6a00b50-b2f1-4582-9e17-57500c8cbce6',
  'OLGTPS Administrator',
  'admin',
  'active'
);
