

export type UserRole = 'user' | 'admin' | 'super_admin';
export type ProfileStatus = 'active' | 'suspended' | 'deleted';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type SubscriptionStatus = 'Free' | 'Premium' | 'Trial';
export type Language = 'bn' | 'en';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  role_status: ProfileStatus;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  /**
   * Stable public Profile ID — random 16-byte hex string. Assigned
   * server-side by `public.fn_assign_public_profile_id` (trigger on
   * INSERT) and back-filled for legacy rows by migration
   * 20260809000009_multi_category_passport.sql. Same value for every
   * category passport the candidate holds. The canonical public URL
   * for the candidate's verified CV is /profile/<public_profile_id>.
   */
  public_profile_id?: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  district: string | null;
  division: string | null;
  country: string | null;
  profession: string | null;
  current_position: string | null;
  experience_years: number | null;
  experience_summary: string | null;
  education_degree: string | null;
  education_institution: string | null;
  education_year: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  website_url: string | null;
  resume_url: string | null;
  resume_storage_path: string | null;
  ai_last_analysis: string | null;
  skills: string[] | null;
  is_premium: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  premium_until: string | null;
  verification_status: VerificationStatus;
  subscription_status: SubscriptionStatus;
  language: Language;
  notification_settings: Record<string, boolean> | null;
  privacy_settings: Record<string, boolean> | null;
  // Verified-profile-specific phone gate. Defaults to false (hidden).
  show_phone_on_verified_profile: boolean;
  // Verified-profile per-section hide toggles. Defaults to false (visible).
  hide_ai_on_verified_profile: boolean;
  hide_evidence_on_verified_profile: boolean;
  hide_timeline_on_verified_profile: boolean;
  // Per-field privacy gates for sensitive PII on the public CV.
  show_gender_on_verified_profile?: boolean;
  show_dob_on_verified_profile?: boolean;
  show_address_on_verified_profile?: boolean;
  // Extended fields (may not yet be saved by all users; nullable).
  current_organization?: string | null;
  total_experience?: number | null;
  languages?: string[] | null;
  main_category?: string | null;
  created_at: string;
  updated_at: string;
}

export type TaxonomyStatus = 'Active' | 'Archived' | 'Draft';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  status: TaxonomyStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: TaxonomyStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  category_id: string | null;
  sub_category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  max_level: number;
  difficulty: Difficulty;
  status: TaxonomyStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type AssessmentStatus = 'Pending' | 'Submitted' | 'Expired' | 'Cancelled';
export type SubmissionStatus = 'Pending Review' | 'Passed' | 'Failed';
export type AssessmentType = 'coding' | 'practical';

export interface UniversalAssessment {
  id: string;
  user_id: string;
  skill_id: string;
  skill_name: string | null;
  category_name: string | null;
  sub_category_name: string | null;
  experience_level: string | null;
  additional_info: string | null;
  mandatory_description: string | null;
  title: string;
  description: string;
  assessment_type: AssessmentType;
  difficulty: Difficulty;
  requirements: string[];
  evaluation_criteria: string[];
  estimated_time: string | null;
  required_technologies: string[];
  status: AssessmentStatus;
  submitted_at: string | null;
  expires_at: string;
  created_at: string;
}

export type EvidenceKind = 'link' | 'file';
export type EvidenceLabel =
  | 'github' | 'gitlab' | 'behance' | 'dribbble' | 'gdrive' | 'onedrive' | 'dropbox'
  | 'portfolio' | 'website' | 'file';

export interface UniversalAssessmentEvidence {
  id: string;
  submission_id: string;
  kind: EvidenceKind;
  label: EvidenceLabel;
  url: string | null;
  storage_path: string | null;
  bucket: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  display_name: string | null;
  created_at: string;
}

export interface UniversalSubmission {
  id: string;
  user_id: string;
  assessment_id: string;
  submission_links: Record<string, string>;
  file_url: string | null;
  file_name: string | null;
  description: string | null;
  status: SubmissionStatus;
  score: number | null;
  strengths: string | null;
  weaknesses: string | null;
  improvement: string | null;
  feedback: string | null;
  recommendation: string | null;
  evidence_reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PassportStatus = 'active' | 'suspended' | 'archived' | 'pending_approval' | 'rejected';
export type EvidenceStrength = 'Basic' | 'Moderate' | 'Strong' | 'Verified Expert';


export type PassportLevel = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';


export type PassportRenewalStatus = 'not_required' | 'requested' | 'renewed' | 'expired';

export interface SkillPassport {
  id: string;
  passport_number: string;
  user_id: string;
  skill_id: string;
  current_level: number;
  verification_score: number | null;
  evidence_strength: EvidenceStrength;
  integrity_score: number | null;
  verification_count: number;
  last_verified_at: string | null;
  public_id: string;
  status: PassportStatus;
  title: string;
  is_verified: boolean;
  qr_code_data: string | null;
  reject_reason: string | null;
  admin_feedback: string | null;
  digital_signature: string | null;
  completed_projects: any[];
  created_at: string;
  updated_at: string;
  
  
  category_id: string | null;
  
  main_category_name: string | null;
  
  level: PassportLevel;
  
  passed_count: number;
  
  average_marks: number;
  
  overall_score: number;
  
  issue_date: string | null;
  
  expiry_date: string | null;
  
  renewal_status: PassportRenewalStatus;
  
  skill_tags: string[];
  
  verified_skills: VerifiedSkill[];
  
  signed_at: string | null;
  
  signed_by: string | null;
  
  revisions_requested: string | null;
  
  requested_manually: boolean;
  
  requested_at: string | null;
  
  renewed_at: string | null;
  
  renewed_by: string | null;
  
  
  verification_uuid: string | null;
  
  verification_hash: string | null;
  
