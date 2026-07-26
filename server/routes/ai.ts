/**
 * AI routes: CV parsing and Universal Assessment generation.
 * No mock/fallback data — when both Groq and Gemini fail, we return 502.
 */
import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import mammoth from 'mammoth';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { aiRateLimit } from '../middleware/rateLimit.js';
import { getAdminClient } from '../middleware/auth.js';

const router = Router();

async function extractTextFromBuffer(buffer: Buffer, fileName: string, fileType: string): Promise<string> {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.pdf') || fileType === 'application/pdf') {
    const pdfModule = require('pdf-parse');
    const data = await pdfModule(buffer);
    return data.text || '';
  }
  if (lowerName.endsWith('.docx') || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }
  return buffer.toString('utf8');
}

function calculateDynamicScores(profile: any) {
  let ats = 40;
  const hasEmail = !!profile.personal_information?.email;
  const hasPhone = !!profile.personal_information?.phone;
  const hasLocation = !!profile.personal_information?.location;
  const hasBio = !!profile.personal_information?.bio;
  const hasGithub = !!profile.personal_information?.github_url;
  const hasLinkedin = !!profile.personal_information?.linkedin_url;
  const techSkillsCount = profile.skills?.technical?.length || 0;
  const softSkillsCount = profile.skills?.soft?.length || 0;
  const toolsCount = profile.skills?.tools?.length || 0;
  const educationCount = profile.education?.length || 0;
  const experienceCount = profile.experience?.length || 0;
  const projectsCount = profile.projects?.length || 0;
  const certificationsCount = profile.certifications?.length || 0;

  if (hasEmail) ats += 5;
  if (hasPhone) ats += 5;
  if (hasLocation) ats += 5;
  if (hasGithub) ats += 5;
  if (hasLinkedin) ats += 5;
  if (techSkillsCount >= 3) ats += 10;
  if (techSkillsCount >= 6) ats += 5;
  if (softSkillsCount >= 2) ats += 5;
  if (toolsCount >= 2) ats += 5;
  if (experienceCount >= 1) ats += 15;
  if (experienceCount >= 2) ats += 5;
  if (projectsCount >= 1) ats += 5;
  if (projectsCount >= 2) ats += 5;
  if (educationCount >= 1) ats += 10;
  if (certificationsCount >= 1) ats += 5;
  if (profile.personal_information?.bio?.length > 40) ats += 5;
  profile.ats_score = Math.min(100, Math.max(35, ats));

  let resume = 45;
  if (profile.personal_information?.bio?.length > 80) resume += 10;
  if (techSkillsCount >= 4) resume += 10;
  if (experienceCount >= 1 && profile.experience[0]?.summary?.length > 50) resume += 15;
  if (projectsCount >= 1 && profile.projects[0]?.description?.length > 40) resume += 15;
  if (certificationsCount >= 1) resume += 5;
  if (educationCount >= 1 && (profile.education[0]?.cgpa || profile.education[0]?.year)) resume += 5;
  profile.resume_score = Math.min(100, Math.max(40, resume));

  let readiness = 40;
  if (techSkillsCount >= 4) readiness += 15;
  if (experienceCount >= 1) readiness += 15;
  if (projectsCount >= 1) readiness += 15;
  if (hasGithub) readiness += 10;
  if (hasLinkedin) readiness += 5;
  profile.job_readiness_score = Math.min(100, Math.max(35, readiness));

  const fields = [
    hasEmail, hasPhone, hasLocation, hasBio,
    hasGithub || hasLinkedin || !!profile.personal_information?.portfolio_url,
    techSkillsCount + softSkillsCount + toolsCount >= 2,
    educationCount >= 1, experienceCount >= 1, projectsCount >= 1,
  ];
  const filled = fields.filter(Boolean).length;
  profile.profile_completion = Math.round((filled / fields.length) * 100);

  let parsed = 0;
  const total = 12;
  if (profile.personal_information?.name) parsed++;
  if (hasEmail) parsed++;
  if (hasPhone) parsed++;
  if (hasLocation) parsed++;
  if (hasBio) parsed++;
  if (techSkillsCount + softSkillsCount + toolsCount > 0) parsed++;
  if (educationCount > 0) parsed++;
  if (experienceCount > 0) parsed++;
  if (projectsCount > 0) parsed++;
  if (certificationsCount > 0) parsed++;
  if (profile.skills?.languages?.length > 0) parsed++;
  if (profile.strengths?.length > 0) parsed++;
  profile.confidence = Math.round((parsed / total) * 100);
}

function validateSchema(raw: any): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const hasPersonalInfo = !!(raw.personal_information || raw.personal_info || raw.personal || raw.name);
  const hasEducation = Array.isArray(raw.education) || Array.isArray(raw.educations) || Array.isArray(raw.education_history);
  const hasExperience = Array.isArray(raw.experience) || Array.isArray(raw.experiences) || Array.isArray(raw.work_history);
  const hasSkills = !!(raw.skills || Array.isArray(raw.skills));
  return hasPersonalInfo && hasEducation && hasExperience && hasSkills;
}

