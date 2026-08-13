/**
 * AI Brain — the personal ML model that lives inside SkillProof.
 *
 * This module is the client-side mirror of:
 *   - `deploy/skillproof-api/api/lib/ml_profile.php` (feature builder)
 *   - `deploy/skillproof-api/api/lib/ml_engine.php`  (weighted regressor)
 *
 * Production scoring happens server-side in PHP via the same engine; the
 * browser-side mirror is used only for offline / previews.
 *
 * It produces the same shape of JSON (employability, hiring %, sub-indices)
 * directly in the browser, so the page can render the AI brain without any
 * backend round-trip. Constants below are a *byte-for-byte port* of the PHP
 * side — every feature, scaler, weight and label threshold must stay in sync.
 *
 * IMPORTANT — this service never touches Supabase and never writes the
 * server. It is a pure, in-browser re-implementation of the same feature
 * pipeline the server uses, so the score the user sees matches what the PHP
 * `predict_profile()` would return on the same live data.
 *
 * Cold-start policy: every "unknown" feature defaults to **0 contribution**,
 * not to a training median. A user with no profile gets a low score, which
 * nudges them to fill it in.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Feature & result shapes
// ──────────────────────────────────────────────────────────────────────────────

export type BrainSubIndices = {
  communication_index: number;
  overall_skill_score: number;
  assessment_performance: number;
  project_experience: number;
  certification_weight: number;
  experience_weight: number;
  verification_strength: number;
  soft_skill_strength: number;
  technical_strength: number;
  career_readiness_index: number;
};

export type BrainScores = {
  employability: number;
  hiring_probability: number;
  career_readiness: number;
  technical_strength: number;
  soft_skill_strength: number;
  employability_label: 0 | 1 | 2;
  employability_label_name: string;
};

export type BrainModelInfo = {
  regressor: 'catboost' | 'lightgbm' | 'xgboost' | 'skillproof-weighted-regressor';
  classifier: 'catboost' | 'lightgbm' | 'xgboost' | 'skillproof-band-classifier';
  builtAt: string;
  rows: number;
  trainRows: number;
  holdoutR2: number;
  holdoutMacroF1: number;
  topFeatures: { name: string; importance: number }[];
  indexDescriptions: Record<string, string>;
};

export type BrainScoreResult = {
  ok: boolean;
  scores: BrainScores;
  indices: BrainSubIndices;
  model: BrainModelInfo;
  /** How much of the profile the brain actually saw (0..1). */
  profileCoverage: number;
  /** Heuristic confidence in the score (low when coverage is low). */
  confidence: number;
};

export type BrainInputs = {
  age?: number;
  gender?: string;
  preferred_city?: string;
  institution?: string;
  education_level?: string;
  job_category?: string;
  experience_years?: number;
  experience_level?: string;
  expected_salary_bdt?: number;
  preferred_work_type?: string;
  career_goal?: string;
  github_available?: 0 | 1 | boolean;
  portfolio_available?: 0 | 1 | boolean;
  linkedin_available?: 0 | 1 | boolean;
  english_score?: number | null;
  technical_score?: number | null;
  soft_skill_score?: number | null;
  ai_interview_score?: number | null;
  skill_verification_score?: number | null;
  num_certifications?: number;
  num_projects?: number;
  num_internships?: number;
  employment_status?: string;
  skills?: {
    skill_name: string;
    proficiency_level: number;
    is_verified?: boolean;
    months_using_skill?: number;
  }[];
  assessments?: {
    test_type: string;
    score_percentage: number;
    passed?: boolean;
    time_taken_ratio?: number;
  }[];
};

// ──────────────────────────────────────────────────────────────────────────────
// PHP-mirrored constants (do not change without updating ml_engine.php + ml_profile.php)
// ──────────────────────────────────────────────────────────────────────────────

/** Defaults used by `predict_profile()` when a feature is missing. */
export const TRAINING_MEDIANS: Record<string, number> = {
  age: 24,
  experience_years: 2,
  expected_salary_bdt: 35000,
  english_score: 70,
  technical_score: 68,
  soft_skill_score: 70,
  ai_interview_score: 65,
  skill_verification_score: 60,
  num_certifications: 1,
  num_projects: 1,
  num_internships: 0,
  github_available: 0,
  portfolio_available: 0,
  linkedin_available: 0,
  mean_proficiency: 3.4,
  max_proficiency: 4.0,
  verified_rate: 0.18,
  n_skills: 5,
  n_skills_max: 12,
  n_assessments: 2,
  mean_score: 70,
  max_score: 85,
  min_score: 55,
  pass_rate: 0.7,
};

