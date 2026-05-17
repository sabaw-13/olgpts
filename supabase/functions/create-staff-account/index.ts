import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type StaffAccountPayload = {
  email?: string;
  password?: string;
  full_name?: string;
  role?: string;
  status?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function validatePayload(payload: StaffAccountPayload) {
  const email = payload.email?.trim().toLowerCase() || '';
  const password = payload.password || '';
  const fullName = payload.full_name?.trim() || '';
  const role = payload.role || 'staff';
  const status = payload.status || 'active';

  if (!email || !email.includes('@')) {
    return { error: 'A valid email address is required.' };
  }

  if (password.length < 6) {
    return { error: 'Temporary password must be at least 6 characters.' };
  }

  if (!fullName) {
    return { error: 'Full name is required.' };
  }

  if (!['admin', 'staff'].includes(role)) {
    return { error: 'Role must be admin or staff.' };
  }

  if (!['active', 'inactive'].includes(status)) {
    return { error: 'Status must be active or inactive.' };
  }

  return {
    data: {
      email,
      password,
      fullName,
      role,
      status,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase function environment is not configured.' }, 500);
  }

  const authorization = req.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'You must be logged in.' }, 401);
  }

  let payload: StaffAccountPayload;

  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }

  const validation = validatePayload(payload);

  if ('error' in validation) {
    return jsonResponse({ error: validation.error }, 400);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();

  if (authError || !authData.user) {
    return jsonResponse({ error: 'Your login session could not be verified.' }, 401);
  }

  const { data: requesterProfile, error: profileError } = await userClient
    .from('profiles')
    .select('id, role, status')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: profileError.message }, 500);
  }

  if (
    !['admin', 'staff'].includes(requesterProfile?.role || '') ||
    requesterProfile?.status !== 'active'
  ) {
    return jsonResponse({ error: 'Only active admin or staff users can create staff accounts.' }, 403);
  }

  const { email, password, fullName, role, status } = validation.data;

  const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  });

  if (createUserError || !createdUser.user) {
    return jsonResponse(
      { error: createUserError?.message || 'Unable to create the Auth user.' },
      400,
    );
  }

  const { data: createdProfile, error: createProfileError } = await adminClient
    .from('profiles')
    .insert({
      user_id: createdUser.user.id,
      full_name: fullName,
      role,
      status,
    })
    .select('id, user_id, full_name, role, status')
    .single();

  if (createProfileError) {
    await adminClient.auth.admin.deleteUser(createdUser.user.id);

    return jsonResponse(
      { error: `Auth user was rolled back because profile creation failed: ${createProfileError.message}` },
      400,
    );
  }

  return jsonResponse({
    user_id: createdUser.user.id,
    profile: createdProfile,
  });
});
