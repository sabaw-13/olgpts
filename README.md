# OLGTPS Payment and Enrollment Management System

## System Description

The OLGTPS Payment and Enrollment Management System is a React and Supabase web application for Our Lady of Guadalupe Tibiao Parochial School. It helps school staff manage student records, school setup, enrollment, fee assessment, payment recording, receipts, reports, and staff access.

This project is currently a frontend application connected to Supabase. Supabase handles authentication, database records, and row level security.

## Features

- Login and logout with Supabase Auth
- Shared Admin and Staff access
- Protected routes
- Dashboard with enrollment and payment summaries
- Student management
- School year, grade level, and section setup
- Enrollment management
- Enrollment fee setup
- Enrollment fee assessment
- Payment recording and balance computation
- Printable receipts
- Reports with filters, printing, and CSV export
- Staff profile management
- Supabase Row Level Security policies

## User Access

Admin and Staff users share the same small-school workflow. Both can:

- Access all pages
- Manage staff profiles
- Manage school setup records
- Manage enrollment fee records
- Add and update students
- Add and update enrollments
- Assess enrollment fees
- Record payments
- View receipts and reports

## Tech Stack

- React.js
- Vite
- Tailwind CSS
- React Router DOM
- Supabase
- Lucide React
- Recharts

## Project Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```txt
.env.local
```

Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Use the base project URL only. Do not include `/rest/v1/`.

## Supabase Setup

1. Create a Supabase project.
2. Go to Project Settings > Data API or API.
3. Copy the Project URL.
4. Copy the anon public key.
5. Add both values to `.env.local`.

Do not put the Supabase service role key in frontend code.

## Database Schema Instructions

Open Supabase SQL Editor and run:

```txt
supabase-schema.sql
```

If your database was created before the School Setup updates, also run:

```txt
supabase-school-setup-migration.sql
```

For duplicate student fee protection, run:

```txt
supabase-student-fee-assessment.sql
```

## RLS Policy Instructions

After creating your first active Admin or Staff profile, run:

```txt
supabase-rls-policies.sql
```

This file enables Row Level Security for:

- profiles
- students
- school_years
- grade_levels
- sections
- enrollments
- fees
- student_fees
- payments
- payment_details

Important: create the first active Admin or Staff account before applying RLS. Otherwise, the frontend may not have an active user able to manage records.

## How to Create an Admin Account

1. In Supabase, go to Authentication > Users.
2. Click Add user.
3. Enter the Admin email and password.
4. Copy the generated Auth user UUID.
5. Go to SQL Editor.
6. Insert a matching profile:

```sql
insert into profiles (
  user_id,
  full_name,
  role,
  status
)
values (
  'PASTE_AUTH_USER_ID_HERE',
  'OLGTPS Administrator',
  'admin',
  'active'
);
```

7. Log in using the Admin email and password.

## How to Create a Staff Account

After deploying the `create-staff-account` Supabase Edge Function, active Admin or Staff users can create staff accounts directly in the OLGTPS app:

1. Log in to OLGTPS as an active Admin or Staff user.
2. Open Staff Management.
3. Click Create Staff Account.
4. Enter the staff email, temporary password, full name, role, and status.
5. Give the temporary password to the staff member.

The Edge Function creates the Supabase Auth user and inserts the matching `profiles` row automatically, so no UUID copy-paste is needed.

If the Edge Function has not been deployed yet, the app falls back to Supabase email sign-up with an isolated browser client, then links the profile as the logged-in user. That fallback requires email sign-ups to be enabled in Supabase Auth.

Deploy the function:

```bash
supabase functions deploy create-staff-account
```

If needed, set the service role key as a function secret:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Keep the `SUPABASE_SERVICE_ROLE_KEY` only in Supabase function secrets or server-side environment variables. Never place it in frontend `.env` files.

## How to Run Locally

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Testing Instructions

Use this checklist after setup:

- Log in as Admin.
- Confirm Admin can access Dashboard, Students, School Setup, Enrollment Fee, Enrollment, Payments, Receipts, Reports, Staff Management, and Settings.
- Create or update a student record.
- Create school year, grade level, and section records.
- Create an enrollment fee.
- Enroll a student.
- Assess the enrollment fee from the Enrollment page.
- Record a payment from the Payments page.
- Confirm assessed total, paid total, and remaining balance are correct.
- Open Receipts and print a receipt.
- Open Reports, apply filters, print a report, and export CSV.
- Log out.
- Log in as Staff.
- Confirm Staff can access the same pages as Admin.
- Confirm Staff can create or update an enrollment fee, assess it from Enrollment, and record payments.

## Basic Troubleshooting

### Stuck on Checking Session

Restart the dev server:

```bash
npm run dev
```

Then hard refresh the browser with `Ctrl + F5`.

### No Profile Row Is Linked

For accounts created through Staff Management, confirm the `create-staff-account` Edge Function is deployed and has access to `SUPABASE_SERVICE_ROLE_KEY`.

For manually created accounts, the Auth user exists but the `profiles.user_id` value does not match the Supabase Auth user UUID. Copy the UUID from Authentication > Users and update the profile row.

### Email Not Confirmed

If Staff Management used the fallback sign-up flow, the staff user may need to confirm their email before logging in.

Fix options:

- Ask the staff member to open the confirmation email from Supabase.
- In Supabase, turn off required email confirmation under Authentication email settings before creating staff accounts.
- Deploy the `create-staff-account` Edge Function, which creates users with `email_confirm: true`.
- For an existing test account, confirm the user manually in Supabase Authentication > Users, or run a one-time SQL update for that exact email:

```sql
update auth.users
set email_confirmed_at = now(),
    confirmed_at = now()
where email = 'staff@example.com';
```

### Account Is Inactive

Set the profile status to:

```txt
active
```

### Staff or Admin Cannot Read Data

Check that:

- `.env.local` points to the correct Supabase project.
- The user has a matching active profile.
- `supabase-rls-policies.sql` has been applied.
- The profile role is exactly `admin` or `staff`.

### Cannot Add Enrollment Fee or School Setup Records

Confirm the user has an active `admin` or `staff` profile and that `supabase-rls-policies.sql` has been applied.

### Payment Cannot Be Saved

Check that:

- The student has an active enrollment.
- An enrollment fee has been assessed for the enrollment.
- Payment amount is greater than 0.
- Payment amount does not exceed remaining balance.
- The logged-in user has an active profile.

### Receipts or Reports Show No Records

Check that payments have been recorded and that the selected filters are not too restrictive.

## Security Notes

- The anon key is safe for frontend use when RLS policies are enabled.
- Never expose the service role key in frontend code.
- Use Supabase RLS policies to protect table access.
- Create Auth users from Supabase Dashboard or a secure backend, not directly with a service role key in React.
