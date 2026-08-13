
import { supabase } from '../lib/supabase';
import type { Category, Difficulty, SubCategory, Skill, TaxonomyStatus } from '../types/database';

export async function listCategories(includeArchived = false): Promise<Category[]> {
  let q = supabase.from('categories').select('*').order('display_order', { ascending: true });
  if (!includeArchived) q = q.eq('status', 'Active');
  const { data, error } = await q;
  if (error) throw error;
  return (data as Category[]) ?? [];
}

export async function listSubCategories(categoryId?: string, includeArchived = false): Promise<SubCategory[]> {
  let q = supabase.from('sub_categories').select('*').order('display_order', { ascending: true });
  if (categoryId) q = q.eq('category_id', categoryId);
  if (!includeArchived) q = q.eq('status', 'Active');
  const { data, error } = await q;
  if (error) throw error;
  return (data as SubCategory[]) ?? [];
}

export async function listSkills(opts?: { categoryId?: string; subCategoryId?: string; includeArchived?: boolean }): Promise<Skill[]> {
  let q = supabase.from('skills').select('*').order('display_order', { ascending: true });
  if (opts?.categoryId) q = q.eq('category_id', opts.categoryId);
  if (opts?.subCategoryId) q = q.eq('sub_category_id', opts.subCategoryId);
  if (!opts?.includeArchived) q = q.eq('status', 'Active');
  const { data, error } = await q;
  if (error) throw error;
  return (data as Skill[]) ?? [];
}

export async function adminCreateCategory(input: {
  name: string; description?: string; icon?: string; display_order?: number; status?: TaxonomyStatus;
}): Promise<Category> {
  const { data, error } = await supabase.rpc('fn_admin_create_category', {
    p_name: input.name,
    p_description: input.description ?? null,
    p_icon: input.icon ?? 'Layers',
    p_display_order: input.display_order ?? 0,
    p_status: input.status ?? 'Active',
  });
  if (error) throw new Error(`Could not create category: ${error.message || 'Unknown error'}`);
  return data as Category;
}

export async function adminUpdateCategory(id: string, input: {
  name: string; description?: string; icon?: string; display_order?: number; status?: TaxonomyStatus;
}): Promise<Category> {
  const { data, error } = await supabase.rpc('fn_admin_update_category', {
    p_id: id,
    p_name: input.name,
    p_description: input.description ?? null,
    p_icon: input.icon ?? 'Layers',
    p_display_order: input.display_order ?? 0,
    p_status: input.status ?? 'Active',
  });
  if (error) throw new Error(`Could not update category: ${error.message || 'Unknown error'}`);
  return data as Category;
}

export async function adminDeleteCategory(id: string) {
  const { error } = await supabase.rpc('fn_admin_delete_category', { p_id: id });
  if (error) {
    
    throw new Error(`Could not delete category: ${error.message || 'Unknown error'}`);
  }
}

export async function adminCreateSubCategory(input: {
  category_id: string; name: string; description?: string; display_order?: number; status?: TaxonomyStatus;
}): Promise<SubCategory> {
  const { data, error } = await supabase.rpc('fn_admin_create_sub_category', {
    p_category_id: input.category_id,
    p_name: input.name,
    p_description: input.description ?? null,
    p_display_order: input.display_order ?? 0,
    p_status: input.status ?? 'Active',
  });
  if (error) throw new Error(`Could not create sub-category: ${error.message || 'Unknown error'}`);
  return data as SubCategory;
}

export async function adminUpdateSubCategory(id: string, input: {
  category_id: string; name: string; description?: string; display_order?: number; status?: TaxonomyStatus;
}): Promise<SubCategory> {
  const { data, error } = await supabase.rpc('fn_admin_update_sub_category', {
    p_id: id,
    p_category_id: input.category_id,
    p_name: input.name,
    p_description: input.description ?? null,
    p_display_order: input.display_order ?? 0,
    p_status: input.status ?? 'Active',
  });
  if (error) throw new Error(`Could not update sub-category: ${error.message || 'Unknown error'}`);
  return data as SubCategory;
}

export async function adminDeleteSubCategory(id: string) {
  const { error } = await supabase.rpc('fn_admin_delete_sub_category', { p_id: id });
  if (error) throw new Error(`Could not delete sub-category: ${error.message || 'Unknown error'}`);
}

export async function adminCreateSkill(input: {
  category_id: string; sub_category_id?: string | null; name: string;
  description?: string; icon?: string; max_level?: number; difficulty?: Difficulty;
  display_order?: number; status?: TaxonomyStatus;
}): Promise<Skill> {
  const { data, error } = await supabase.rpc('fn_admin_create_skill', {
    p_category_id: input.category_id,
    p_sub_category_id: input.sub_category_id ?? null,
    p_name: input.name,
    p_description: input.description ?? null,
    p_icon: input.icon ?? 'Award',
    p_max_level: input.max_level ?? 3,
    p_difficulty: input.difficulty ?? 'Medium',
    p_display_order: input.display_order ?? 0,
    p_status: input.status ?? 'Active',
  });
  if (error) throw new Error(`Could not create skill: ${error.message || 'Unknown error'}`);
  return data as Skill;
}