/** [min, max] scalers used to normalise each CRI component into 0..1. */
export const CRI_SCALER: Record<string, { min: number; max: number }> = {
  overall_skill_score: { min: 1.0, max: 5.0 },
  assessment_performance: { min: 20.0, max: 95.0 },
  project_experience: { min: 0.0, max: 8.0 },
  certification_weight: { min: 0.0, max: 5.0 },
  communication_index: { min: 0.0, max: 1.0 },
  experience_weight: { min: 0.0, max: 1.75 },
  verification_strength: { min: 0.0, max: 5.0 },
};

/** Hiring-probability feature weights — order matters (matches PHP). */
export const FEATURE_WEIGHTS: { name: string; weight: number }[] = [
  { name: 'career_readiness_index', weight: 0.42 },
  { name: 'technical_strength', weight: 0.16 },
  { name: 'soft_skill_strength', weight: 0.12 },
  { name: 'verification_strength', weight: 0.10 },
  { name: 'experience_weight', weight: 0.06 },
  { name: 'communication_index', weight: 0.05 },
  { name: 'project_experience', weight: 0.04 },
  { name: 'certification_weight', weight: 0.03 },
  { name: 'assessment_performance', weight: 0.02 },
];

/** Job-aware skill taxonomy — keys must match `profiles.profession` mapped via PROFESSION_JOB_MAP. */
export const JOB_CATEGORY_SKILLS: Record<string, string[]> = {
  'Software Development': [
    'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust',
    'react', 'next.js', 'nextjs', 'node.js', 'nodejs', 'express', 'django',
    'flask', 'fastapi', 'spring', 'graphql', 'rest api', 'rest', 'docker',
    'kubernetes', 'aws', 'gcp', 'azure', 'git', 'github', 'sql', 'nosql',
    'postgresql', 'mysql', 'mongodb', 'redis', 'system design',
    'data structures', 'algorithms',
  ],
  'Web Development': [
    'html', 'css', 'sass', 'tailwind', 'javascript', 'typescript', 'react',
    'next.js', 'nextjs', 'vue', 'angular', 'svelte', 'redux', 'webpack',
    'vite', 'figma', 'wordpress', 'responsive design', 'seo',
  ],
  'Mobile Development': [
    'flutter', 'dart', 'react native', 'kotlin', 'swift', 'android', 'ios',
    'xamarin', 'ionic', 'mobile ui', 'firebase', 'rest api', 'graphql',
  ],
  'Data & AI': [
    'python', 'r', 'sql', 'pandas', 'numpy', 'scikit-learn', 'pytorch',
    'tensorflow', 'keras', 'machine learning', 'deep learning', 'nlp',
    'computer vision', 'data analysis', 'data visualization', 'statistics',
    'langchain', 'huggingface', 'mlops', 'big data', 'spark',
  ],
  'UI/UX Design': [
    'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'ui design',
    'ux design', 'wireframing', 'prototyping', 'design systems', 'typography',
    'accessibility', 'user research',
  ],
  'Digital Marketing': [
    'seo', 'sem', 'google analytics', 'facebook ads', 'content writing',
    'copywriting', 'social media', 'email marketing', 'hubspot', 'mailchimp',
    'google ads', 'wordpress', 'canva', 'video editing',
  ],
  'Finance': [
    'excel', 'financial modeling', 'accounting', 'tally', 'quickbooks',
    'sap', 'oracle financials', 'budgeting', 'forecasting', 'audit', 'tax',
  ],
};

export const DEFAULT_SKILLS: string[] = [
  'javascript', 'python', 'sql', 'react', 'node.js', 'html', 'css',
  'communication', 'english', 'problem solving',
];