  credential_hash: string | null;
  
  hash_timestamp: string | null;
  
  verification_token: string | null;
  
  blockchain_network: string | null;
  
  blockchain_tx_id: string | null;
  
  
  motivation: string | null;
  
  
  privacy_settings: Record<string, boolean> | null;
}




export interface PrivacySettings {
  
  public_employer_view?: boolean;
  
  show_assessment_history?: boolean;
  
  show_ai_career_profile?: boolean;
  
  show_evidence?: boolean;
}





export type PublicVerificationResult =
  | 'verified'
  | 'expired'
  | 'pending_approval'
  | 'archived'
  | 'suspended'
  | 'rejected'
  | 'not_found'
  | 'private';

export interface PublicCandidate {
  full_name: string;
  avatar_url: string | null;
  current_position: string | null;
  profession: string | null;
  country: string | null;
  district: string | null;
  division?: string | null;
  main_category: string | null;
  skill_tags: string[];
  experience_years?: number | null;
  total_experience?: number | null;
  experience_summary?: string | null;
  education_degree?: string | null;
  education_institution?: string | null;
  education_year?: string | null;
  current_organization?: string | null;
  languages?: string[];
  bio?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  email_verified?: boolean | null;
  public_employer_view?: boolean | null;
  // Per-field privacy flags — opt-in toggles from settings.
  show_phone_on_verified_profile?: boolean;
  show_gender_on_verified_profile?: boolean;
  show_dob_on_verified_profile?: boolean;
  show_address_on_verified_profile?: boolean;
  // Per-section hide toggles.
  hide_ai_on_verified_profile?: boolean;
  hide_evidence_on_verified_profile?: boolean;
  hide_timeline_on_verified_profile?: boolean;
  // Privacy-gated values. Each is null when the corresponding
  // show_*_on_verified_profile toggle is false.
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  // Phone is opt-in. Backend returns null (and the frontend omits rendering)
  // when the candidate has not enabled the public visibility toggle.
  phone?: string | null;
}

export interface PublicVerifiedSkill {
  skill_name: string;
  category: string | null;
  sub_category: string | null;
  score: number | null;
  marks: number | null;
  skill_level: string | null;
  pass_status: string;
  verified_at: string | null;
  primary_skill: string | null;
}

export interface PublicVerifiedCategorySkill {
  skill_name: string;
  task_title: string | null;
  sub_category: string | null;
  score: number | null;
  skill_level: string | null;
  verified_at: string | null;
  pass_status: string;
}

export interface PublicVerifiedCategory {
  category: string;
  skill_count: number;
  average_score: number | null;
  latest_verified_at: string | null;
  first_verified_at: string | null;
  all_passed: boolean;
  completed_roadmaps: number;
  skills: PublicVerifiedCategorySkill[];
}

export interface PublicVerifiedCareerSummaryItem {
  category_id: string;
  category_name: string;
  category_slug: string;
  verified_skill_count: number;
  average_score: number | null;
  latest_verified_at: string | null;
}

export interface PublicCompletedRoadmap {
  roadmap_title: string;
  category: string | null;
  sub_category: string | null;
  started_at: string | null;
  completed_at: string | null;
  completion_percentage: number | null;
  credential_number: string | null;
  certificate_issued_at: string | null;
  certificate_status: string | null;
}

export interface PublicAssessmentHistoryItem {
  task_title: string;
  category: string | null;
  sub_category: string | null;
  score: number | null;
  marks: number | null;
  pass_status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
}

export interface PublicAssessmentSummary {
  total_attempts: number;
  passed: number;
  failed: number;
  average_score: number | null;
  strength_areas: string[];
  improvement_areas: string[];
}

export interface PublicAiCareerProfile {
  career_readiness: string;
  ats_score: number | null;
  profile_completion: number | null;
  skill_strengths: string[];
  recommended_skills: string[];
  career_summary: string | null;
  last_updated: string | null;
}

export type PublicEvidenceType = 'github' | 'portfolio' | 'live_site' | 'demo' | 'other';

export interface PublicEvidenceItem {
  title: string;
  url: string;
  type: PublicEvidenceType;
  added_at: string;
}

export interface PublicCandidateVerification {

  kind?: 'passport' | 'certificate' | 'not_found';
  result: PublicVerificationResult;
  reason?: string | null;
  passport_number?: string;
  verification_uuid?: string | null;
  verification_hash?: string | null;
  public_id?: string | null;
  verification_url?: string;
  verified_at?: string | null;
  verified_by_skillproof?: boolean;
  status?: string;
  level?: PassportLevel;
  overall_score?: number | null;
  average_marks?: number | null;
  passed_count?: number | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  digital_signature?: string | null;
  revoked_at?: string | null;
  revoked_reason?: string | null;
  candidate?: PublicCandidate;
  verified_skills?: PublicVerifiedSkill[];

  /**
   * Stable public Profile ID for this candidate (random hex). Same for
   * every passport the candidate holds. The canonical public URL for
   * the candidate's CV is `/profile/<public_profile_id>`.
   */
  public_profile_id?: string | null;

  /**
   * Every category passport this candidate holds (active, pending,
   * archived, suspended — never `rejected`). One row per (user, category)
   * pair. Drives the multi-passport summary on the public CV. Each row
   * carries its own status, level, score, expiry, and category metadata
   * so the visitor can see at a glance which categories the candidate
   * is verified in.
   */
  passports?: PublicCandidatePassportItem[];
  // Grouped view: one passport, many categories, each category
  // contains its verified skills. Computed server-side via GROUP BY
  // over verified_skills.category. Empty when the user has no passes.
  verified_categories?: PublicVerifiedCategory[];
  // Flat per-career summary: every broad career category where the
  // candidate has at least one verified skill, with aggregate counts.
  // Drives the "Career Categories" chip row on the public Passport.
  verified_career_summary?: PublicVerifiedCareerSummaryItem[];
  completed_roadmaps?: PublicCompletedRoadmap[];
  assessment_history?: PublicAssessmentHistoryItem[];
  assessment_summary?: PublicAssessmentSummary | null;
  ai_career_profile?: PublicAiCareerProfile | null;
  public_evidence?: PublicEvidenceItem[];
  career_timeline?: PublicCareerTimelineEvent[];

  

  
  resume_professional?: PublicResumeProfessional | null;
  
