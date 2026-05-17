-- OLGTPS Auth Policies
-- Run this in Supabase SQL Editor if the frontend cannot read the logged-in user's profile.
-- This keeps profile access limited to the currently authenticated user.

alter table profiles enable row level security;

drop policy if exists "Users can read their own profile" on profiles;

create policy "Users can read their own profile"
on profiles
for select
to authenticated
using (auth.uid() = user_id);
