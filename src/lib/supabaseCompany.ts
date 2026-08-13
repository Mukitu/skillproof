import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabaseConfig } from './supabase';

let _companyClient: SupabaseClient | null = null;

export function getCompanySupabase(): SupabaseClient {
  if (_companyClient) return _companyClient;
  const config = readSupabaseConfig();
  _companyClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'skillproof.company.auth',
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-client-info': 'skillproof-company-web' },
    },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return _companyClient;
}

export const companySupabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getCompanySupabase();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});