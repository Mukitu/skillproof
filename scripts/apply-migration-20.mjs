#!/usr/bin/env node
/**
 * Apply migration 20 to promote mukituislamnishat@gmail.com to super_admin.
 * Requires service-role credentials in .env.
 *
 * Usage: node scripts/apply-migration-20.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || key === 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE') {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const sql = readFileSync('./supabase/migrations/20260725000020_promote_nishat_super_admin.sql', 'utf8');

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// Run via the pg_query RPC exposed in Supabase; fall back to direct fetch via PostgREST if needed.
const { data, error } = await admin.rpc('exec_sql', { sql });
if (error) {
  console.error('❌ RPC exec_sql failed. Run the SQL manually in the Supabase SQL editor:');
  console.error('   supabase/migrations/20260725000020_promote_nishat_super_admin.sql');
  console.error('   Detail:', error.message);
  process.exit(1);
}

console.log('✅ Migration 20 applied. mukituislamnishat@gmail.com is now super_admin.');

// Verify by reading the profile.
const { data: profile } = await admin
  .from('profiles')
  .select('email, role, role_status')
  .eq('email', 'mukituislamnishat@gmail.com')
  .maybeSingle();

console.log('Profile row:', profile);