  education?: PublicEducationItem[];
  
  experience?: PublicExperienceItem[];
  
  technologies?: PublicTechnologyItem[];
  
  completed_verifications?: PublicAssessmentHistoryItem[];
  
  roadmap_progress_items?: PublicRoadmapProgressItem[];
  
  projects?: PublicProjectItem[];
  
  certificates?: PublicCertificateItem[];

  career_strengths?: string[];

  areas_for_improvement?: string[];

  job_readiness?: PublicJobReadiness | null;

  profile_completeness?: PublicProfileCompleteness | null;

  passport_history?: PublicPassportHistory;

  activity_timeline?: PublicCareerTimelineEvent[];

  verification_summary?: PublicVerificationSummary | null;

  ats_score?: number | null;

  // Top-level mirror of candidate.show_phone_on_verified_profile.
  // The candidate's phone number is exposed ONLY when this is true.
  show_phone_on_verified_profile?: boolean;
  // Top-level mirrors of the per-section hide toggles.
  hide_ai_on_verified_profile?: boolean;
  hide_evidence_on_verified_profile?: boolean;
  hide_timeline_on_verified_profile?: boolean;
  // Top-level mirrors of per-field privacy toggles.
  show_gender_on_verified_profile?: boolean;
  show_dob_on_verified_profile?: boolean;
  show_address_on_verified_profile?: boolean;