function normalizeResponse(raw: any): any {
  const personal = raw.personal_information || raw.personal_info || {};
  const skills = raw.skills || {};
  const mapped = {
    personal_information: {
      name: personal.name || raw.name || '',
      email: personal.email || raw.email || '',
      phone: personal.phone || raw.phone || '',
      location: personal.location || raw.location || '',
      bio: personal.bio || raw.bio || raw.resume_summary || raw.career_objective || '',
      github_url: personal.github_url || raw.github_url || '',
      linkedin_url: personal.linkedin_url || raw.linkedin_url || '',
      portfolio_url: personal.portfolio_url || raw.portfolio_url || '',
    },
    education: Array.isArray(raw.education) ? raw.education.map((e: any) => ({
      degree: e.degree || '', institution: e.institution || e.school || '',
      year: e.year || e.duration || '', cgpa: e.cgpa || e.gpa || '',
    })) : [],
    experience: Array.isArray(raw.experience) ? raw.experience.map((e: any) => ({
      role: e.role || e.title || '', company: e.company || '',
      duration: e.duration || '', summary: e.summary || e.description || '',
    })) : [],
    projects: Array.isArray(raw.projects) ? raw.projects.map((p: any) => ({
      title: p.title || p.name || '', techStack: p.techStack || p.tech_stack || p.technologies || '',
      description: p.description || '',
    })) : [],
    skills: {
      technical: Array.isArray(skills.technical) ? skills.technical : (Array.isArray(skills.programming) ? skills.programming : (Array.isArray(raw.skills) ? raw.skills : [])),
      soft: Array.isArray(skills.soft) ? skills.soft : [],
      tools: Array.isArray(skills.tools) ? skills.tools : [],
      languages: Array.isArray(skills.languages) ? skills.languages : (Array.isArray(raw.languages) ? raw.languages : []),
    },
    certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    resume_summary: raw.resume_summary || raw.summary || personal.bio || '',
    career_objective: raw.career_objective || '',
    missing_skills: Array.isArray(raw.missing_skills) ? raw.missing_skills : (Array.isArray(raw.missingSkills) ? raw.missingSkills : []),
    ats_score: typeof raw.ats_score === 'number' ? raw.ats_score : 0,
    resume_score: typeof raw.resume_score === 'number' ? raw.resume_score : 0,
    job_readiness_score: typeof raw.job_readiness_score === 'number' ? raw.job_readiness_score : 0,
    profile_completion: typeof raw.profile_completion === 'number' ? raw.profile_completion : 0,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 95,
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses : [],
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : (Array.isArray(raw.improvement_suggestions) ? raw.improvement_suggestions : []),
  };
  calculateDynamicScores(mapped);
  return mapped;
}

async function callGroq(prompt: string, systemPrompt: string): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || groqKey === 'MY_GROQ_API_KEY') return null;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callGemini(prompt: string): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === 'MY_GEMINI_API_KEY') return null;
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  for (const model of ['gemini-2.5-flash', 'gemini-1.5-flash']) {
    try {
      const r = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      if (r?.text) return r.text;
    } catch (e) {
      console.warn(`[Gemini ${model}] failed`, e);
    }
  }
  return null;
}

router.post('/parse-cv', requireAuth, aiRateLimit, async (req, res) => {
  try {
    let { cvText, fileData, fileName, fileType } = req.body;
    if (fileData) {
      try {
        const buffer = Buffer.from(fileData, 'base64');
        cvText = await extractTextFromBuffer(buffer, fileName || 'resume.pdf', fileType || 'application/pdf');
      } catch (e: any) {
        return res.status(400).json({ error: `File text extraction failed: ${e.message}` });
      }
    }
    if (!cvText || typeof cvText !== 'string' || cvText.trim().length === 0) {
      return res.status(400).json({ error: 'Either cvText or valid fileData must be provided.' });
    }

    const prompt = `You are a top-tier HR & CV Intelligence Engine. Analyze the following CV thoroughly.
Extract structured details into valid JSON format conforming EXACTLY to this schema. Do not wrap in markdown or output any conversational text.

JSON Schema:
{
  "personal_information": {"name":"","email":"","phone":"","location":"","bio":"","github_url":"","linkedin_url":"","portfolio_url":""},
  "education":[{"degree":"","institution":"","year":"","cgpa":""}],
  "experience":[{"role":"","company":"","duration":"","summary":""}],
  "projects":[{"title":"","techStack":"","description":""}],
  "skills":{"technical":[],"soft":[],"tools":[],"languages":[]},
  "certifications":[],
  "achievements":[],
  "resume_summary":"",
  "career_objective":"",
  "missing_skills":[],
  "ats_score":0,
  "resume_score":0,
  "job_readiness_score":0,
  "profile_completion":0,
  "confidence":0,
  "strengths":[],
  "weaknesses":[],
  "recommendations":[]
}

CRITICAL: Never invent CV data not explicitly present. Empty fields = empty strings/arrays.

CV Text: ${cvText}`;

    let finalProfile: any = null;
    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const sys = 'You are an expert HR AI analyst. Respond only with complete and valid JSON matching the exact schema.';
      let json = await callGroq(prompt, sys);
      if (!json) json = await callGemini(prompt);
      if (json) {
        try {
          const cleaned = json.replace(/```json/gi, '').replace(/```/gi, '').trim();
          const parsed = JSON.parse(cleaned);
          if (!validateSchema(parsed)) throw new Error('Schema mismatch');
          finalProfile = normalizeResponse(parsed);
          if (finalProfile) break;
        } catch (e: any) {
          lastError = e;
        }
      }
    }
    if (!finalProfile) {
      return res.status(502).json({ error: 'AI analysis service is currently unavailable.', details: lastError?.message });
    }
    res.json({ success: true, profile: finalProfile });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to parse CV' });
  }
});

