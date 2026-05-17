# OLGTPS Staff Account Setup

Use this safe process for Admin and Staff accounts.

## Create the Auth user

Active Admin or Staff users can create staff accounts directly in the OLGTPS app after the Edge Function is deployed.

1. Log in to OLGTPS as an active Admin or Staff user.
2. Open Staff Management.
3. Click Create Staff Account.
4. Enter the staff email, temporary password, full name, role, and status.
5. Give the temporary password to the staff member.

The app first calls the `create-staff-account` Supabase Edge Function. The function creates the Supabase Auth user and inserts the linked `profiles` row automatically.

If the Edge Function has not been deployed yet, the app falls back to Supabase email sign-up with an isolated browser client, then links the profile as the logged-in user. That fallback requires email sign-ups to be enabled in Supabase Auth.

If email confirmation is required in Supabase Auth, staff accounts created by the fallback cannot log in until they confirm their email or an admin confirms them in Supabase. Deploying the Edge Function avoids that because it creates users with confirmed email.

## Deploy the Edge Function

Deploy the function from this project:

```bash
supabase functions deploy create-staff-account
```

The function needs these Supabase environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

If the service role key is not already available to the function, add it as a secret:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Important

Do not expose service role keys in frontend code. Auth user creation is handled only by the secure Edge Function.