  // Career Intelligence — same shape that the dashboard endpoint
  // `/api/ai-career-intelligence` returns. Surfaced on the public
  // verified profile so a recruiter can see the full AI signal.
  career_intelligence?: PublicCareerIntelligenceSections | null;
  career_intelligence_meta?: PublicCareerIntelligenceMeta | null;
}

export interface PublicCareerIntelligenceSections {
  career_summary: string;
  career_level: string;
  overall_score: number;
  employability_score: number;
  hiring_readiness: number;
  top_strengths: Array<{ skill: string; score: number; reason: string }>;
  skill_gaps: Array<{
    skill: string;
    current_level: number;
    gap_level: number;
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  career_matches: Array<{
    role: string;
    match_percentage: number;
    reason: string;
    missing_skills: string[];
    next_step: string;
  }>;
  market_readiness: { score: number; summary: string };
  improvement_plan: {
    days_30: string[];
    days_60: string[];
    days_90: string[];
  };
  ai_summary: string;
  profile_completeness?: { percent: number; explanation?: string; missing_sections?: string[] } | null;
}

export interface PublicCareerIntelligenceMeta {
  baseline: {
    employability_score: number;
    hiring_probability: number;
    career_readiness: number;
    technical_strength: number;
    soft_skill_strength: number;
    employability_label: number;
    employability_label_name: string;
    model_version: string;
    selected_regressor: string;
    selected_classifier: string;
  };
  engine: string;
  degraded: boolean;
}

export interface PublicResumeProfessional {
  full_name: string | null;
  headline: string | null;
  profession: string | null;
  current_position: string | null;
  experience_years: string | null;
  summary: string | null;
  skills_count: number | null;
  projects_count: number | null;
  experience_count: number | null;
  education_count: number | null;
  certifications_count: number | null;
  source_file_name: string | null;
  last_parsed_at: string | null;
}

export interface PublicEducationItem {
  id: string;
  degree: string;
  institution: string;
  year: string | null;
  cgpa: string | null;
  created_at: string | null;
}

export interface PublicExperienceItem {
  id: string;
  role: string;
  company: string;
  duration: string | null;
  summary: string | null;
  created_at: string | null;
}

export interface PublicTechnologyItem {
  id: string;
  name: string;
  category: string | null;
  created_at: string | null;
}

export interface PublicRoadmapProgressItem {
  day_title: string | null;
  task_summary: string | null;
  roadmap_title: string | null;
  category: string | null;
  completed_at: string | null;
  is_completed: boolean | null;
  day_index: number | null;
}

export interface PublicProjectItem {
  name: string | null;
  description: string | null;
  technologies: unknown;
  tech_stack: string | null;
  url: string | null;
  role: string | null;
}

export interface PublicCertificateItem {
  credential_number: string;
  roadmap_title: string;
  category_name: string | null;
  sub_category_name: string | null;
  roadmap_started_at: string | null;
  completion_date: string | null;
  issue_date: string | null;
  completion_duration_days: number | null;
  status: string;
  revoked_reason: string | null;
  revoked_at: string | null;
  admin_name_snapshot: string | null;
  verification_uuid: string;
  verification_token: string;
}

export interface PublicJobReadiness {
  job_readiness_score: number | null;
  ats_score: number | null;
  ats_compatibility_score: number | null;
  career_readiness: string;
  percentile: string;
}

export interface PublicProfileCompleteness {
  score: number | null;
  level: string;
}

export interface PublicPassportHistory {
  level_history: Array<{
    old_level: string;
    new_level: string;
    reason: string | null;
    changed_at: string;
  }>;
  renewal_history: Array<{
    requested_at: string;
    decided_at: string | null;
    decision: string | null;
    admin_notes: string | null;
    old_expiry: string | null;
    new_expiry: string | null;
  }>;
}

export interface PublicVerificationSummary {
  passport_id: string;
  passport_number: string;
  issued_at: string | null;
  expires_at: string | null;
  level: string | null;
  overall_score: number | null;
  passed_count: number | null;
  average_marks: number | null;
  verified_by: string;
  signature_present: boolean;
  status: string;
}


export type VerifiedSkillCategory = 'skill' | 'technology' | 'tool' | 'core_competency';

export interface VerifiedSkill {
  name: string;
  category: VerifiedSkillCategory;
  order: number;
}


export type AdminPermissionKey =
  | 'passport.review'
  | 'passport.renew'
  | 'passport.suspend'
  | 'assessment.review'
  | 'assessment.score'
  | 'category.manage'
  | 'roadmap.manage'
  | 'roadmap.publish'
  | 'job.manage'
  | 'job.publish'
  | 'analytics.view'
  | 'audit.view'
  | 'user.suspend'
  | 'user.activate'
  | 'user.premium';

export interface AdminPermission {
  id: string;
  profile_id: string;
  permission: AdminPermissionKey;
  granted_by: string | null;
  granted_at: string;
}

export type EmployerVerificationResult = 'verified' | 'invalid' | 'expired' | 'suspended';

export interface EmployerVerification {
  id: string;
  passport_id: string | null;
  passport_number: string | null;
  verification_id: string | null;
  result: EmployerVerificationResult;
  ip_address: string | null;
  user_agent: string | null;
  browser: string | null;
  device: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  referer: string | null;
  created_at: string;
}

export type ActivityEventKind =
  | 'account.created'
  | 'profile.updated'
  | 'avatar.uploaded'
  | 'avatar.removed'
  | 'resume.uploaded'
  | 'ai_career.generated'
  | 'ai_career.applied'
  | 'career_analysis.generated'
  | 'roadmap.started'
  | 'roadmap.day_completed'
  | 'roadmap.completed'
  | 'assessment.created'
  | 'assessment.submitted'
  | 'assessment.passed'
  | 'assessment.failed'
  | 'assessment.reviewed'
  | 'verification.created'
  | 'verification.passed'
  | 'verification.failed'
  | 'passport.requested'
  | 'passport.approved'
  | 'passport.rejected'
  | 'passport.renewed'
  | 'passport.downloaded'
  | 'job.applied'
  | 'job.saved'
  | 'job.match_viewed'
  | 'job_match.generated'
  | 'ai_mentor.message_sent'
  | 'notification.sent'
  | 'login.success'
  | 'login.failed'
  | 'password.changed'
  | 'admin.role_changed';

export interface ActivityEvent {
  id: string;
  profile_id: string | null;
  user_id: string | null;
  kind: ActivityEventKind;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}


export interface PassportLevelHistory {
  id: string;
  passport_id: string;
  old_level: PassportLevel;
  new_level: PassportLevel;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
}


export interface PassportRenewalHistory {
  id: string;
  passport_id: string;
  requested_at: string;
  decided_at: string | null;
  decision: 'renewed' | 'rejected' | null;
  admin_notes: string | null;
  requested_by: string | null;
  decided_by: string | null;
  old_expiry: string | null;
  new_expiry: string | null;
}




export type RoadmapModuleExamSubmissionStatus =
  | 'Pending Review' | 'Under Review' | 'Passed' | 'Failed';


export interface RoadmapModuleExam {
  id: string;
  template_id: string;
  day_number: number;
  exam_enabled: boolean;
  exam_title: string | null;
  exam_instructions: string | null;
  max_marks: number;
  pass_marks: number;
  allow_text_answer: boolean;
  allow_submission_url: boolean;
  created_at: string;
  updated_at: string;
}


export interface RoadmapModuleExamSubmission {
  id: string;
  user_id: string;
  roadmap_id: string;
  template_day_number: number;
  enrollment_id: string;
  exam_id: string;
  answer_text: string | null;
  submission_url: string | null;
  marks: number | null;
  reviewer_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  status: RoadmapModuleExamSubmissionStatus;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}


export interface RoadmapModuleExamSubmissionPayload {
  answer_text?: string | null;
  submission_url?: string | null;
}


export interface RoadmapModuleExamUpsertPayload {
  template_id: string;
  day_number: number;
  exam_enabled: boolean;
  exam_title?: string | null;
  exam_instructions?: string | null;
  max_marks: number;
  pass_marks: number;
  allow_text_answer: boolean;
  allow_submission_url: boolean;
}


export interface RoadmapModuleExamSubmissionWithContext extends RoadmapModuleExamSubmission {
  exam_title: string | null;
  exam_instructions: string | null;
  exam_max_marks: number | null;
  exam_pass_marks: number | null;
  allow_text_answer: boolean | null;
  allow_submission_url: boolean | null;
  roadmap_title: string | null;
  roadmap_thumbnail_url: string | null;
  category_id: string | null;
  category_name: string | null;
  user_full_name: string | null;
  user_email: string | null;
  user_avatar_url: string | null;
  reviewer_full_name: string | null;
}


export interface PassportCategoryEligibility {
  category_id: string;
  category_name: string;
  passed_count: number;
  average_marks: number;
  is_eligible: boolean;
  has_pending_passport: boolean;
  has_active_passport: boolean;
}


export interface PassportOverviewJoined {
  passport: SkillPassport;
  profile: Profile | null;
  ai_career: AICareerProfileData | null;
  educations: Array<{ id: string; degree: string | null; institution: string | null; year: string | null; cgpa: string | null }>;
  experiences: Array<{ id: string; role: string | null; company: string | null; duration: string | null; summary: string | null }>;
  user_skills: Array<{ id: string; name: string; category: string | null }>;
  verifications: SkillVerificationMySubmission[];
  level_history: PassportLevelHistory[];
  renewal_history: PassportRenewalHistory[];
}

export type RoadmapTemplateStatus = 'Draft' | 'Published' | 'Archived';

export type RoadmapVideoProvider = 'youtube' | 'embed';

export interface RoadmapResource {
  label?: string;
  url?: string;
  description?: string;
}

export interface RoadmapTemplateDay {
  id: string;
  template_id: string;
  day_number: number;
  title: string;
  description: string | null;
  estimated_minutes: number;
  learning_objectives: string[];
  instructions: string[];
  practice_tasks: string[];
  notes: string | null;
  extra_resources: RoadmapResource[];
  video_title: string | null;
  video_url: string | null;
  video_provider: RoadmapVideoProvider | null;
  
