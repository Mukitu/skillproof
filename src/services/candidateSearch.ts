import { companySupabase } from '../lib/supabaseCompany';

export type CandidateSort =
  | 'best_match'
  | 'ai_score'
  | 'verified_skills'
  | 'most_experience'
  | 'newest_profile'
  | 'relevance';

export type CandidateAIMatchSource =
  | 'job_match_results'
  | 'job_readiness_score'
  | null;

export interface CandidateListRow {
  profile_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  current_position: string | null;
  profession: string | null;
  current_organization: string | null;
  experience_years: number;
  education_degree: string | null;
  education_institution: string | null;
  district: string | null;
  division: string | null;
  country: string | null;
  declared_skills: string[];
  verified_skills: string[];
  verified_skill_count: number;
  completed_roadmap_count: number;
  certificate_count: number;
  ai_match_score: number | null;
  ai_match_source: CandidateAIMatchSource;
  match_score: number;
  matching_skill_names: string[];
  missing_skill_names: string[];
  created_at: string;
  total_count: number;
  matching_category_id: string | null;
  matching_sub_category_id: string | null;
}

export interface CandidateProfileCandidate {
  id: string;
  full_name: string;
  avatar_url: string | null;
  profession: string | null;
  current_position: string | null;
  current_organization: string | null;
  experience_years: number | null;
  experience_summary: string | null;
  district: string | null;
  division: string | null;
  country: string | null;
  bio: string | null;
  education_degree: string | null;
  education_institution: string | null;
  education_year: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  portfolio_url: string | null;
  phone: string | null;
  show_phone_on_verified_profile: boolean;
  hide_ai_on_verified_profile: boolean;
  hide_evidence_on_verified_profile: boolean;
  hide_timeline_on_verified_profile: boolean;
}

export interface CandidateProfileEducation {
  degree: string;
  institution: string;
  year: string | null;
  cgpa: string | null;
}

export interface CandidateProfileExperience {
  role: string;
  company: string;
  duration: string | null;
  summary: string | null;
}

export interface CandidateProfileSkill {
  name: string;
  category: string | null;
}

export interface CandidateProfileVerifiedSkill {
  skill_name: string;
  task_title: string;
  category_name: string | null;
  sub_category: string | null;
  score: number | null;
  verified_at: string | null;
}

export interface CandidateProfileRoadmap {
  title: string;
  category_name: string | null;
  sub_category_name: string | null;
  completion_pct: number;
  updated_at: string;
}

export interface CandidateProfileCertificate {
  credential_number: string;
  roadmap_title: string;
  category_name: string | null;
  sub_category_name: string | null;
  completion_date: string | null;
  issue_date: string | null;
}

export interface CandidateProfileEvidence {
  kind: string | null;
  title: string | null;
  url: string | null;
  added_at: string | null;
}

export interface CandidateProfileTimelineEvent {
  category: string | null;
  title: string | null;
  description: string | null;
  event_at: string | null;
  category_label: string | null;
  skill_label: string | null;
  result_label: string | null;
  score: number | null;
  certificate_number: string | null;
}

export interface CandidateProfileDetail {
  result: 'ok' | 'not_found' | 'forbidden';
  candidate: CandidateProfileCandidate;
  profile_completeness: number;
  declared_skills: CandidateProfileSkill[];
  verified_skills: CandidateProfileVerifiedSkill[];
  completed_roadmaps: CandidateProfileRoadmap[];
  certificates: CandidateProfileCertificate[];
  education: CandidateProfileEducation[];
  experience: CandidateProfileExperience[];
  public_evidence: CandidateProfileEvidence[];
  activity_timeline: CandidateProfileTimelineEvent[];
  ai_match_score: number | null;
  ai_match_source: CandidateAIMatchSource;
}

export interface CandidateSearchFilters {
  search?: string;
  skill?: string;
  skillCategory?: string;
  category?: string;
  location?: string;
  minExperience?: number;
  education?: string;
  jobId?: string | null;
  sort?: CandidateSort;
  offset?: number;
  limit?: number;
}

export const CANDIDATE_SORT_LABELS: Record<CandidateSort, { en: string; bn: string }> = {
  best_match:      { en: 'Best Match',         bn: 'সেরা ম্যাচ' },
  ai_score:        { en: 'Highest AI Score',   bn: 'সর্বোচ্চ এআই স্কোর' },
  verified_skills: { en: 'Most Verified Skills', bn: 'সবচেয়ে বেশি যাচাইকৃত দক্ষতা' },
  most_experience: { en: 'Most Experience',    bn: 'সবচেয়ে বেশি অভিজ্ঞতা' },
  newest_profile:  { en: 'Newest Profile',     bn: 'নতুন প্রোফাইল' },
  relevance:       { en: 'Relevance',          bn: 'প্রাসঙ্গিকতা' },
};

export const CANDIDATE_SKILL_CATEGORY_LABELS: Record<string, { en: string; bn: string }> = {
  technical:  { en: 'Technical', bn: 'টেকনিক্যাল' },
  tools:      { en: 'Tools',     bn: 'টুলস' },
  soft:       { en: 'Soft Skills', bn: 'সফট স্কিলস' },
  language:   { en: 'Language',  bn: 'ভাষা' },
};

export async function searchCompanyCandidates(
  filters: CandidateSearchFilters = {},
): Promise<{ rows: CandidateListRow[]; total: number }> {
  const { data, error } = await companySupabase.rpc('fn_company_search_candidates', {
    p_search:         (filters.search?.trim() || '') || null,
    p_skill:          (filters.skill?.trim()   || '') || null,
    p_skill_category: (filters.skillCategory?.trim() || '') || null,
    p_category:       (filters.category?.trim() || '') || null,
    p_location:       (filters.location?.trim() || '') || null,
    p_min_experience: filters.minExperience && filters.minExperience > 0 ? filters.minExperience : 0,
    p_education:      (filters.education?.trim() || '') || null,
    p_job_id:         filters.jobId ?? null,
    p_sort:           filters.sort ?? 'best_match',
    p_offset:         Math.max(0, filters.offset ?? 0),
    p_limit:          Math.max(1, Math.min(filters.limit ?? 24, 100)),
  });
  if (error) throw error;
  const rows = ((data as CandidateListRow[]) ?? []) as CandidateListRow[];
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return { rows, total };
}

export async function getCompanyCandidateProfile(
  profileId: string,
): Promise<CandidateProfileDetail | null> {
  if (!profileId) return null;
  const { data, error } = await companySupabase.rpc('fn_company_get_candidate_profile', {
    p_profile_id: profileId,
  });
  if (error) throw error;
  return (data as CandidateProfileDetail | null) ?? null;
}