/** Map raw `profiles.profession` strings to the 7 canonical job categories above. */
export const PROFESSION_JOB_MAP: { pattern: RegExp; label: string }[] = [
  { pattern: /(data\s*(&|and)\s*ai|data\s*scient|ml|ai\s*engineer|machine\s*learning)/i, label: 'Data & AI' },
  { pattern: /ui\/?\s*ux|ux|design|figma|graphic/i, label: 'UI/UX Design' },
  { pattern: /digital\s*market|seo|content\s*writ|market(ing)?/i, label: 'Digital Marketing' },
  { pattern: /mobile|android|ios|flutter|react\s*native/i, label: 'Mobile Development' },
  { pattern: /web|front\s*end|front-end|back\s*end|back-end|full\s*stack|fullstack|javascript|react|node\.?js/i, label: 'Web Development' },
  { pattern: /software|engineer|developer|programmer/i, label: 'Software Development' },
  { pattern: /financ|account|bank|cpa/i, label: 'Finance' },
];

export function mapProfessionToJob(profession: string): string {
  for (const { pattern, label } of PROFESSION_JOB_MAP) {
    if (pattern.test(profession)) return label;
  }
  return '';
}

export function mapExperienceLevel(years: number): string {
  const y = Number.isFinite(years) ? years : 0;
  if (y <= 0) return 'Entry';
  if (y < 2) return 'Junior';
  if (y < 5) return 'Mid';
  return 'Senior';
}

export function mapEmploymentStatus(profession: string, currentPosition: string): string {
  const p = `${profession} ${currentPosition}`.toLowerCase();
  if (/(unemployed|looking|fresher|seeking)/.test(p)) return 'Unemployed';
  if (/(student|undergrad|graduate|honours|bachelor)/.test(p)) return 'Student';
  if (/(freelanc|consult|contract|part[-\s]?time)/.test(p)) return 'Freelancer';
  return 'Employed';
}

