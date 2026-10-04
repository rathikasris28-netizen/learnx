import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('[LearnX] Missing VITE_SUPABASE_URL environment variable');
}

if (!SUPABASE_SECRET_KEY) {
  throw new Error('[LearnX] Missing SUPABASE_SECRET_KEY environment variable');
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    '[LearnX] Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable'
  );
}

export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

export const supabaseAnon: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

export function getSupabaseConfig() {
  return {
    url: SUPABASE_URL,
    configured: true,
  };
}