  study_materials: string[];
  video_links: string[];
  pdfs: string[];
  mini_project: string | null;
  assignment: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoadmapTemplate {
  id: string;
  category_id: string | null;
  sub_category_id: string | null;
  title: string;
  description: string | null;
  total_days: number;
  difficulty: Difficulty;
  status: RoadmapTemplateStatus;
  version: number;
  thumbnail_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  
  deleted_at: string | null;
}


export interface CareerRoadmapEnrollment {
  id: string;
  user_id: string;
  template_id: string;
  category_id: string | null;
  sub_category_id: string | null;
  title: string;
  total_days: number;
  started_at: string;
  status: 'active' | 'completed' | 'archived';
  current_day: number;
  completed_count: number;
  completion_pct: number;
  
  
  
  
  
  difficulty: string | null;
  thumbnail_url: string | null;
  category_name: string | null;
  sub_category_name: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}


export interface CareerRoadmapModule {
  id: string;
  enrollment_id: string;
  template_id: string;
  day_number: number;
  title: string;
  description: string | null;
  estimated_minutes: number;
  unlock_at: string;
  created_at: string;
}

export interface CareerRoadmapProgress {
  id: string;
  user_id: string;
  enrollment_id: string;
  template_id: string;
  day_number: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}




export type RoadmapCompletionStatus = 'Pending' | 'Approved' | 'Rejected';


export interface RoadmapCompletionRequest {
  id: string;
  user_id: string;
  roadmap_id: string;
  enrollment_id: string;
  category_id: string | null;
  total_days: number;
  completed_days: number;
  completion_percentage: number;
  exams_total: number;
  exams_passed: number;
  request_status: RoadmapCompletionStatus;
  feedback: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  requested_at: string;
  created_at: string;
  updated_at: string;
}


export interface RoadmapCompletionRequestWithContext extends RoadmapCompletionRequest {
  profile_full_name: string | null;
  profile_email: string | null;
  profile_avatar_url: string | null;
  roadmap_title: string | null;
  roadmap_thumbnail_url: string | null;
  category_name: string | null;
  reviewer_full_name: string | null;
}


export interface RoadmapCompletionModuleProgress {
  module_id: string;
  enrollment_id: string;
  day_number: number;
  title: string;
  description: string | null;
  estimated_minutes: number;
  is_completed: boolean;
  completed_at: string | null;
  unlocked_at: string | null;
  has_exam: boolean;
}

export type JobType = 'Full-time' | 'Part-time' | 'Remote' | 'Contract' | 'Internship';
export type JobStatus = 'Active' | 'Closed' | 'Draft';
export type JobExperienceLevel = 'Entry' | 'Mid' | 'Senior' | 'Lead' | 'Director' | 'Any';
export type JobSource = 'LinkedIn' | 'bdjobs' | 'BDApps' | 'Company Website' | 'Other';
export type ApplicationStatus = 'Submitted' | 'Under Review' | 'Interviewing' | 'Accepted' | 'Rejected';

export interface Job {
  id: string;
  title: string;
  company_name: string;
  company_logo: string | null;
  location: string;
  job_type: JobType;
  salary_range: string;
  required_skills: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  status: JobStatus;
  