export async function adminUpdateSkill(id: string, input: {
  category_id: string; sub_category_id?: string | null; name: string;
  description?: string; icon?: string; max_level?: number; difficulty?: Difficulty;
  display_order?: number; status?: TaxonomyStatus;
}): Promise<Skill> {
  const { data, error } = await supabase.rpc('fn_admin_update_skill', {
    p_id: id,
    p_category_id: input.category_id,
    p_sub_category_id: input.sub_category_id ?? null,
    p_name: input.name,
    p_description: input.description ?? null,
    p_icon: input.icon ?? 'Award',
    p_max_level: input.max_level ?? 3,
    p_difficulty: input.difficulty ?? 'Medium',
    p_display_order: input.display_order ?? 0,
    p_status: input.status ?? 'Active',
  });
  if (error) throw new Error(`Could not update skill: ${error.message || 'Unknown error'}`);
  return data as Skill;
}

export async function adminDeleteSkill(id: string) {
  const { error } = await supabase.rpc('fn_admin_delete_skill', { p_id: id });
  if (error) throw new Error(`Could not delete skill: ${error.message || 'Unknown error'}`);
}


export async function adminDeleteCategorySafe(p_id: string) {
  const { data, error } = await supabase.rpc('fn_admin_delete_category', { p_id });
  if (error) throw new Error(`Could not delete category: ${error.message || 'Unknown error'}`);
  return data as { category_id: string; deleted_sub_categories: number; deleted_skills: number };
}

export async function adminDeleteSubCategorySafe(p_id: string) {
  const { data, error } = await supabase.rpc('fn_admin_delete_sub_category', { p_id });
  if (error) throw new Error(`Could not delete sub-category: ${error.message || 'Unknown error'}`);
  return data as { sub_category_id: string; deleted_skills: number };
}

export async function adminDeleteSkillSafe(p_id: string) {
  const { data, error } = await supabase.rpc('fn_admin_delete_skill', { p_id });
  if (error) throw new Error(`Could not delete skill: ${error.message || 'Unknown error'}`);
  return data as { skill_id: string };
}

export async function adminMoveSubCategory(p_id: string, p_new_category_id: string) {
  const { data, error } = await supabase.rpc('fn_admin_move_sub_category', {
    p_id, p_new_category_id,
  });
  if (error) throw new Error(`Could not move sub-category: ${error.message || 'Unknown error'}`);
  return data as SubCategory;
}

export async function adminMoveSkill(
  p_id: string,
  p_new_category_id: string,
  p_new_sub_category_id: string | null,
) {
  const { data, error } = await supabase.rpc('fn_admin_move_skill', {
    p_id, p_new_category_id, p_new_sub_category_id,
  });
  if (error) throw new Error(`Could not move skill: ${error.message || 'Unknown error'}`);
  return data as Skill;
}

export type TaxonomyLevel = 'categories' | 'sub_categories' | 'skills';

export async function adminReorderTaxonomy(
  p_level: TaxonomyLevel,
  p_ordered_ids: string[],
  p_scope_category_id: string | null = null,
  p_scope_sub_category_id: string | null = null,
) {
  const { data, error } = await supabase.rpc('fn_admin_reorder_taxonomy', {
    p_level,
    p_ordered_ids,
    p_scope_category_id,
    p_scope_sub_category_id,
  });
  if (error) throw new Error(`Could not reorder: ${error.message || 'Unknown error'}`);
  return data as number;
}

export async function adminSetTaxonomyStatus(
  p_level: TaxonomyLevel,
  p_id: string,
  p_status: TaxonomyStatus,
) {
  const { data, error } = await supabase.rpc('fn_admin_set_taxonomy_status', {
    p_level, p_id, p_status,
  });
  if (error) throw new Error(`Could not update status: ${error.message || 'Unknown error'}`);
  return data as number;
}

export async function adminTaxonomyStats(p_id: string) {
  const { data, error } = await supabase.rpc('fn_admin_taxonomy_stats', { p_id });
  if (error) throw new Error(`Could not load stats: ${error.message || 'Unknown error'}`);
  return data as { category_id: string; sub_categories: number; skills_direct: number; skills_via_sub: number };
}

export async function adminSubCategoryStats(p_id: string) {
  const { data, error } = await supabase.rpc('fn_admin_sub_category_stats', { p_id });
  if (error) throw new Error(`Could not load stats: ${error.message || 'Unknown error'}`);
  return data as { sub_category_id: string; skills: number };
}

export interface TaxonomyImportSummary {
  categories: number;
  sub_categories: number;
  skills: number;
}


export async function adminImportTaxonomyJson(payload: unknown): Promise<TaxonomyImportSummary> {
  const { data, error } = await supabase.rpc('fn_admin_import_taxonomy_json', {
    p_payload: payload as any,
  });
  if (error) {
    const message = (error.message || 'Unknown error').trim();
    throw new Error(message || 'Could not import JSON.');
  }
  return data as TaxonomyImportSummary;
}