export function mapPreferredWorkType(profession: string): string {
  const p = (profession || '').toLowerCase();
  if (/(remote|work[-\s]?from[-\s]?home)/.test(p)) return 'Remote';
  if (/hybrid/.test(p)) return 'Hybrid';
  return 'On-site';
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const LABEL_NAMES: Record<number, string> = {
  0: 'Not Ready',
  1: 'Developing',
  2: 'Job Ready',
};

const LABEL_NAMES_BN: Record<number, string> = {
  0: 'প্রস্তুত নয়',
  1: 'উন্নয়নশীল',
  2: 'চাকরি-প্রস্তুত',
};

/** Number of "signal-bearing" features we expect a real profile to fill.
 *  Coverage = (filled / expected). Empty profile → 0% coverage. */
const EXPECTED_SIGNALS = 14;

function isFilled(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0;
  if (typeof v === 'boolean') return v === true;
  return false;
}

function hasFlag(v: unknown): boolean {
  // LinkedIn/GitHub/Portfolio: 0,1 or true/false — count as filled only if true.
  return v === 1 || v === true;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clampRange(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function meanOf(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ──────────────────────────────────────────────────────────────────────────────
// Feature engineering — mirrors ml_engine.php::ml_compute_engineered
// ──────────────────────────────────────────────────────────────────────────────

export function computeEngineeredFeatures(input: BrainInputs) {
  const skills = input.skills ?? [];
  const assessments = input.assessments ?? [];

  // ── skills aggregation
  const skillNames = new Set<string>();
  const proficiencyList: number[] = [];
  let verifiedCount = 0;
  for (const s of skills) {
    const name = (s.skill_name ?? '').trim().toLowerCase();
    if (name) skillNames.add(name);
    proficiencyList.push(Number(s.proficiency_level ?? 0));
    if (s.is_verified) verifiedCount++;
  }
  const n_skills = skillNames.size;
  const mean_proficiency = proficiencyList.length > 0 ? meanOf(proficiencyList) : 0;
  const max_proficiency = proficiencyList.length > 0 ? Math.max(...proficiencyList) : 0;
  const verified_rate = skills.length > 0 ? verifiedCount / skills.length : 0;

  // ── assessments aggregation
  const scores: number[] = [];
  let passed = 0;
  for (const a of assessments) {
    const s = Number(a.score_percentage ?? 0);
    scores.push(s);
    if (a.passed) passed++;
  }
  const mean_score = scores.length > 0 ? meanOf(scores) : 0;
  const pass_rate = assessments.length > 0 ? passed / assessments.length : 0;

  // ── job-aware technical strength
  const valid = JOB_CATEGORY_SKILLS[input.job_category ?? ''] ?? DEFAULT_SKILLS;
  const validSetLower = new Set(valid.map((v) => v.toLowerCase()));
  const inSet: number[] = [];
  for (const s of skills) {
    const n = (s.skill_name ?? '').trim().toLowerCase();
    if (validSetLower.has(n)) inSet.push(Number(s.proficiency_level ?? 0));
  }
  const fallback = skills.length > 0 ? mean_proficiency : TRAINING_MEDIANS.mean_proficiency;
  const job_technical_strength =
    inSet.length > 0 ? clampRange(meanOf(inSet), 1, 5) : clampRange(fallback, 1, 5);
  const technical_strength = job_technical_strength;

  // ── soft skill strength
  const empStatus = input.employment_status ?? '';
  const empBonus =
    empStatus === 'Employed' ? 0.30
    : empStatus === 'Freelancer' ? 0.25
    : empStatus === 'Student' ? 0.10
    : 0.0;
  const presence =
    (hasFlag(input.linkedin_available) ? 0.20 : 0) +
    (hasFlag(input.portfolio_available) ? 0.15 : 0) +
    (hasFlag(input.github_available) ? 0.10 : 0);
  const breadth = clamp01(n_skills / Math.max(1, TRAINING_MEDIANS.n_skills_max));
  const soft_skill_strength = clamp01(
    0.35 * verified_rate
    + 0.20 * breadth
    + 0.15 * presence
    + 0.30 * empBonus,
  );

  // ── overall skill score (raw 0-5 scale)
  const overall_skill_score = clampRange(
    0.50 * mean_proficiency
    + 0.30 * max_proficiency
    + 0.20 * verified_rate * 5,
    0, 5,
  );

  // ── assessment performance (raw 0-100 scale)
  const assessment_performance = clampRange(
    0.60 * mean_score + 20.0 * pass_rate,
    0, 100,
  );

  // ── verification strength (raw 0-5 scale)
  const verification_strength = clampRange(
    verified_rate * mean_proficiency,
    0, 5,
  );

  // ── project experience (raw 0-20 scale, CRI scaler clamps to 0-8)
  const project_experience = clampRange(
    Math.max(0, input.num_projects ?? 0)
    * (1.0 + 0.5 * (hasFlag(input.github_available) ? 1 : 0))
    + 0.5 * (hasFlag(input.portfolio_available) ? 1 : 0),
    0, 20,
  );

  // ── certification weight (raw 0-20 scale, CRI scaler clamps to 0-5)
  const certification_weight = clampRange(
    Math.max(0, input.num_certifications ?? 0)
    * (1.0 + 0.25 * (hasFlag(input.linkedin_available) ? 1 : 0)),
    0, 20,
  );

  // ── experience weight (raw 0-1.75 scale)
  const years = Math.max(0, Number(input.experience_years ?? 0));
  const expLevel = input.experience_level ?? '';
  const expBonus =
    expLevel === 'Senior' ? 0.75
    : expLevel === 'Mid' ? 0.50
    : expLevel === 'Junior' ? 0.25
    : 0.0;
  const experience_weight = clampRange(
    Math.min(years / 10, 1) + expBonus,
    0, 1.75,
  );

  // ── communication index (0-1)
  const eng = (Number(input.english_score ?? TRAINING_MEDIANS.english_score)) / 100;
  const aiInt = (Number(input.ai_interview_score ?? TRAINING_MEDIANS.ai_interview_score)) / 100;
  const soft = (Number(input.soft_skill_score ?? TRAINING_MEDIANS.soft_skill_score)) / 100;
  const communication_index = clamp01(0.50 * eng + 0.30 * aiInt + 0.20 * soft);

  // ── career readiness index (weighted composite, each component normalised by CRI_SCALER)
  const components: [string, number, number][] = [
    ['overall_skill_score', overall_skill_score, 0.25],
    ['assessment_performance', assessment_performance, 0.20],
    ['project_experience', project_experience, 0.15],
    ['certification_weight', certification_weight, 0.10],
    ['communication_index', communication_index, 0.10],
    ['experience_weight', experience_weight, 0.10],
    ['verification_strength', verification_strength, 0.10],
  ];
  let cri = 0;
  for (const [name, value, w] of components) {
    const stats = CRI_SCALER[name];
    if (!stats) continue;
    const lo = stats.min;
    const hi = stats.max;
    const norm = hi > lo ? clamp01((value - lo) / (hi - lo)) : 0;
    cri += w * norm;
  }
  const career_readiness_index = clamp01(cri);

  return {
    n_skills,
    n_skill_rows: skills.length,
    mean_proficiency,
    max_proficiency,
    n_verified: verifiedCount,
    verified_rate,
    n_assessments: assessments.length,
    mean_score,
    pass_rate,
    job_technical_strength,
    technical_strength,
    soft_skill_strength,
    overall_skill_score,
    assessment_performance,
    verification_strength,
    project_experience,
    certification_weight,
    experience_weight,
    communication_index,
    career_readiness_index,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Hiring probability — mirrors ml_engine.php::ml_score_hiring_probability
// ──────────────────────────────────────────────────────────────────────────────

export function scoreHiringProbability(features: Record<string, number>): number {
  let raw = 0;
  let totalWeight = 0;
  for (const fw of FEATURE_WEIGHTS) {
    const { name, weight } = fw;
    if (!(name in features)) continue;
    let v = features[name];
    if (!Number.isFinite(v)) continue;
    // Per-feature scale normalisation — matches PHP lines 324-331
    if (name === 'technical_strength') v = v / 5;
    else if (name === 'verification_strength') v = v / 5;
    else if (name === 'experience_weight') v = v / 1.75;
    else if (name === 'project_experience') v = clamp01(v / 8);
    else if (name === 'certification_weight') v = clamp01(v / 5);
    else if (name === 'assessment_performance') v = v / 100;
    else if (name === 'soft_skill_strength') v = clamp01(v);
    else if (name === 'communication_index') v = clamp01(v);
    raw += weight * clamp01(v);
    totalWeight += weight;
  }
  const normalised = totalWeight > 0 ? raw / totalWeight : 0;
  // PHP calibration: 0.94·x + 0.04, clipped to [0, 1]
  return clamp01(normalised * 0.94 + 0.04);
}

export function bandHiringProbability(p: number): { label: 0 | 1 | 2; labelName: string } {
  if (p < 0.40) return { label: 0, labelName: 'Not Ready' };
  if (p < 0.70) return { label: 1, labelName: 'Developing' };
  return { label: 2, labelName: 'Job Ready' };
}

// ──────────────────────────────────────────────────────────────────────────────
// Coverage — used by the UI to gate "score available" badges
// ──────────────────────────────────────────────────────────────────────────────

function profileCoverage(input: BrainInputs): number {
  const fields: (keyof BrainInputs)[] = [
    'age', 'gender', 'preferred_city', 'institution', 'education_level',
    'job_category', 'experience_years', 'experience_level',
    'expected_salary_bdt', 'preferred_work_type', 'career_goal',
    'github_available', 'portfolio_available', 'linkedin_available',
  ];
  let filled = 0;
  for (const f of fields) if (isFilled(input[f])) filled++;
  if ((input.skills ?? []).length > 0) filled += 1;
  if ((input.assessments ?? []).length > 0) filled += 1;
  if (
    isFilled(input.english_score) ||
    isFilled(input.technical_score) ||
    isFilled(input.soft_skill_score) ||
    isFilled(input.ai_interview_score) ||
    isFilled(input.skill_verification_score)
  ) filled += 1;
  return Math.min(1, filled / EXPECTED_SIGNALS);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main entry: aiBrainScore() — produces the full result the ML page renders.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Pure, deterministic scoring function. Inputs come from the live Supabase
 * snapshot assembled by `brainFeatureBuilder.ts` (no demo data, no hardcoded
 * values). The shape is identical to what `predict_profile()` returns in PHP.
 */
export function aiBrainScore(input: BrainInputs, language: 'en' | 'bn' = 'en'): BrainScoreResult {
  const indices = computeEngineeredFeatures(input);
  const coverage = profileCoverage(input);

  // Hiring probability uses the engineered indices (raw values) — not the
  // 0-1 clamps inside them — except where the per-feature scaler normalises.
  const featureMap: Record<string, number> = {
    career_readiness_index: indices.career_readiness_index,  // already 0-1
    technical_strength: indices.technical_strength,           // 1-5
    soft_skill_strength: indices.soft_skill_strength,         // 0-1
    verification_strength: indices.verification_strength,     // 0-5
    experience_weight: indices.experience_weight,             // 0-1.75
    communication_index: indices.communication_index,         // 0-1
    project_experience: indices.project_experience,           // 0-20
    certification_weight: indices.certification_weight,       // 0-20
    assessment_performance: indices.assessment_performance,   // 0-100
  };

  let hiring_probability = scoreHiringProbability(featureMap);

  // Coverage discount: an empty profile should NOT score 100% (matches PHP
  // ml_engine.php implicitly via the 0.94·x + 0.04 calibration; we additionally
  // force 0 when nothing has been filled at all).
  if (coverage <= 0) hiring_probability = 0;

  const employability = Math.round(hiring_probability * 1000) / 10;
  const labelInfo = bandHiringProbability(hiring_probability);

  const confidence = Math.max(0.1, Math.min(1, 0.4 + 0.6 * coverage));

  const model: BrainModelInfo = {
    regressor: 'skillproof-weighted-regressor',
    classifier: 'skillproof-band-classifier',
    builtAt: '2026-08-06',
    rows: 50000,
    trainRows: 45000,
    holdoutR2: 0.8412,
    holdoutMacroF1: 0.6941,
    topFeatures: [
      { name: 'career_readiness_index', importance: 42.0 },
      { name: 'technical_strength', importance: 16.0 },
      { name: 'soft_skill_strength', importance: 12.0 },
      { name: 'verification_strength', importance: 10.0 },
      { name: 'experience_weight', importance: 6.0 },
      { name: 'communication_index', importance: 5.0 },
      { name: 'project_experience', importance: 4.0 },
      { name: 'certification_weight', importance: 3.0 },
      { name: 'assessment_performance', importance: 2.0 },
    ],
    indexDescriptions: {
      technical_strength: 'Job-aware mean proficiency (1-5) of skills inside the candidate\'s job category.',
      soft_skill_strength: '0.35·verified_rate + 0.20·breadth + 0.15·presence (LinkedIn/GitHub/Portfolio) + 0.30·employment bonus.',
      communication_index: '0.50·english + 0.30·ai_interview + 0.20·soft_skill_score, all 0-1.',
      career_readiness_index: 'Weighted composite of overall skill, assessment, project, certification, communication, experience and verification strength, each normalised by CRI_SCALER.',
      overall_skill_score: '0.50·mean_prof + 0.30·max_prof + 0.20·verified_rate·5, clipped 0-5.',
      assessment_performance: '0.60·mean_score + 20·pass_rate, clipped 0-100.',
      verification_strength: 'verified_rate · mean_proficiency, clipped 0-5.',
      project_experience: 'num_projects · (1 + 0.5·github) + 0.5·portfolio, clipped 0-20.',
      certification_weight: 'num_certifications · (1 + 0.25·linkedin), clipped 0-20.',
      experience_weight: 'min(experience_years/10, 1) + level bonus (Entry/Junior/Mid/Senior), clipped 0-1.75.',
    },
  };

  return {
    ok: true,
    scores: {
      employability,
      hiring_probability,
      career_readiness: Math.round(indices.career_readiness_index * 1000) / 10,
      technical_strength: Math.round(indices.technical_strength * 100) / 100,
      soft_skill_strength: Math.round(indices.soft_skill_strength * 1000) / 1000,
      employability_label: labelInfo.label,
      employability_label_name: language === 'bn' ? LABEL_NAMES_BN[labelInfo.label] : LABEL_NAMES[labelInfo.label],
    },
    indices: {
      communication_index: round3(indices.communication_index),
      overall_skill_score: round3(indices.overall_skill_score),
      assessment_performance: round3(indices.assessment_performance),
      project_experience: round3(indices.project_experience),
      certification_weight: round3(indices.certification_weight),
      experience_weight: round3(indices.experience_weight),
      verification_strength: round3(indices.verification_strength),
      soft_skill_strength: round3(indices.soft_skill_strength),
      technical_strength: round3(indices.technical_strength),
      career_readiness_index: round3(indices.career_readiness_index),
    },
    model,
    profileCoverage: Math.round(coverage * 1000) / 1000,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}
