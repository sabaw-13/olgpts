import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Missing Vercel environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    : '';

// Shared Supabase client for future database and authentication features.
export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);
export { supabaseAnonKey, supabaseUrl };
