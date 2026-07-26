/**
 * Database types — mirrors the Supabase schema produced by migrations 00–15.
 * Keep aligned with the SQL migrations.
 */

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

/** Enterprise passport tier (4-level system). Auto-computed + admin-overridable. */
export type PassportLevel = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

/** Renewal lifecycle for an issued passport. */
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
  // ---- Enterprise skill-passport columns (migration 42) ----
  /** Main category this passport belongs to. Used for eligibility counting. */
  category_id: string | null;
  /** Denormalised main-category display name (snapshot). */
  main_category_name: string | null;
  /** Computed / overridden tier for the digital passport card. */
  level: PassportLevel;
  /** Number of Passed verifications in this passport's main category. */
  passed_count: number;
  /** Average score across the same set (0..10). */
  average_marks: number;
  /** Admin-supplied overall score 0..100. */
  overall_score: number;
  /** Issue timestamp (set when status flips to active). */
  issue_date: string | null;
  /** Expiry timestamp (issue_date + 2 years). */
  expiry_date: string | null;
  /** User-driven renewal state. */
  renewal_status: PassportRenewalStatus;
  /** Tags shown on the digital passport card. */
  skill_tags: string[];
  /** Timestamp the digital signature was issued. */
  signed_at: string | null;
  /** Admin user id who signed the passport. */
  signed_by: string | null;
  /** Most recent "request revisions" feedback. */
  revisions_requested: string | null;
  /** True when the user explicitly requested this passport (vs. auto-eligible). */
  requested_manually: boolean;
  /** Timestamp the manual request was submitted. */
  requested_at: string | null;
  /** Most recent renewal approval timestamp. */
  renewed_at: string | null;
  /** Admin user id who approved the renewal. */
  renewed_by: string | null;
  // ---- Blockchain-ready columns (migration 43) ----
  /** Stable verification UUID minted on approval. Public-safe. */
  verification_uuid: string | null;
  /** Sha256 hash over stable passport fields. Used as the credential anchor. */
  verification_hash: string | null;
  /** Sha256 hash of (verification_hash + signature fields). */
  credential_hash: string | null;
  /** When the hashes were minted (immutable after first mint). */
  hash_timestamp: string | null;
  /** Unique QR / lookup token. Format: SPK-<16 hex>. */
  verification_token: string | null;
  /** Optional blockchain network the credential was anchored to. */
  blockchain_network: string | null;
  /** Optional blockchain transaction id. */
  blockchain_tx_id: string | null;
  // ---- Manual request context (migration 46) ----
  /** Free-form motivation the user submitted when requesting the passport. */
  motivation: string | null;
}

/** Granular permission grants for admins (RBAC). */
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
  | 'resume.uploaded'
  | 'ai_career.generated'
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

/** Audit row for admin level overrides. */
export interface PassportLevelHistory {
  id: string;
  passport_id: string;
  old_level: PassportLevel;
  new_level: PassportLevel;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
}

/** Permanent renewal-decision trail for issued passports. */
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

/** Per-category eligibility snapshot for the dashboard / request flow. */
export interface PassportCategoryEligibility {
  category_id: string;
  category_name: string;
  passed_count: number;
  average_marks: number;
  is_eligible: boolean;
  has_pending_passport: boolean;
  has_active_passport: boolean;
}

/**
 * Aggregated "everything the admin needs to review" payload returned by
 * fn_get_passport_overview(). Lets the tabbed review page render every tab
 * from a single round-trip without joining tables in the frontend.
 */
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
  /** Legacy fields preserved for back-compat. */
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
}

/**
 * Per-user enrollment in a roadmap template. A user may have multiple
 * enrollments (one per template). Stored in career_roadmap_enrollment.
 */
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
  created_at: string;
  updated_at: string;
}

/**
 * Per-user module copy. The user-facing day list shows day_number/title only
 * for locked days; description/etc. is fetched when the day is opened.
 * Stored in career_roadmap_modules.
 */
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

export type JobType = 'Full-time' | 'Part-time' | 'Remote' | 'Contract' | 'Internship';
export type JobStatus = 'Active' | 'Closed' | 'Draft';
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
  type: 'info' | 'success' | 'warning' | 'error' | 'passport_upgrade' | 'project_review';
  is_read: boolean;
  link: string | null;
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

// ============================================================================
// Skill Verification Manager (admin-authored verification templates)
// ============================================================================
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
  max_marks: number;       // 1..100, default 10
  pass_marks: number;      // 1..max_marks, default 6
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
  score: number | null;    // 0..10
  feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Joined row used by the admin review page so a single round-trip brings
 * the submission, the user, the task, the taxonomy context, and the
 * reviewing admin together.
 */
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

/**
 * Joined row used by the user-side "My Verifications" card. Shows the
 * assessment title, taxonomy context, marks, pass marks, reviewer, and
 * review timestamp so the user has a complete view of every submission.
 */
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

/**
 * Cascade-aware delete envelope. Mirrors `RoadmapDeleteResult` so the UI
 * helpers can reuse the same modal pattern.
 */
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

/**
 * Free-form AI career profile shape retained for legacy pages.
 * Stored on profiles.ai_career_profile (jsonb).
 */
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
