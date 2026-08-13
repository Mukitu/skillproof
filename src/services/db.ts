
import { uploadResume } from './profile';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './auth';
import {
  getLatestResumeParsedData,
  listResumeParsedData,
  saveResumeParsedData,
  applyResumeToCandidateProfile,
  buildCareerAnalysisInput,
  generateCareerAnalysis,
  getLatestCareerAnalysis,
  listCareerAnalyses,
  createCareerAnalysisAutoRefresh,
} from './aiCareer';
import type { ParsedCVProfile, ConfidenceScore, CareerAIReport } from '../types/database';

export const dbService = {
  async uploadResumeFile(file: File): Promise<string> {
    return uploadResume(file);
  },

  
  async getAICareerProfile(userId: string): Promise<any | null> {
    const latest = await getLatestResumeParsedData(userId);
    if (latest) {
      return {
        ...latest.parsed_json,
        name: latest.parsed_json.personal_information?.name,
        email: latest.parsed_json.personal_information?.email,
        phone: latest.parsed_json.personal_information?.phone,
        location: latest.parsed_json.personal_information?.location,
        bio: latest.parsed_json.personal_information?.bio,
        github_url: latest.parsed_json.personal_information?.github_url,
        linkedin_url: latest.parsed_json.personal_information?.linkedin_url,
        portfolio_url: latest.parsed_json.personal_information?.portfolio_url,
        confidence_json: latest.confidence_json,
        source_file_name: latest.source_file_name,
        created_at: latest.created_at,
      };
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('ai_career_profile')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return null;
    return (data as any)?.ai_career_profile ?? null;
  },

  
  async saveAICareerProfile(userId: string, profile: any): Promise<void> {
    const parsed: ParsedCVProfile = profile?.parsed_json ?? profile;
    const confidence: ConfidenceScore = profile?.confidence_json ?? { overall: 0, by_field: {} };
    const fileName: string | null = profile?.source_file_name ?? null;
    try {
      await saveResumeParsedData(userId, parsed, confidence, fileName);
    } catch (e) {
      
      console.warn('[dbService.saveAICareerProfile] resume_parsed_data insert failed', e);
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        ai_career_profile: profile,
        ai_last_analysis: new Date().toISOString(),
      })
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

  async listResumeParsedData(userId: string): Promise<any[]> {
    return listResumeParsedData(userId);
  },

  async applyResumeToCandidateProfile(parsed: ParsedCVProfile, fileUrl: string, overwrite?: boolean): Promise<any> {
    return applyResumeToCandidateProfile(parsed, fileUrl, { overwrite });
  },

  async buildCareerAnalysisInput(userId: string): Promise<any> {
    return buildCareerAnalysisInput(userId);
  },

  async generateCareerAnalysis(input: any): Promise<CareerAIReport> {
    return generateCareerAnalysis(input);
  },

  async getLatestCareerAnalysis(userId: string): Promise<CareerAIReport | null> {
    return getLatestCareerAnalysis(userId);
  },

  async listCareerAnalyses(userId: string, limit?: number): Promise<CareerAIReport[]> {
    return listCareerAnalyses(userId, limit);
  },

  createCareerAnalysisAutoRefresh: createCareerAnalysisAutoRefresh,
};




import {
  listActiveJobsWithMatches,
  getMatchForJob,
  runJobMatching,
  getJobMatchDashboard,
  getFilterProjection,
  isJobVerifiedMatch,
  isJobRoadmapRelevant,
  createJobMatchAutoRefresh,
  MATCH_LABEL_META,
  matchStars,
  tokenize as _jobMatchTokenize,
  type VerifiedSkillsProjection,
} from './jobMatch';
import type {
  JobMatchRow, JobMatchResult, JobMatchDashboard, JobMatchLabel,
} from '../types/database';

export interface JobMatchRunOpts {
  jobIds?: string[];
  silent?: boolean;
}

export interface JobMatchAutoRefreshOpts {
  onChange?: () => void;
  cooldownMs?: number;
  autoRun?: boolean;
  jobIds?: string[];
}

const dbServiceJobMatch = {
  async listActiveJobsWithMatches(): Promise<JobMatchRow[]> {
    return listActiveJobsWithMatches();
  },
  async getMatchForJob(jobId: string): Promise<JobMatchResult | null> {
    return getMatchForJob(jobId);
  },
  async runJobMatching(opts?: JobMatchRunOpts): Promise<JobMatchResult[]> {
    return runJobMatching(opts);
  },
  async getJobMatchDashboard(
    rows?: JobMatchRow[],
  ): Promise<JobMatchDashboard> {
    return getJobMatchDashboard(rows ?? []);
  },
  async getFilterProjection(): Promise<VerifiedSkillsProjection> {
    return getFilterProjection();
  },
  isJobVerifiedMatch: isJobVerifiedMatch,
  isJobRoadmapRelevant: isJobRoadmapRelevant,
  createJobMatchAutoRefresh(opts: JobMatchAutoRefreshOpts = {}): () => void {
    return createJobMatchAutoRefresh(opts);
  },
  MATCH_LABEL_META,
  matchStars,
};


(dbService as any).listActiveJobsWithMatches = dbServiceJobMatch.listActiveJobsWithMatches;
(dbService as any).getMatchForJob = dbServiceJobMatch.getMatchForJob;
(dbService as any).runJobMatching = dbServiceJobMatch.runJobMatching;
(dbService as any).getJobMatchDashboard = dbServiceJobMatch.getJobMatchDashboard;
(dbService as any).getFilterProjection = dbServiceJobMatch.getFilterProjection;
(dbService as any).isJobVerifiedMatch = dbServiceJobMatch.isJobVerifiedMatch;
(dbService as any).isJobRoadmapRelevant = dbServiceJobMatch.isJobRoadmapRelevant;
(dbService as any).createJobMatchAutoRefresh = dbServiceJobMatch.createJobMatchAutoRefresh;
(dbService as any).MATCH_LABEL_META = dbServiceJobMatch.MATCH_LABEL_META;
(dbService as any).matchStars = dbServiceJobMatch.matchStars;




import {
  sendMentorMessage,
  listMyMentorSessions,
  getMentorSessionMessages,
  subscribeMentorMessages,
  subscribeMentorSessions,
  updateMentorSessionCareerGoal,
  type SendMentorMessageArgs,
  type SendMentorMessageResult,
} from './mentor';
import type { AIChatMessage, AIChatSession } from '../types/database';

const dbServiceMentor = {
  sendMentorMessage(args: SendMentorMessageArgs): Promise<SendMentorMessageResult> {
    return sendMentorMessage(args);
  },
  listMyMentorSessions(): Promise<AIChatSession[]> {
    return listMyMentorSessions();
  },
  getMentorSessionMessages(sessionId: string): Promise<AIChatMessage[]> {
    return getMentorSessionMessages(sessionId);
  },
  subscribeMentorMessages(sessionId: string, onChange: () => void): () => void {
    return subscribeMentorMessages(sessionId, onChange);
  },
  subscribeMentorSessions(onChange: () => void): () => void {
    return subscribeMentorSessions(onChange);
  },
  updateMentorSessionCareerGoal(sessionId: string, careerGoal: string | null): Promise<void> {
    return updateMentorSessionCareerGoal(sessionId, careerGoal);
  },
};

(dbService as any).sendMentorMessage = dbServiceMentor.sendMentorMessage;
(dbService as any).listMyMentorSessions = dbServiceMentor.listMyMentorSessions;
(dbService as any).getMentorSessionMessages = dbServiceMentor.getMentorSessionMessages;
(dbService as any).subscribeMentorMessages = dbServiceMentor.subscribeMentorMessages;
(dbService as any).subscribeMentorSessions = dbServiceMentor.subscribeMentorSessions;
(dbService as any).updateMentorSessionCareerGoal = dbServiceMentor.updateMentorSessionCareerGoal;