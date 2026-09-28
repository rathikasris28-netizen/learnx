import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nnggbezjuqnnbpciptea.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0syKoVtawdKPanWLwnSCgw_G6mVPWQd';

export const supabase = createClient(supabaseUrl, supabaseKey);
