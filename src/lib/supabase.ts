

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
}

const DEBUG_KEY = 'skillproof.auth.debug';

function debugLog(...args: unknown[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(DEBUG_KEY) === '1') {
      
      console.log('[skillproof:auth]', ...args);
    }
  } catch {
    
  }
}

function getBrowserEnv(): Record<string, unknown> {
  const viteEnv =
    (import.meta as ImportMeta & { env?: Record<string, unknown> }).env ?? {};
  const globalEnv =
    typeof globalThis !== 'undefined'
      ? ((globalThis as typeof globalThis & { __ENV__?: Record<string, unknown> })
          .__ENV__ ?? {})
      : {};
  return { ...globalEnv, ...viteEnv };
}

function firstConfigured(env: Record<string, unknown>, names: string[]): string {
  for (const name of names) {
    const value = env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes('your-project') ||
    normalized.includes('your-anon') ||
    normalized === 'your-anon-key' ||
    normalized === 'undefined' ||
    normalized === 'null'
  );
}

export class SupabaseConfigurationError extends Error {
  code:
    | 'config_url_missing'
    | 'config_key_missing'
    | 'config_url_invalid'
    | 'config_url_scheme'
    | 'config_key_shape';
  constructor(
    code: SupabaseConfigurationError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'SupabaseConfigurationError';
    this.code = code;
  }
}

export function readSupabaseConfig(): SupabaseClientConfig {
  const env = getBrowserEnv();
  const url = firstConfigured(env, [
    'VITE_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
  ]);
  const anonKey = firstConfigured(env, [
    'VITE_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]);

  if (!url) {
    throw new SupabaseConfigurationError(
      'config_url_missing',
      'Authentication is not configured: VITE_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is missing.',
    );
  }
  if (!anonKey) {
    throw new SupabaseConfigurationError(
      'config_key_missing',
      'Authentication is not configured: VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) is missing.',
    );
  }
  if (isPlaceholder(url)) {
    throw new SupabaseConfigurationError(
      'config_url_invalid',
      'VITE_SUPABASE_URL still contains the placeholder value from .env.example. Replace it with your real Supabase project URL.',
    );
  }
  if (isPlaceholder(anonKey)) {
    throw new SupabaseConfigurationError(
      'config_key_shape',
      'VITE_SUPABASE_ANON_KEY still contains the placeholder value from .env.example. Replace it with your real anon key.',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new SupabaseConfigurationError(
      'config_url_invalid',
      `VITE_SUPABASE_URL is not a valid URL: "${url}"`,
    );
  }

  const hostIsLocal = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
  if (parsedUrl.protocol !== 'https:' && !hostIsLocal) {
    throw new SupabaseConfigurationError(
      'config_url_scheme',
      `VITE_SUPABASE_URL must use https:// (got "${parsedUrl.protocol}")`,
    );
  }
  if (!anonKey.startsWith('eyJ')) {
    throw new SupabaseConfigurationError(
      'config_key_shape',
      'VITE_SUPABASE_ANON_KEY does not look like a JWT (must start with "eyJ").',
    );
  }

  return { url: url.replace(/\/+$/, ''), anonKey };
}


let _client: SupabaseClient | null = null;
let _config: SupabaseClientConfig | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const config = readSupabaseConfig();
  _config = config;
  debugLog('config', { url: config.url, anonKeyLen: config.anonKey.length });

  _client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'skillproof.auth',
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-client-info': 'skillproof-web' },
    },
    realtime: { params: { eventsPerSecond: 10 } },
  });

  debugLog('supabase client created');
  return _client;
}

export function getSupabaseConfig(): SupabaseClientConfig | null {
  return _config;
}


export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export const isSupabaseConfigured = true;

import {
  getVerificationBaseUrl as _getVerificationBaseUrl,
  getAppBaseUrl as _getAppBaseUrl,
} from '../utils/appUrl';

export const PUBLIC_URL = _getVerificationBaseUrl();
export const APP_URL = _getAppBaseUrl();


export function enableAuthDebug(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(DEBUG_KEY, '1'); } catch {  }
  
  console.log('[skillproof:auth] debug logging enabled. Refresh to see logs.');
}