  workplace: string | null;
  experience_level: JobExperienceLevel | string | null;
  education: string | null;
  benefits: string[];
  deadline: string | null;
  application_url: string | null;
  source: JobSource | string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedJob {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
}

export interface JobApplication {
  id: string;
  job_id: string;
  user_id: string;
  status: ApplicationStatus;
  cover_letter: string | null;
  resume_url: string | null;
  applied_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type:
    | 'info' | 'success' | 'warning' | 'error'
    | 'passport_upgrade' | 'project_review'
    | 'module_exam' | 'module_exam_passed' | 'module_exam_failed'
    | 'course_cert_issued' | 'course_cert_revoked' | 'course_cert_restored'
    | 'roadmap_published' | 'roadmap_assigned' | 'roadmap_available'
    | 'skill_verification_published'
    | 'verification_approved' | 'verification_rejected' | 'verification_feedback'
    | 'job_published'
    | 'passport_approved' | 'passport_rejected' | 'passport_revision'
    | 'interview_scheduled' | 'interview_completed' | 'interview_cancelled'
    | 'message_received';
  is_read: boolean;
  link: string | null;
  icon: string | null;
  action_url: string | null;
  read_at: string | null;
  entity_id: string | null;
  entity_type: string | null;
  dedup_key: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any>;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  ip: string | null;
  user_agent: string | null;
  browser: string | null;
  created_at: string;
}




export type SkillVerificationTaskStatus = 'Draft' | 'Published' | 'Archived';
export type SkillVerificationSubmissionStatus =
  | 'Submitted' | 'Under Review' | 'Passed' | 'Failed';

export interface SkillVerificationTask {
  id: string;
  category_id: string;
  sub_category_id: string | null;
  title: string;
  description: string;
  submission_instructions: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  assessment_type: 'Coding' | 'Project' | 'Practical' | 'Portfolio';
  estimated_time: string | null;
  max_marks: number;       
  pass_marks: number;      
  status: SkillVerificationTaskStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillVerificationSubmission {
  id: string;
  user_id: string;
  task_id: string;
  answer_text: string;
  project_url: string | null;
  status: SkillVerificationSubmissionStatus;
  score: number | null;    
  feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}


export interface SkillVerificationSubmissionWithContext extends SkillVerificationSubmission {
  task_title: string | null;
  task_description: string | null;
  task_max_marks: number | null;
  task_pass_marks: number | null;
  category_id: string | null;
  category_name: string | null;
  sub_category_id: string | null;
  sub_category_name: string | null;
  user_email: string | null;
  user_full_name: string | null;
  reviewed_by_full_name: string | null;
}


export interface SkillVerificationMySubmission extends SkillVerificationSubmission {
  task_title: string | null;
  task_description: string | null;
  task_max_marks: number | null;
  task_pass_marks: number | null;
  category_id: string | null;
  category_name: string | null;
  sub_category_id: string | null;
  sub_category_name: string | null;
  reviewed_by_full_name: string | null;
}


export interface SkillVerificationDeleteResult {
  ok: boolean;
  cascaded?: boolean;
  blocked?: boolean;
  code?: string;
  error?: string;
  template_id?: string;
  dependents?: {
    submissions: number;
  };
  deleted?: {
    submissions: number;
  };
}

export interface SkillVerificationTaskStats {
  template_id: string;
  template_title: string;
  has_dependents: boolean;
  dependents: {
    submissions: number;
  };
}






export interface ParsedCVPersonal {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  address?: string;
  bio?: string;
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
}


export interface ParsedCVLanguage {
  name?: string;
  proficiency?: string;
}

export interface ParsedCVEducation {
  degree?: string;
  institution?: string;
  year?: string;
  cgpa?: string;
}

export interface ParsedCVExperience {
  role?: string;
  company?: string;
  duration?: string;
  summary?: string;
}

export interface ParsedCVProject {
  title?: string;
  techStack?: string;
  description?: string;
}

export interface ParsedCVSkills {
  technical?: string[];
  soft?: string[];
  tools?: string[];
  languages?: string[];
}


export interface ParsedCVProfile {
  personal_information: ParsedCVPersonal;
  education: ParsedCVEducation[];
  experience: ParsedCVExperience[];
  projects: ParsedCVProject[];
  skills: ParsedCVSkills;
  languages?: ParsedCVLanguage[];
  certifications: string[];
  achievements: string[];
  resume_summary: string;
  career_objective: string;
  missing_skills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  ats_score: number;
  resume_score: number;
  job_readiness_score: number;
  profile_completion: number;
}


export interface ConfidenceScore {
  overall: number;
  by_field: Record<string, number>;
}


export interface ResumeParsedData {
  id: string;
  user_id: string;
  parsed_json: ParsedCVProfile;
  confidence_json: ConfidenceScore;
  source_file_name: string | null;
  created_at: string;
}






export interface CareerAIReportScores {
  
  overall_resume_score: number;
  career_score: number;
  resume_strength_score: number;
  ats_compatibility_score: number;
  technical_skill_score: number;
  
  skill_strength: number;
  communication_score: number;
  project_quality_score: number;
  portfolio_score: number;
  job_readiness_score: number;
  profile_completion: number;
}


export interface CareerImprovementPlan {
  '30_day': string[];
  '60_day': string[];
  '90_day': string[];
}


export interface CareerAIReport {
  id: string;
  user_id: string;
  parsed_data_id: string | null;
  scores: CareerAIReportScores;
  strong_skills: string[];
  weak_skills: string[];
  missing_skills: string[];
  recommended_skills: string[];
  technical_skills: string[];
  soft_skills: string[];
  skill_gap_analysis: string[];
  best_job_roles: string[];
  recommendations: string[];
  resume_strengths: string[];
  resume_weaknesses: string[];
  project_suggestions: string[];
  certification_suggestions: string[];
  portfolio_suggestions: string[];
  github_suggestions: string[];
  linkedin_suggestions: string[];
  interview_readiness: string[];
  priority_checklist: string[];
  weakness_alerts: string[];
  career_level: string | null;
  experience_level: string | null;
  salary_estimate_bd: string | null;
  ai_recommended_career_path: string | null;
  ai_summary_bn: string | null;
  
  career_report_bn: string;
  improvement_plan: CareerImprovementPlan;
  
  top_match_job_id: string | null;
  top_match_score: number | null;
  last_analysis_at: string | null;
  input_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}


export interface AICareerProfileData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  education?: Array<{ degree?: string; institution?: string; year?: string; cgpa?: string }>;
  experience?: Array<{ role?: string; company?: string; duration?: string; summary?: string }>;
  skills?: string[];
  projects?: Array<{ title?: string; techStack?: string; description?: string }>;
  certifications?: string[];
  languages?: string[];
  careerInterests?: string[];
  missingSkills?: string[];
  strengths?: string[];
  weaknesses?: string[];
  target_roles?: string[];
  targetRole?: string;
  completeness_score?: number;
  extraction_confidence?: number;
  improvement_suggestions?: string[];
  website?: string;
  linkedin?: string;
  github?: string;
  [key: string]: any;
}






export type CourseCertificateStatus = 'Active' | 'Revoked' | 'Superseded';


export type CertificateActionKind =
  | 'Issued' | 'Reissued' | 'Revoked' | 'Restored' | 'StatusChanged';


export type CertificateDownloadFormat = 'pdf' | 'png';


export type CertificateVerificationResult = 'verified' | 'revoked' | 'not_found';


export interface CourseCertificate {
  id: string;
  user_id: string;
  roadmap_id: string;
  enrollment_id: string;
  completion_request_id: string | null;

  
  
