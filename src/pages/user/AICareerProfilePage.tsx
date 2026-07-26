import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/db';
import { parseCVTextWithAI, calculateCompleteness, calculateDynamicProfileCompleteness } from '../../services/aiService';
import { AICareerProfileData } from '../../types/database';
import {
  Brain,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  Plus,
  Trash2,
  GraduationCap,
  Briefcase,
  Code2,
  Folder,
  Award,
  Globe,
  Sparkles,
  Zap,
  Target,
  ShieldCheck,
  Percent,
  ExternalLink,
  Lightbulb,
  Heart,
  TrendingUp,
  Sliders,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const AICareerProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { language } = useLanguage();

  const [cvText, setCvText] = useState<string>('');
  const [profile, setProfile] = useState<AICareerProfileData | null>(null);
  
  // Real-time Upload Progress Stepper
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'work_edu' | 'skills' | 'ai_insights'>('overview');

  // New item chip states
  const [newSkill, setNewSkill] = useState('');
  const [newMissingSkill, setNewMissingSkill] = useState('');
  const [newCert, setNewCert] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newTargetRole, setNewTargetRole] = useState('');
  const [newStrength, setNewStrength] = useState('');
  const [newWeakness, setNewWeakness] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const existing = await dbService.getAICareerProfile(user.id);
      if (existing) {
        setProfile(existing);
      } else {
        // No AI career profile exists yet. New users must start with a
        // completely empty profile. We do NOT seed demo/fake data,
        // placeholder education, fake skills, sample projects, or any
        // hardcoded values. The profile is only populated once the user
        // uploads a real CV and the AI extraction succeeds.
        setProfile(null);
      }
    } catch (err) {
      console.error('Error loading AI Profile:', err);
      setProfile(null);
    }
  };

  // Drag and Drop State
  const [dragActive, setDragActive] = useState<boolean>(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  // Simulates step-by-step progress during AI parsing
  const startProgressSimulation = () => {
    setUploadPercent(5);
    setUploadStep(language === 'bn' ? 'সিভি আপলোড হচ্ছে...' : 'Uploading Resume...');
    
    const interval = setInterval(() => {
      setUploadPercent((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        const next = prev + Math.floor(Math.random() * 15) + 5;
        
        // Map percentage ranges to visual steps
        if (next < 30) {
          setUploadStep(language === 'bn' ? 'সিভি আপলোড হচ্ছে... (২০%)' : 'Uploading Resume... (20%)');
        } else if (next < 60) {
          setUploadStep(language === 'bn' ? 'টেক্সট এক্সট্র্যাক্ট করা হচ্ছে... (৫০%)' : 'Extracting Text... (50%)');
        } else if (next < 85) {
          setUploadStep(language === 'bn' ? 'এআই ক্যারিয়ার অ্যানালিসিস করা হচ্ছে... (৮৫%)' : 'AI Career Intelligence Analysis... (85%)');
        } else {
          setUploadStep(language === 'bn' ? 'ডাটাবেজে সেভ করা হচ্ছে... (১০০%)' : 'Saving to Supabase DB... (100%)');
        }
        
        return Math.min(next, 95);
      });
    }, 450);

    return interval;
  };

  const processFile = async (file: File) => {
    setIsParsing(true);
    setUploadedFileName(file.name);
    setStatusMsg(null);
    
    const progressInterval = startProgressSimulation();

    try {
      // 1. Upload CV safely
      const fileUrl = await dbService.uploadResumeFile(file);

      // 2. Convert file to base64 for real backend binary extraction
      const getBase64 = (f: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = (error) => reject(error);
        });
      };
      
      const base64Data = await getBase64(file);

      // 3. Backend analysis
      const extracted = await parseCVTextWithAI("", base64Data, file.name, file.type);
      
      clearInterval(progressInterval);
      setUploadPercent(100);
      setUploadStep(language === 'bn' ? 'অ্যানালিসিস সফলভাবে সম্পন্ন হয়েছে!' : 'Saving to Supabase DB... (100%)');

      const updatedProfile: AICareerProfileData = {
        ...extracted,
        resume_url: fileUrl,
        completeness_score: calculateCompleteness(extracted),
      };

      setProfile(updatedProfile);
      if (user) {
        await dbService.saveAICareerProfile(user.id, updatedProfile);
        
        // Auto sync and fill candidate profile
        if (updateProfile) {
          await updateProfile({
            full_name: updatedProfile.name || user.full_name,
            phone: updatedProfile.phone || user.phone,
            location: updatedProfile.location || user.location,
            bio: updatedProfile.bio || user.bio,
            github_url: updatedProfile.github_url || user.github_url,
            linkedin_url: updatedProfile.linkedin_url || user.linkedin_url,
            portfolio_url: updatedProfile.portfolio_url || user.portfolio_url,
            resume_url: updatedProfile.resume_url || user.resume_url,
            skills: updatedProfile.skills || user.skills,
            profession: updatedProfile.careerInterests?.[0] || user.profession || null,
            current_position: updatedProfile.experience?.[0]?.role || user.current_position || null,
            experience_years: updatedProfile.experience ? updatedProfile.experience.length : user.experience_years,
            experience_summary: updatedProfile.experience?.[0]?.summary || user.experience_summary || '',
            education_degree: updatedProfile.education?.[0]?.degree || user.education_degree || '',
            education_institution: updatedProfile.education?.[0]?.institution || user.education_institution || '',
            education_year: updatedProfile.education?.[0]?.year || user.education_year || '',
          });
        }
      }

      setStatusMsg({
        type: 'success',
        text: language === 'bn' ? 'সিভি এআই দিয়ে সফলভাবে বিশ্লেষণ করা হয়েছে এবং সেভ হয়েছে!' : 'CV analyzed successfully with AI extraction!'
      });

    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('AI parsing error:', err);
      setStatusMsg({
        type: 'error',
        text: language === 'bn' ? 'সিভি বিশ্লেষণে ত্রুটি ঘটেছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।' : 'Failed to parse CV. Please check file format and try again.'
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveProfile = async () => {
    if (profile && user) {
      try {
        const updated = {
          ...profile,
          completeness_score: calculateDynamicProfileCompleteness(user, profile),
        };
        await dbService.saveAICareerProfile(user.id, updated);
        setProfile(updated);
        
        // Auto sync and fill candidate profile on manual edits
        if (updateProfile) {
          await updateProfile({
            full_name: updated.name || user.full_name,
            phone: updated.phone || user.phone,
            location: updated.location || user.location,
            bio: updated.bio || user.bio,
            github_url: updated.github_url || user.github_url,
            linkedin_url: updated.linkedin_url || user.linkedin_url,
            portfolio_url: updated.portfolio_url || user.portfolio_url,
            resume_url: updated.resume_url || user.resume_url,
            skills: updated.skills || user.skills,
            profession: updated.careerInterests?.[0] || user.profession || null,
            current_position: updated.experience?.[0]?.role || user.current_position || null,
            experience_years: updated.experience ? updated.experience.length : user.experience_years,
            experience_summary: updated.experience?.[0]?.summary || user.experience_summary || '',
            education_degree: updated.education?.[0]?.degree || user.education_degree || '',
            education_institution: updated.education?.[0]?.institution || user.education_institution || '',
            education_year: updated.education?.[0]?.year || user.education_year || '',
          });
        }
        
        setIsEditing(false);
        setStatusMsg({
          type: 'success',
          text: language === 'bn' ? 'ক্যারিয়ার প্রোফাইল সফলভাবে আপডেট করা হয়েছে।' : 'Career profile updated & saved to Supabase successfully.'
        });
        setTimeout(() => setStatusMsg(null), 4000);
      } catch (err) {
        setStatusMsg({
          type: 'error',
          text: language === 'bn' ? 'প্রোফাইল সেভ করতে সমস্যা হয়েছে।' : 'Error saving profile details.'
        });
      }
    }
  };

  // Items manipulation helpers
  const handleAddEducation = () => {
    if (!profile) return;
    // Empty placeholder row — the user fills in their own real values.
    setProfile({
      ...profile,
      education: [...profile.education, { degree: '', institution: '', year: '', cgpa: '' }]
    });
  };

  const handleRemoveEducation = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      education: profile.education.filter((_, i) => i !== index)
    });
  };

  const handleAddExperience = () => {
    if (!profile) return;
    // Empty placeholder row — the user fills in their own real values.
    setProfile({
      ...profile,
      experience: [...profile.experience, { role: '', company: '', duration: '', summary: '' }]
    });
  };

  const handleRemoveExperience = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      experience: profile.experience.filter((_, i) => i !== index)
    });
  };

  const handleAddProject = () => {
    if (!profile) return;
    // Empty placeholder row — the user fills in their own real values.
    setProfile({
      ...profile,
      projects: [...profile.projects, { title: '', techStack: '', description: '' }]
    });
  };

  const handleRemoveProject = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: profile.projects.filter((_, i) => i !== index)
    });
  };

  const handleAddSkill = () => {
    if (!profile || !newSkill.trim()) return;
    setProfile({
      ...profile,
      skills: Array.from(new Set([...profile.skills, newSkill.trim()]))
    });
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.filter(s => s !== skill)
    });
  };

  const handleAddMissingSkill = () => {
    if (!profile || !newMissingSkill.trim()) return;
    setProfile({
      ...profile,
      missingSkills: Array.from(new Set([...profile.missingSkills, newMissingSkill.trim()]))
    });
    setNewMissingSkill('');
  };

  const handleRemoveMissingSkill = (skill: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      missingSkills: profile.missingSkills.filter(s => s !== skill)
    });
  };

  // Calculate dynamic completeness score
  const completeness = calculateDynamicProfileCompleteness(user, profile);

  return (
    <div className="space-y-8">
      
      {/* Visual Top Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#F58220] text-[10px] font-black uppercase tracking-wider">
            <Brain className="w-3.5 h-3.5" />
            <span>AI Resume Parser & Analyzer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {language === 'bn' ? 'এআই ক্যারিয়ার প্রোফাইল হাব' : 'AI Career Profile Hub'}
          </h1>
          <p className="text-xs text-slate-400 max-w-xl font-medium leading-relaxed">
            {language === 'bn'
              ? 'আপনার সিভি আপলোড করে এআই-এর মাধ্যমে আপনার অভিজ্ঞতা, শিক্ষা এবং স্কিল অ্যানালিসিস করুন।'
              : 'Upload your PDF resume to extract dynamic skills, education structures, work histories, and AI strategic gap analyses.'}
          </p>
        </div>

        {profile && (
          <div className="flex gap-2 z-10 shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{language === 'bn' ? 'তথ্য সেভ করুন' : 'Save Profile'}</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-700 transition-all"
                >
                  <span>{language === 'bn' ? 'বাতিল' : 'Cancel'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ED1C24] to-[#F58220] hover:opacity-95 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                <span>{language === 'bn' ? 'প্রোফাইল এডিট করুন' : 'Edit Profile'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main UI layout: Two Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Columns (Slightly larger: Upload & Data Cards) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Status feedback toasts */}
          {statusMsg && (
            <div
              className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 transition-all ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* 1. Visually Premium Drag-and-Drop Resume Upload Card */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative p-8 rounded-3xl bg-white border-2 border-dashed text-center transition-all ${
              dragActive
                ? 'border-[#F58220] bg-orange-500/5 shadow-inner'
                : 'border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            {isParsing ? (
              /* Real-time Loading Progress Screen with precise stats */
              <div className="space-y-6 py-6 max-w-md mx-auto">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500/10 border-t-[#F58220] animate-spin" />
                  <Brain className="w-8 h-8 text-[#F58220] animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-black text-slate-900">{uploadStep}</p>
                  <p className="text-xs font-bold text-slate-400">
                    {language === 'bn' ? 'সার্ভার সোর্স কোড কী লিক প্রোটেকশন সক্রিয়।' : 'Secure pipeline executing sandboxed resume queries.'}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                    <span>Analysis Speed Progress</span>
                    <span className="text-[#F58220] font-black">{uploadPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-100">
                    <div
                      className="bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] h-full transition-all duration-300"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Ready State */
              <div className="space-y-4 py-4 max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center mx-auto text-[#F58220] group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 stroke-[2.5]" />
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-900">
                    {language === 'bn' ? 'এখানে আপনার সিভি ড্র্যাগ করুন অথবা ক্লিক করে আপলোড করুন' : 'Drag & drop your resume here, or browse files'}
                  </p>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">
                    {language === 'bn'
                      ? 'পিডিএফ (PDF), ডকএক্স (DOCX) বা টেক্সট (TXT) ফরম্যাট সাপোর্ট করে। সর্বোচ্চ ৫ মেগাবাইট।'
                      : 'Accepts PDF, DOCX, TXT. Up to 5MB. Powered by Groq Llama 3.3 70B AI.'}
                  </p>
                </div>

                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs cursor-pointer shadow-md transition-all active:scale-95">
                    <FileText className="w-4 h-4 text-[#F58220]" />
                    <span>{language === 'bn' ? 'ফাইল সিলেক্ট করুন' : 'Choose File'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileInput}
                    />
                  </label>
                </div>

                {uploadedFileName && (
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Uploaded: {uploadedFileName}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* SaaS Tabs System for clean data separation */}
          <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
            <div className="flex border-b border-slate-100 bg-slate-50/60 overflow-x-auto text-xs font-black uppercase tracking-wider divide-x divide-slate-100">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 min-w-[120px] py-4 text-center transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-white text-[#F58220] border-b-2 border-b-[#F58220]'
                    : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-900'
                }`}
              >
                {language === 'bn' ? 'সাধারণ তথ্য' : 'General Info'}
              </button>
              <button
                onClick={() => setActiveTab('work_edu')}
                className={`flex-1 min-w-[140px] py-4 text-center transition-colors ${
                  activeTab === 'work_edu'
                    ? 'bg-white text-[#F58220] border-b-2 border-b-[#F58220]'
                    : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-900'
                }`}
              >
                {language === 'bn' ? 'অভিজ্ঞতা ও শিক্ষা' : 'Work & Education'}
              </button>
              <button
                onClick={() => setActiveTab('skills')}
                className={`flex-1 min-w-[120px] py-4 text-center transition-colors ${
                  activeTab === 'skills'
                    ? 'bg-white text-[#F58220] border-b-2 border-b-[#F58220]'
                    : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-900'
                }`}
              >
                {language === 'bn' ? 'দক্ষতা সমূহ' : 'Skills Stack'}
              </button>
              <button
                onClick={() => setActiveTab('ai_insights')}
                className={`flex-1 min-w-[130px] py-4 text-center transition-colors ${
                  activeTab === 'ai_insights'
                    ? 'bg-white text-[#F58220] border-b-2 border-b-[#F58220]'
                    : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-900'
                }`}
              >
                {language === 'bn' ? 'এআই স্ট্র্যাটেজিক অ্যানালিসিস' : 'AI Strategic Insights'}
              </button>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {/* Empty state when no AI career profile exists yet.
                    We do NOT seed any demo data. The user must upload a real
                    CV to populate this section. */}
                {!profile && (
                  <motion.div
                    key="empty-state"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3 text-center py-10"
                  >
                    <Brain className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">
                      {language === 'bn'
                        ? 'কোনো ক্যারিয়ার প্রোফাইল যোগ করা হয়নি'
                        : 'No career profile added yet'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {language === 'bn'
                        ? 'আপনার সিভি আপলোড করলে এআই এখানে আপনার শিক্ষা, অভিজ্ঞতা ও দক্ষতা স্বয়ংক্রিয়ভাবে যোগ করবে।'
                        : 'Upload your CV above and the AI will populate your education, experience, skills, and projects here.'}
                    </p>
                  </motion.div>
                )}
                {/* TAB 1: GENERAL INFO */}
                {activeTab === 'overview' && profile && (
                  <motion.div
                    key="overview-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6 text-xs font-semibold"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                          />
                        ) : (
                          <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 font-extrabold">{profile.name || 'Not Added'}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={profile.email}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                          />
                        ) : (
                          <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 font-extrabold">{profile.email || 'Not Added'}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                          />
                        ) : (
                          <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 font-extrabold">{profile.phone || 'Not Added'}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Location</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profile.location}
                            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                          />
                        ) : (
                          <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 font-extrabold">{profile.location || 'Not Added'}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Professional Summary / Bio</label>
                      {isEditing ? (
                        <textarea
                          rows={4}
                          value={profile.bio}
                          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold resize-none"
                        />
                      ) : (
                        <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 leading-relaxed font-semibold">{profile.bio || 'Not Added'}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">GitHub Portfolio</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profile.github_url || ''}
                            onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                            placeholder="https://github.com/..."
                          />
                        ) : (
                          <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 font-bold truncate flex items-center gap-1">
                            <Globe className="w-4 h-4 text-slate-400" />
                            <span>{profile.github_url || 'Not Added'}</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">LinkedIn Profile</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profile.linkedin_url || ''}
                            onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                            placeholder="https://linkedin.com/in/..."
                          />
                        ) : (
                          <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 font-bold truncate flex items-center gap-1">
                            <Globe className="w-4 h-4 text-slate-400" />
                            <span>{profile.linkedin_url || 'Not Added'}</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Portfolio Website</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profile.portfolio_url || ''}
                            onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                            placeholder="https://..."
                          />
                        ) : (
                          <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 font-bold truncate flex items-center gap-1">
                            <Globe className="w-4 h-4 text-slate-400" />
                            <span>{profile.portfolio_url || 'Not Added'}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: WORK & EDUCATION */}
                {activeTab === 'work_edu' && profile && (
                  <motion.div
                    key="work_edu-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8 text-xs font-semibold"
                  >
                    
                    {/* Education section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-4.5 h-4.5 text-[#F58220]" />
                          <span>Academic Education History</span>
                        </h3>
                        {isEditing && (
                          <button
                            onClick={handleAddEducation}
                            className="px-2.5 py-1.5 rounded-lg bg-[#F58220]/10 text-[#F58220] font-black text-[10px] uppercase flex items-center gap-1 hover:bg-[#F58220]/15"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Edu</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {profile.education.map((edu, idx) => (
                          <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 relative group space-y-3">
                            {isEditing && (
                              <button
                                onClick={() => handleRemoveEducation(idx)}
                                className="absolute top-4 right-4 text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Degree</label>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={edu.degree}
                                    onChange={(e) => {
                                      const eduCopy = [...profile.education];
                                      eduCopy[idx].degree = e.target.value;
                                      setProfile({ ...profile, education: eduCopy });
                                    }}
                                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                                  />
                                ) : (
                                  <p className="font-extrabold text-slate-900">{edu.degree}</p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Institution</label>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={edu.institution}
                                    onChange={(e) => {
                                      const eduCopy = [...profile.education];
                                      eduCopy[idx].institution = e.target.value;
                                      setProfile({ ...profile, education: eduCopy });
                                    }}
                                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                                  />
                                ) : (
                                  <p className="font-bold text-slate-700">{edu.institution}</p>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">Year Range</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={edu.year}
                                      onChange={(e) => {
                                        const eduCopy = [...profile.education];
                                        eduCopy[idx].year = e.target.value;
                                        setProfile({ ...profile, education: eduCopy });
                                      }}
                                      className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                                    />
                                  ) : (
                                    <p className="font-bold text-slate-600">{edu.year}</p>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">CGPA / Grade</label>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={edu.cgpa || ''}
                                      onChange={(e) => {
                                        const eduCopy = [...profile.education];
                                        eduCopy[idx].cgpa = e.target.value;
                                        setProfile({ ...profile, education: eduCopy });
                                      }}
                                      className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                                      placeholder="3.80"
                                    />
                                  ) : (
                                    <p className="font-extrabold text-[#F58220]">{edu.cgpa || 'N/A'}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Experience Section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Briefcase className="w-4.5 h-4.5 text-[#F58220]" />
                          <span>Professional Experience</span>
                        </h3>
                        {isEditing && (
                          <button
                            onClick={handleAddExperience}
                            className="px-2.5 py-1.5 rounded-lg bg-[#F58220]/10 text-[#F58220] font-black text-[10px] uppercase flex items-center gap-1 hover:bg-[#F58220]/15"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Work</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {profile.experience.map((work, idx) => (
                          <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 relative group space-y-3">
                            {isEditing && (
                              <button
                                onClick={() => handleRemoveExperience(idx)}
                                className="absolute top-4 right-4 text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Role / Title</label>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={work.role}
                                    onChange={(e) => {
                                      const workCopy = [...profile.experience];
                                      workCopy[idx].role = e.target.value;
                                      setProfile({ ...profile, experience: workCopy });
                                    }}
                                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                                  />
                                ) : (
                                  <p className="font-extrabold text-slate-900">{work.role}</p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Company Name</label>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={work.company}
                                    onChange={(e) => {
                                      const workCopy = [...profile.experience];
                                      workCopy[idx].company = e.target.value;
                                      setProfile({ ...profile, experience: workCopy });
                                    }}
                                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                                  />
                                ) : (
                                  <p className="font-bold text-slate-700">{work.company}</p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Duration / Years</label>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={work.duration}
                                    onChange={(e) => {
                                      const workCopy = [...profile.experience];
                                      workCopy[idx].duration = e.target.value;
                                      setProfile({ ...profile, experience: workCopy });
                                    }}
                                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                                  />
                                ) : (
                                  <p className="font-bold text-slate-600">{work.duration}</p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1 pt-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Work Summary</label>
                              {isEditing ? (
                                <textarea
                                  rows={3}
                                  value={work.summary}
                                  onChange={(e) => {
                                    const workCopy = [...profile.experience];
                                    workCopy[idx].summary = e.target.value;
                                    setProfile({ ...profile, experience: workCopy });
                                  }}
                                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold resize-none"
                                />
                              ) : (
                                <p className="text-slate-600 leading-relaxed font-medium">{work.summary}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Projects Section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Folder className="w-4.5 h-4.5 text-[#F58220]" />
                          <span>Engineering Projects</span>
                        </h3>
                        {isEditing && (
                          <button
                            onClick={handleAddProject}
                            className="px-2.5 py-1.5 rounded-lg bg-[#F58220]/10 text-[#F58220] font-black text-[10px] uppercase flex items-center gap-1 hover:bg-[#F58220]/15"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Project</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {profile.projects.map((proj, idx) => (
                          <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 relative group space-y-3">
                            {isEditing && (
                              <button
                                onClick={() => handleRemoveProject(idx)}
                                className="absolute top-4 right-4 text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Project Title</label>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={proj.title}
                                    onChange={(e) => {
                                      const projCopy = [...profile.projects];
                                      projCopy[idx].title = e.target.value;
                                      setProfile({ ...profile, projects: projCopy });
                                    }}
                                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                                  />
                                ) : (
                                  <p className="font-extrabold text-slate-900">{proj.title}</p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Tech Stack (comma separated)</label>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={proj.techStack}
                                    onChange={(e) => {
                                      const projCopy = [...profile.projects];
                                      projCopy[idx].techStack = e.target.value;
                                      setProfile({ ...profile, projects: projCopy });
                                    }}
                                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                                  />
                                ) : (
                                  <p className="text-[#F58220] font-black">{proj.techStack}</p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1 pt-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Project Description</label>
                              {isEditing ? (
                                <textarea
                                  rows={2}
                                  value={proj.description}
                                  onChange={(e) => {
                                    const projCopy = [...profile.projects];
                                    projCopy[idx].description = e.target.value;
                                    setProfile({ ...profile, projects: projCopy });
                                  }}
                                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold resize-none"
                                />
                              ) : (
                                <p className="text-slate-600 leading-relaxed font-medium">{proj.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: SKILLS STACK */}
                {activeTab === 'skills' && profile && (
                  <motion.div
                    key="skills-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6 text-xs font-semibold"
                  >
                    
                    {/* Flat Skills list with tags */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                        <Code2 className="w-4.5 h-4.5 text-[#F58220]" />
                        <span>Core Engineering Technologies</span>
                      </h3>

                      {isEditing && (
                        <div className="flex gap-2 max-w-md">
                          <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                            placeholder="Add tech skill (e.g. Next.js, Docker)"
                            className="flex-1 p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                          />
                          <button
                            onClick={handleAddSkill}
                            className="px-4 py-2.5 rounded-xl bg-[#F58220] text-white font-black"
                          >
                            Add
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        {profile.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/5 text-[#F58220] border border-orange-500/10 font-bold"
                          >
                            <span>{skill}</span>
                            {isEditing && (
                              <button
                                onClick={() => handleRemoveSkill(skill)}
                                className="text-[#ED1C24] hover:text-red-800"
                              >
                                &times;
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Categorized Skills parsed by Groq */}
                    {profile.categorizedSkills && (
                      <div className="space-y-4 pt-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-slate-400" />
                          <span>AI Categorized Skill Matrix</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {Object.entries(profile.categorizedSkills).map(([category, list]) => {
                            if (!Array.isArray(list) || list.length === 0) return null;
                            return (
                              <div key={category} className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80 space-y-2">
                                <span className="text-[9px] font-black uppercase text-[#F58220] tracking-widest">{category}</span>
                                <p className="text-slate-800 font-bold leading-relaxed">{list.join(', ')}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TAB 4: AI STRATEGIC INSIGHTS */}
                {activeTab === 'ai_insights' && profile && (
                  <motion.div
                    key="ai_insights-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6 text-xs font-semibold"
                  >
                    
                    {/* Score grids */}
                    {profile.scores && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                          <TrendingUp className="w-4.5 h-4.5 text-[#F58220]" />
                          <span>Candidate Competitiveness Scores</span>
                        </h3>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          {Object.entries(profile.scores).map(([metric, val]) => (
                            <div key={metric} className="p-4 rounded-2xl bg-white border border-slate-200/80 text-center space-y-1 shadow-sm">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">{metric}</span>
                              <p className="text-xl font-black text-slate-900">{val}%</p>
                              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#F58220] h-full"
                                  style={{ width: `${val}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-3">
                        <span className="text-xs font-black text-emerald-700 uppercase tracking-wider block">Candidate Strengths</span>
                        <ul className="space-y-2">
                          {profile.strengths.map((str, idx) => (
                            <li key={idx} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-800 font-bold flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <span className="text-xs font-black text-[#ED1C24] uppercase tracking-wider block">Potential Gaps / Areas to Work On</span>
                        <ul className="space-y-2">
                          {profile.weaknesses.map((wk, idx) => (
                            <li key={idx} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-800 font-bold flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-[#ED1C24]" />
                              <span>{wk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* CV Weakness & CV Improvement (From Groq JSON) */}
                    {(profile.cvWeakness || profile.cvImprovement) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                        {profile.cvWeakness && profile.cvWeakness.length > 0 && (
                          <div className="space-y-3">
                            <span className="text-xs font-black text-rose-700 uppercase tracking-wider block">CV Writing Gaps</span>
                            <ul className="space-y-2">
                              {profile.cvWeakness.map((w, idx) => (
                                <li key={idx} className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 font-bold flex items-center gap-2">
                                  <Info className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                                  <span>{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {profile.cvImprovement && profile.cvImprovement.length > 0 && (
                          <div className="space-y-3">
                            <span className="text-xs font-black text-blue-700 uppercase tracking-wider block">Actionable Improvement Steps</span>
                            <ul className="space-y-2">
                              {profile.cvImprovement.map((imp, idx) => (
                                <li key={idx} className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 font-bold flex items-center gap-2">
                                  <Lightbulb className="w-4.5 h-4.5 text-blue-500 shrink-0" />
                                  <span>{imp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Missing stack, Languages, Interests */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                      <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-black text-[#ED1C24] uppercase tracking-wider">Missing Technologies</span>
                        <p className="font-bold text-slate-800 leading-relaxed">
                          {profile.missingSkills && profile.missingSkills.length > 0 ? profile.missingSkills.join(', ') : 'None Detected'}
                        </p>
                      </div>

                      <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-black text-[#F58220] uppercase tracking-wider">Languages</span>
                        <p className="font-bold text-slate-800 leading-relaxed">
                          {profile.languages && profile.languages.length > 0 ? profile.languages.join(', ') : 'Not Extracted'}
                        </p>
                      </div>

                      <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-black text-[#FFB000] uppercase tracking-wider">Target Career Roles</span>
                        <p className="font-bold text-slate-800 leading-relaxed">
                          {profile.careerInterests && profile.careerInterests.length > 0 ? profile.careerInterests.join(', ') : 'Not Extracted'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* Right Sidebar Column (Completeness Gauges & Recommendations) */}
        <div className="space-y-6">
          
          {/* 2. Profile Completion Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm text-xs font-semibold">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Profile Completeness</span>
              <span className="text-xs font-black text-[#F58220] bg-orange-500/10 px-2 py-0.5 rounded-full">{completeness}%</span>
            </div>

            {/* Completeness percentage bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-100">
                <div
                  className="bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] h-full transition-all duration-700"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                {language === 'bn'
                  ? 'আপনার টেক প্রোফাইলের ৯টি ফিল্ড (শিক্ষা, অভিজ্ঞতা, স্কিল, প্রজেক্ট, সিভি ফাইল ইত্যাদি) কমপ্লিট করে স্কোর বৃদ্ধি করুন।'
                  : 'Score tracks Name, Phone, Bio, Photo, Education, Experience, Skills, Projects, and CV attachment.'}
              </p>
            </div>

            <div className="my-2 border-t border-slate-100" />

            {/* Checklist of 9 items */}
            <div className="space-y-2.5 pt-1 text-[11px]">
              
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">1. Full Name</span>
                {profile?.name ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">2. Phone Number</span>
                {profile?.phone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">3. Bio Summary</span>
                {profile?.bio ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">4. Profile Photo</span>
                {user?.avatar_url ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">5. Academic Education</span>
                {profile?.education && profile.education.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">6. Work Experience</span>
                {profile?.experience && profile.experience.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">7. Professional Skills</span>
                {profile?.skills && profile.skills.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">8. Projects Portfolio</span>
                {profile?.projects && profile.projects.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">9. PDF Resume Attached</span>
                {profile?.resume_url ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

            </div>
          </div>

          {/* AI Advisor Actions Panel */}
          {profile && profile.improvement_suggestions && profile.improvement_suggestions.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 text-xs font-semibold">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-[#F58220] fill-current animate-pulse" />
                <span>AI Improvement Advisory</span>
              </h4>
              
              <ul className="space-y-3">
                {profile.improvement_suggestions.map((sug, idx) => (
                  <li key={idx} className="p-3 bg-white border border-slate-200/60 rounded-xl leading-relaxed text-slate-600 font-medium shadow-sm flex gap-2">
                    <ChevronRight className="w-4 h-4 text-[#F58220] shrink-0 mt-0.5" />
                    <span>{sug}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
