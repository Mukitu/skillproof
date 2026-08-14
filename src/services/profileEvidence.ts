/**
 * profileEvidence
 * ----------------
 * Manages a candidate's `profile_public_evidence` rows — the unlimited
 * live/demo project links that show up on the digitalized CV and on the
 * public /verify page.
 *
 * Rows are written/deleted via SECURITY DEFINER RPCs so the React app
 * never has to depend on direct table access (and the row owner check is
 * enforced server-side).
 */

import { supabase } from '../lib/supabase';

export type ProfileEvidenceType = 'github' | 'portfolio' | 'live_site' | 'demo' | 'other';

export interface ProfileEvidenceRow {
  id: string;
  title: string;
  url: string;
  type: ProfileEvidenceType;
  description: string | null;
  added_at: string;
}

export async function listMyProfileEvidence(): Promise<ProfileEvidenceRow[]> {
  const { data, error } = await supabase.rpc('fn_my_list_public_evidence');
  if (error) throw error;
  const rows = (data as ProfileEvidenceRow[] | null) ?? [];
  return rows;
}

export interface UpsertProfileEvidenceInput {
  id?: string | null;
  title: string;
  url: string;
  type?: ProfileEvidenceType;
  description?: string | null;
}

export async function upsertMyProfileEvidence(
  input: UpsertProfileEvidenceInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('fn_my_upsert_public_evidence', {
    p_id:          input.id ?? null,
    p_title:       input.title ?? '',
    p_url:         input.url ?? '',
    p_type:        input.type ?? 'other',
    p_description: input.description ?? null,
  });
  if (error) throw error;
  return (data as string) ?? '';
}

export async function deleteMyProfileEvidence(id: string): Promise<void> {
  const { error } = await supabase.rpc('fn_my_delete_public_evidence', {
    p_id: id,
  });
  if (error) throw error;
}