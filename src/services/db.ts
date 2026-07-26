/**
 * Backward-compat shim for legacy dbService calls.
 * Routes to the new Supabase-only services.
 */
import { uploadResume } from './profile';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './auth';

export const dbService = {
  async uploadResumeFile(file: File): Promise<string> {
    return uploadResume(file);
  },
  async getAICareerProfile(userId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('ai_career_profile')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return null;
    return (data as any)?.ai_career_profile ?? null;
  },
  async saveAICareerProfile(userId: string, profile: any): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ ai_career_profile: profile })
      .eq('user_id', userId);
    if (error) throw error;
  },
  async getCurrentUserId(): Promise<string | null> {
    const u = await getCurrentUser();
    return u?.id ?? null;
  },
  async getSkillPassportByNumberOrId(query: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('skill_passports')
      .select('*')
      .or(`passport_number.eq.${query},public_id.eq.${query}`)
      .maybeSingle();
    if (error) return null;
    return data ?? null;
  },
  async getNotifications(_userId: string): Promise<any[]> {
    const { listMyNotifications } = await import('./notifications');
    return listMyNotifications();
  },
};