  user_full_name: string;
  user_avatar_url: string | null;
  roadmap_title: string;
  category_id: string | null;
  category_name: string | null;
  sub_category_id: string | null;
  sub_category_name: string | null;

  
  credential_number: string;

  
  roadmap_started_at: string;
  completion_date: string;
  issue_date: string;

  
  completion_duration_days: number;

  status: CourseCertificateStatus;
  revoked_at: string | null;
  revoked_reason: string | null;
  revoked_by: string | null;

  issued_by: string | null;
  admin_name_snapshot: string | null;
  admin_feedback: string | null;

  
  verification_uuid: string;
  verification_hash: string;
  certificate_hash: string;

  
  verification_token: string;

  
  download_count: number;
  verification_count: number;

  created_at: string;
  updated_at: string;
}


export interface CertificateDownloadLog {
  id: string;
  certificate_id: string;
  user_id: string | null;
  format: CertificateDownloadFormat;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  created_at: string;
}


export interface CertificateVerificationLog {
  id: string;
  certificate_id: string | null;
  
  credential_number: string;
  result: CertificateVerificationResult;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  country: string | null;
  city: string | null;
  created_at: string;
}


export interface CertificateActionHistory {
  id: string;
  certificate_id: string;
  action: CertificateActionKind;
  actor_id: string | null;
  actor_name_snapshot: string | null;
  reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
}


export interface CourseCertificateWithContext extends CourseCertificate {
  user_email: string | null;
  user_avatar_url_joined: string | null;
  roadmap_thumbnail_url: string | null;
  
  last_action: CertificateActionKind | null;
  last_action_at: string | null;
}


export interface PublicCertificateBundle {
  result: CertificateVerificationResult;
  credential_number?: string;
  verification_token?: string;
  verification_uuid?: string;
  verification_hash?: string;
  certificate_hash?: string;
  status?: CourseCertificateStatus;
  user_full_name?: string;
  user_avatar_url?: string | null;
  roadmap_title?: string;
  category_name?: string | null;
  sub_category_name?: string | null;
  roadmap_started_at?: string;
  completion_date?: string;
  issue_date?: string;
  completion_duration_days?: number;
  admin_name_snapshot?: string | null;
  admin_feedback?: string | null;
  revoked_reason?: string | null;
  revoked_at?: string | null;
}








export interface PublicCertificateRoadmapSpec {
  id: string;
  title: string;
  description: string | null;
  total_days: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | null;
  version: number;
  category: string | null;
  sub_category: string | null;
}


export interface PublicCertificateReference {
  credential_number: string;
  roadmap_title: string;
  issue_date: string;
  status: CourseCertificateStatus;
}


export interface PublicCertificateVerification {
  kind: 'certificate';
  result: 'verified' | 'revoked';
  credential_number: string;
  verification_token: string;
  verification_uuid: string;
  verification_hash: string;
  certificate_hash: string;
  status: CourseCertificateStatus;
  user_full_name: string;
  user_avatar_url: string | null;
  roadmap_title: string;
  category_name: string | null;
  sub_category_name: string | null;
  roadmap_started_at: string;
  completion_date: string;
  issue_date: string;
  completion_duration_days: number;
  admin_name_snapshot: string | null;
  admin_feedback: string | null;
  revoked_reason: string | null;
  revoked_at: string | null;
  roadmap_spec: PublicCertificateRoadmapSpec | null;
  related_certificates: PublicCertificateReference[];
  matching_passport_number: string | null;
}


export type PublicVerificationResponse =
  | (PublicCandidateVerification & { kind: 'passport' })
  | PublicCertificateVerification
  | { kind: 'not_found'; result: 'not_found'; passport_number?: string; credential_number?: string };


/**
 * One row per (user, category) Skill Passport. Surfaced on the public
 * Profile-ID verified CV so the visitor can see every category passport
 * the candidate holds — not just the primary one the /verify page was
 * loaded for.
 *
 * Populated server-side by `public.fn_list_user_passports_public`. Each
 * entry is public-safe: no admin-only notes or internal IDs.
 */
export interface PublicCandidatePassportItem {
  id: string;
  passport_number: string;
  public_id: string | null;
  title: string | null;
  status: PassportStatus;
  level: PassportLevel | null;
  overall_score: number | null;
  passed_count: number | null;
  average_marks: number | null;
  issue_date: string | null;
  expiry_date: string | null;
  main_category_name: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  digital_signature: string | null;
  signed_at: string | null;
  revoked_at: string | null;
  admin_notes: string | null;
  verified_skills: any[];
  created_at: string;
  updated_at: string;
}


export interface CertificateAnalytics {
  total_certificates: number;
  active_certificates: number;
  revoked_certificates: number;
  certificates_this_month: number;
  total_downloads: number;
  total_verifications: number;
  verified_verifications: number;
  popular_roadmaps: Array<{
    roadmap_id: string;
    roadmap_title: string;
    certificate_count: number;
  }>;
  latest_certificates: Array<{
    id: string;
    credential_number: string;
    user_full_name: string;
    roadmap_title: string;
    category_name: string | null;
    issue_date: string;
    status: CourseCertificateStatus;
  }>;
}






export type JobMatchLabel =
  | 'perfect_match'
  | 'highly_recommended'
  | 'good_match'
  | 'need_more'
  | 'not_recommended';


export interface JobMatchResult {
  id: string;
  user_id: string;
  job_id: string;
  /** Source table for the job: 'admin' (public.jobs) or 'company' (public.company_jobs). */
  job_source?: 'admin' | 'company';
  /** SHA-256 of the user's profile at the time the row was written. */
  profile_hash?: string;
  /** ISO timestamp of the profile.updated_at when this row was last generated. */
  profile_version?: string;
  /** ISO timestamp of the job.updated_at when this row was last generated. */
  job_version?: string;

