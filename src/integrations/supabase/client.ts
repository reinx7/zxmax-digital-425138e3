import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase env vars missing. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.");
}

export const supabase = createClient<Database>(
  SUPABASE_URL || "https://xdtabnmfiwvycxbykras.supabase.co",
  SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdGFibm1maXd2eWN4YnlrcmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODI0MjMsImV4cCI6MjA5NDM1ODQyM30.i-Y53lljtukctnRfDghzbU4DNw_soHU_ZUiSfTg9N9w",
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