router.post('/generate-assessment', requireAuth, aiRateLimit, async (req: AuthedRequest, res) => {
  try {
    const { skillId, skillName, categoryName, subCategoryName, experienceLevel, additionalInfo, mandatoryDescription } = req.body;
    if (!skillId || !skillName) {
      return res.status(400).json({ error: 'skillId and skillName are required.' });
    }

    // Verify user has no active pending assessment for this skill.
    const admin = getAdminClient();
    const { data: existing } = await admin
      .from('universal_assessments')
      .select('id, status, expires_at')
      .eq('user_id', req.profile!.id)
      .eq('skill_id', skillId)
      .eq('status', 'Pending')
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'You already have an active assessment for this skill.', assessment: existing });
    }

    const prompt = `You are an expert Enterprise Technical Architect and Senior Assessment Designer.
Create a highly professional, practical, real-world skill assessment challenge for a candidate.

Target Profile:
- Category: ${categoryName || 'General'}
- Sub-Category: ${subCategoryName || 'General Professional'}
- Skill to Verify: ${skillName}
- Target Experience Level: ${experienceLevel || 'Intermediate'}
- Mandatory Description: ${mandatoryDescription || ''}
${additionalInfo ? `- Candidate Context / Additional Focus: ${additionalInfo}` : ''}

Assessment Guidelines:
1. Provide a comprehensive, hands-on, end-to-end challenge (like building a feature, resolving an architectural problem, designing an elite template, or writing advanced logic).
2. It should be a realistic industry-standard project, not a boring quiz.
3. CRITICAL RULE: Under absolutely no circumstances should you generate any sample solutions, full answers, or actual complete source codes. You must ONLY generate the assessment criteria and problem description.
4. Output your response as a valid JSON object matching this schema EXACTLY:

{
  "title": "string",
  "description": "string",
  "assessment_type": "coding" or "practical",
  "difficulty": "Easy" or "Medium" or "Hard",
  "requirements": ["string"],
  "evaluation_criteria": ["string"],
  "estimated_time": "string",
  "required_technologies": ["string"]
}

Do not include any markdown tags or extra text outside the JSON.`;

    const sys = 'You are an elite skill assessment designer. Respond only with complete and valid JSON matching the exact schema requested. Never provide answers.';
    let json = await callGroq(prompt, sys);
    if (!json) {
      return res.status(502).json({ error: 'AI assessment generation is currently unavailable. Please try again later.' });
    }
    let assessment: any;
    try {
      const cleaned = json.replace(/```json/gi, '').replace(/```/gi, '').trim();
      assessment = JSON.parse(cleaned);
    } catch (e: any) {
      return res.status(502).json({ error: 'AI returned malformed JSON.', details: e.message });
    }

    // Persist as Pending assessment.
    const insertPayload = {
      user_id: req.profile!.id,
      skill_id: skillId,
      skill_name: skillName,
      category_name: categoryName || null,
      sub_category_name: subCategoryName || null,
      experience_level: experienceLevel || null,
      additional_info: additionalInfo || null,
      mandatory_description: mandatoryDescription || null,
      title: assessment.title,
      description: assessment.description,
      assessment_type: assessment.assessment_type || 'practical',
      difficulty: assessment.difficulty || 'Medium',
      requirements: assessment.requirements || [],
      evaluation_criteria: assessment.evaluation_criteria || [],
      estimated_time: assessment.estimated_time || null,
      required_technologies: assessment.required_technologies || [],
      status: 'Pending',
    };
    const { data: row, error } = await admin
      .from('universal_assessments')
      .insert(insertPayload)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'You already have an active assessment for this skill.' });
      }
      return res.status(500).json({ error: error.message });
    }

    await admin.from('audit_logs').insert({
      actor_id: req.profile!.id,
      actor_email: req.profile!.email,
      action: 'GENERATE_UNIVERSAL_ASSESSMENT',
      entity_type: 'universal_assessment',
      entity_id: row.id,
      metadata: { skill_id: skillId },
    });

    res.json({ success: true, assessment: row });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate assessment' });
  }
});

export default router;