  overall_match: number;

  skill_match: number;

  experience_match: number;

  education_match: number;

  career_goal_match: number;


  label: JobMatchLabel;


  missing_skills_json: string[];

  missing_skills_required: string[];

  /** Skills the user already has that match this job's required/preferred list. */
  matching_skills_json?: string[];

  /** Structured gap items, one per missing skill with severity hint. */
  skill_gaps_json?: Array<{ skill: string; severity?: 'low' | 'medium' | 'high' }>;

  recommendations_json: string[];


  why_match: string;

  prerequisites_text: string;

  ai_reason: string;

  ai_reason_bn: string;


  input_snapshot: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}


export interface JobMatchDashboard {
  top_match: {
    job_id: string;
    title: string;
    company: string;
    overall_match: number;
    label: JobMatchLabel;
  } | null;
  
  average_match: number;
  
  jobs_ready_to_apply: number;
  
  need_more_skills: number;
  
  recommended_today: number;
  
  total_scored: number;
}


export interface JobMatchRow {
  job: Job;
  match: JobMatchResult | null;
}






export type AISessionMode =
  | 'chat'
  | 'review_resume'
  | 'learning_plan'
  | 'interview'
  | 'cover_letter'
  | 'linkedin_about'
  | 'bio'
  | 'resume_summary'
  | 'improve_projects'
  | 'improve_experience'
  | 'improve_skills';


export interface AIChatSession {
  id: string;
  user_id: string;
  title: string | null;
  title_bn: string | null;
  mode: AISessionMode;
  career_goal: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}


export interface AIChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode: AISessionMode | null;
  metadata: Record<string, any>;
  created_at: string;
}


export type InterviewStatus =
  | 'pending'
  | 'preparing'
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'expired'
  | 'abandoned'
  | 'failed'
  | 'cancelled';
export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';
export type InterviewEndReason =
  | 'timer'
  | 'user_submitted'
  | 'manual_abandon'
  | 'preparing_timeout'
  | 'ai_failed'
  | 'cancelled_pre_question'
  | 'cancelled_user_navigated'
  | 'cancelled_browser_event';
export type InterviewAnswerSource = 'text' | 'voice';

export interface InterviewSession {
  id: string;
  user_id: string;
  category_id: string;
  sub_category_id: string | null;
  category_name: string;
  sub_category_name: string | null;
  started_at: string;
  expires_at: string;
  interview_duration: number; 
  status: InterviewStatus;
  score: number | null;
  feedback: Record<string, any>;
  ended_at: string | null;
  end_reason: InterviewEndReason | null;
  created_at: string;
  updated_at: string;
  
  
  communication_score?: number | null;
  technical_score?: number | null;
  problem_solving_score?: number | null;
  confidence_score?: number | null;
  grammar_score?: number | null;
  evaluated_at?: string | null;
  evaluator_version?: string | null;
}

export interface InterviewQuestion {
  id: string;
  session_id: string;
  question_index: number;
  difficulty: InterviewDifficulty;
  question_text: string;
  hint: string | null;
  generation_ms: number | null;
  created_at: string;
}

export interface InterviewAnswer {
  id: string;
  question_id: string;
  session_id: string;
  source: InterviewAnswerSource;
  answer_text: string | null;
  voice_transcript: string | null;
  response_ms: number | null;
  score: number | null;
  created_at: string;
}

export interface InterviewCanStartResult {
  can_start: boolean;
  next_available_at: string | null;
  reason:
    | 'allowed'
    | 'not_authenticated'
    | 'active_session_exists'
    | 'daily_limit'
    | 'unknown';
  active_session_id: string | null;
}




export interface ProfilePublicEvidence {
  id: string;
  user_id: string;
  title: string;
  url: string;
  type: PublicEvidenceType;
  added_at: string;
}




export interface PassportVerificationLog {
  id: string;
  passport_id: string | null;
  passport_number: string;
  verification_uuid: string | null;
  result: PublicVerificationResult;
  ip_address: string | null;
  user_agent: string | null;
  browser: string | null;
  device: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  referer: string | null;
  requested_at: string;
}




export type CareerTimelineCategory =
  | 'profile'
  | 'skill'
  | 'roadmap'
  | 'assessment'
  | 'certificate'
  | 'passport'
  | 'employer_verification'
  | 'achievement';

export type CareerTimelineStatus =
  | 'created'
  | 'started'
  | 'in_progress'
  | 'completed'
  | 'passed'
  | 'failed'
  | 'verified'
  | 'issued'
  | 'renewed'
  | 'upgraded'
  | 'revoked'
  | 'suspended'
  | 'archived'
  | 'superseded';

export interface CareerTimelineEvent {
  id: string;
  category: CareerTimelineCategory;
  status: CareerTimelineStatus;
  event_at: string;
  recorded_at?: string;
  title: string;
  description: string | null;
  category_label: string;
  skill_label: string | null;
  sub_category_label: string | null;
  result_label: string;
  score: number | null;
  marks: number | null;
  verification_source: string | null;
  source_version: string | null;
  source_url: string | null;
  certificate_number: string | null;
  passport_id: string | null;
  supersedes_id: string | null;
  is_public_visible: boolean;
  metadata: Record<string, any>;
  content_hash?: string;
}


export interface PublicCareerTimelineEvent {
  id: string;
  category: CareerTimelineCategory;
  status: CareerTimelineStatus;
  event_at: string;
  title: string;
  description: string | null;
  category_label: string;
  skill_label: string | null;
  sub_category_label: string | null;
  result_label: string;
  score: number | null;
  marks: number | null;
  verification_source: string | null;
  source_version: string | null;
  source_url: string | null;
  certificate_number: string | null;
}
