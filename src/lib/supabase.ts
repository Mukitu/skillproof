/**
 * Strict Supabase client. Throws if VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.
 * Service role and Groq keys are NEVER imported on the client.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function readConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url === 'https://your-project.supabase.co' || anonKey === 'your-anon-key') {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    );
  }
  return { url, anonKey };
}

const { url, anonKey } = readConfig();

export const isSupabaseConfigured = true;

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'skillproof.auth',
  },
  realtime: { params: { eventsPerSecond: 10 } },
});

export const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_URL as string) || 'https://skillproof.top';
export const APP_URL = (import.meta.env.VITE_APP_URL as string) || 'http://localhost:3000';
