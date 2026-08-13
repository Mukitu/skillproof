
import { supabase } from '../lib/supabase';
import type { SkillPassport, VerifiedSkill, VerifiedSkillCategory } from '../types/database';

const ALLOWED_CATEGORIES: VerifiedSkillCategory[] = ['skill', 'technology', 'tool', 'core_competency'];


export function getVerifiedSkills(passport: SkillPassport | null | undefined): VerifiedSkill[] {
  if (!passport) return [];
  const raw = (passport as any).verified_skills;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry: any): VerifiedSkill | null => {
      if (!entry || typeof entry !== 'object') return null;
      const name = String(entry.name ?? '').trim();
      if (!name) return null;
      const cat = String(entry.category ?? 'skill').toLowerCase();
      const category: VerifiedSkillCategory = (ALLOWED_CATEGORIES as string[]).includes(cat)
        ? (cat as VerifiedSkillCategory)
        : 'skill';
      const order = Number.isFinite(entry.order) ? Number(entry.order) : 0;
      return { name, category, order };
    })
    .filter((s: VerifiedSkill | null): s is VerifiedSkill => s !== null)
    .sort((a, b) => a.order - b.order);
}


export async function adminSetVerifiedSkills(
  passportId: string,
  skills: VerifiedSkill[],
): Promise<SkillPassport> {
  
  const seen = new Set<string>();
  const cleaned: VerifiedSkill[] = [];
  let order = 1;
  for (const s of skills) {
    const name = (s.name ?? '').trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    const category = (ALLOWED_CATEGORIES as string[]).includes(String(s.category).toLowerCase())
      ? (String(s.category).toLowerCase() as VerifiedSkillCategory)
      : 'skill';
    cleaned.push({ name, category, order });
    order += 1;
  }

  const { data, error } = await supabase.rpc('fn_admin_set_verified_skills', {
    p_passport_id: passportId,
    p_skills: cleaned as any,
  });
  if (error) throw new Error(error.message || 'Could not save verified skills.');
  return data as SkillPassport;
}


export type { VerifiedSkill, VerifiedSkillCategory };