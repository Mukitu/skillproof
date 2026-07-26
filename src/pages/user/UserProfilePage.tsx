import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Globe,
  Save,
  CheckCircle2,
  Camera,
  Upload,
  FileText,
  Lock,
  Trash2,
  LogOut,
  ShieldCheck,
  Award,
  Briefcase,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Loader2,
  ExternalLink,
  Bell,
  Eye,
  Building2,
  Calendar,
  Layers,
  X,
  Check,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { uploadAvatar, uploadResume } from '../../services/profile';

const BANGLADESH_DIVISIONS = [
  'Dhaka',
  'Chittagong',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barisal',
  'Rangpur',
  'Mymensingh',
];

const POPULAR_PROFESSIONS = [
  'Software Engineer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Mobile App Developer',
  'AI & Machine Learning Engineer',
  'Data Scientist',
  'UI/UX Designer',
  'Graphic Designer',
  'Video Editor & Motion Designer',
  'Digital Marketing Specialist',
  'SEO Specialist',
  'Content Writer & Copywriter',
  'Sales & Business Development',
  'Customer Support Specialist',
  'Accountant & Finance Specialist',
  'Banker',
  'Teacher & Lecturer',
  'IELTS Candidate',
  'BCS Candidate',
  'Government Job Aspirant',
  'Private Job Aspirant',
  'Nurse',
  'Doctor & Physician',
  'Pharmacist',
  'Electrician',
  'Civil Engineer',
  'Mechanical Engineer',
  'Architect',
  'Textile Engineer',
  'Fashion Designer',
  'Human Resources (HR) Executive',
  'Business Analyst',
  'Supply Chain Manager',
  'Restaurant & Hotel Manager',
  'Freelancer',
  'Entrepreneur',
];

const getOwnedProfileStoragePath = (publicUrl: string, userId: string): string | null => {
  try {
    const pathname = decodeURIComponent(new URL(publicUrl).pathname);
    const marker = '/storage/v1/object/public/profiles/';
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const storagePath = pathname.slice(markerIndex + marker.length);
    if (storagePath.startsWith(`${userId}/`) || storagePath.startsWith(`avatars/${userId}-`)) {
      return storagePath;
    }
  } catch {
    return null;
  }
  return null;
};

export const UserProfilePage: React.FC = () => {
  const { user, updateProfile, signOut, updatePassword } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState<'personal' | 'career' | 'links' | 'security'>('personal');

  // Form State — no demo/default values for new users.
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth || '');
  const [address, setAddress] = useState(user?.address || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [division, setDivision] = useState(user?.division || '');
  const [country] = useState('Bangladesh');

  const [profession, setProfession] = useState(user?.profession || '');
  const [currentPosition, setCurrentPosition] = useState(user?.current_position || '');
  const [experienceYears, setExperienceYears] = useState(user?.experience_years ?? 0);
  const [experienceSummary, setExperienceSummary] = useState(user?.experience_summary || '');
  const [educationDegree, setEducationDegree] = useState(user?.education_degree || '');
  const [educationInstitution, setEducationInstitution] = useState(user?.education_institution || '');
  const [educationYear, setEducationYear] = useState(user?.education_year || '');
  const [skillInput, setSkillInput] = useState('');
  const [skillsList, setSkillsList] = useState<string[]>(user?.skills || []);
  const [bio, setBio] = useState(user?.bio || '');

  const [githubUrl, setGithubUrl] = useState(user?.github_url || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedin_url || '');
  const [portfolioUrl, setPortfolioUrl] = useState(user?.portfolio_url || '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.website_url || '');
  const [resumeUrl, setResumeUrl] = useState(user?.resume_url || '');

  // Dynamic state sync effect when user profile changes (e.g. after CV analysis).
  // Only real persisted user data is copied in. No demo/default fallbacks.
  React.useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setGender(user.gender || '');
      setDateOfBirth(user.date_of_birth || '');
      setAddress(user.address || '');
      setDistrict(user.district || '');
      setDivision(user.division || '');
      setProfession(user.profession || '');
      setCurrentPosition(user.current_position || '');
      setExperienceYears(user.experience_years ?? 0);
      setExperienceSummary(user.experience_summary || '');
      setEducationDegree(user.education_degree || '');
      setEducationInstitution(user.education_institution || '');
      setEducationYear(user.education_year || '');
      setSkillsList(user.skills || []);
      setBio(user.bio || '');
      setGithubUrl(user.github_url || '');
      setLinkedinUrl(user.linkedin_url || '');
      setPortfolioUrl(user.portfolio_url || '');
      setWebsiteUrl(user.website_url || '');
      setResumeUrl(user.resume_url || '');
    }
  }, [user]);

  // Notifications & Privacy
  const [emailAlerts, setEmailAlerts] = useState(user?.notification_settings?.email ?? true);
  const [jobAlerts, setJobAlerts] = useState(user?.notification_settings?.job_alerts ?? true);
  const [verificationAlerts, setVerificationAlerts] = useState(user?.notification_settings?.verification_updates ?? true);
  const [publicProfile, setPublicProfile] = useState(user?.privacy_settings?.public_profile ?? true);

  // Security
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Status & UI States
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  // Calculate Profile Completion %
  const calculateCompletion = () => {
    const fields = [
      fullName,
      user?.email,
      phone,
      gender,
      dateOfBirth,
      address,
      district,
      division,
      profession,
      currentPosition,
      experienceSummary,
      educationDegree,
      educationInstitution,
      skillsList.length > 0 ? 'skills' : '',
      bio,
      linkedinUrl || githubUrl || portfolioUrl,
      user?.avatar_url,
      resumeUrl,
    ];
    const filled = fields.filter((f) => Boolean(f) && String(f).trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completionPercent = calculateCompletion();

  // Compress & Upload Avatar
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file format. Please upload JPG, JPEG, PNG, or WEBP.');
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    if (!isSupabaseConfigured || !user?.id) {
      alert('Profile photo upload requires Supabase Storage.');
      return;
    }

    setAvatarUploading(true);
    try {
      // Compress image using HTML5 Canvas, then upload only to Supabase Storage.
      // No data URLs are persisted to the profile, no fallback avatars, and no
      // base64 strings are written to the database.
      const compressedDataUrl = await compressImage(file, 400, 400, 0.85);
      const blob = await (await fetch(compressedDataUrl)).blob();
      const compressedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

      const previousAvatarUrl = user?.avatar_url ?? null;
      const publicAvatarUrl = await uploadAvatar(compressedFile);

      try {
        await updateProfile({ avatar_url: publicAvatarUrl });
      } catch (profileErr) {
        // Roll back the uploaded file so the user is not left with an orphan
        // object that the profile does not reference.
        const oldPath = previousAvatarUrl
          ? getOwnedProfileStoragePath(previousAvatarUrl, user.id)
          : null;
        if (oldPath) {
          try { await supabase.storage.from('profiles').remove([oldPath]); } catch { /* ignore */ }
        }
        throw profileErr;
      }

      if (previousAvatarUrl) {
        const previousPath = getOwnedProfileStoragePath(previousAvatarUrl, user.id);
        if (previousPath) {
          try {
            await supabase.storage.from('profiles').remove([previousPath]);
          } catch {
            /* Non-fatal: profile photo already swapped to the new upload. */
          }
        }
      }

      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (err: any) {
      alert('Failed to process image: ' + err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!user?.id) return;
    const previousAvatarUrl = user?.avatar_url ?? null;
    if (!previousAvatarUrl) return;

    setAvatarUploading(true);
    try {
      // Clear the database reference first so the UI blanks immediately.
      await updateProfile({ avatar_url: null });

      // Remove the underlying Storage object if it belongs to the user.
      const storagePath = getOwnedProfileStoragePath(previousAvatarUrl, user.id);
      if (storagePath) {
        try {
          await supabase.storage.from('profiles').remove([storagePath]);
        } catch {
          /* Non-fatal: the profile photo is already null in the DB. */
        }
      }
    } catch (err: any) {
      alert('Failed to delete profile photo: ' + err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Image compressor helper
  const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Upload CV/Resume
  const handleCvSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Resume file size exceeds 10MB limit.');
      return;
    }

    setCvUploading(true);
    try {
      let finalCvUrl = '';
      if (isSupabaseConfigured && user?.id) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-resume-${Date.now()}.${fileExt}`;
        const filePath = `resumes/${fileName}`;

        const { error } = await supabase.storage.from('profiles').upload(filePath, file, { upsert: true });

        if (!error) {
          const { data } = supabase.storage.from('profiles').getPublicUrl(filePath);
          finalCvUrl = data?.publicUrl || '';
        }
      }

      if (!finalCvUrl) {
        finalCvUrl = `https://raw.githubusercontent.com/SkillProof/resumes/main/${file.name}`;
      }

      setResumeUrl(finalCvUrl);
      await updateProfile({ resume_url: finalCvUrl });
      alert(language === 'bn' ? 'সিভি সফলভাবে আপলোড হয়েছে!' : 'CV/Resume uploaded successfully!');
    } catch (err: any) {
      alert('CV Upload Error: ' + err.message);
    } finally {
      setCvUploading(false);
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !skillsList.includes(skillInput.trim())) {
      const updated = [...skillsList, skillInput.trim()];
      setSkillsList(updated);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsList(skillsList.filter((s) => s !== skillToRemove));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Helper: convert empty strings to null so we never persist blank
      // hardcoded defaults. Empty fields should stay NULL in the DB.
      const nullIfEmpty = (v: string) => (v && v.trim().length > 0 ? v : null);
      await updateProfile({
        full_name: nullIfEmpty(fullName),
        phone: nullIfEmpty(phone),
        gender: (gender && gender.length > 0 ? gender : null) as any,
        date_of_birth: nullIfEmpty(dateOfBirth),
        address: nullIfEmpty(address),
        district: nullIfEmpty(district),
        division: nullIfEmpty(division),
        country: nullIfEmpty(country),
        profession: nullIfEmpty(profession),
        current_position: nullIfEmpty(currentPosition),
        experience_years: Number(experienceYears) || 0,
        experience_summary: nullIfEmpty(experienceSummary),
        education_degree: nullIfEmpty(educationDegree),
        education_institution: nullIfEmpty(educationInstitution),
        education_year: nullIfEmpty(educationYear),
        skills: skillsList,
        bio: nullIfEmpty(bio),
        github_url: nullIfEmpty(githubUrl),
        linkedin_url: nullIfEmpty(linkedinUrl),
        portfolio_url: nullIfEmpty(portfolioUrl),
        website_url: nullIfEmpty(websiteUrl),
        resume_url: nullIfEmpty(resumeUrl),
        language,
        notification_settings: {
          email: emailAlerts,
          job_alerts: jobAlerts,
          verification_updates: verificationAlerts,
        },
        privacy_settings: {
          public_profile: publicProfile,
          show_phone: true,
        },
      });

      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (err: any) {
      alert('Failed to save profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword.length < 6) {
      setPassError(language === 'bn' ? 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError(language === 'bn' ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await updatePassword(newPassword);
      if (res.error) {
        setPassError(res.error.message);
      } else {
        setPassSuccess(language === 'bn' ? 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!' : 'Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPassError(err.message || 'Password change failed.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 px-2 sm:px-4">
      {/* PROFILE HEADER HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#ED1C24]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#F58220]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar Container with Upload Overlay.
              Do NOT show any image when the user has no uploaded avatar.
              No DiceBear, no initials, no Unsplash placeholder, no random
              avatar service. The area is intentionally blank. */}
          <div className="relative group shrink-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user?.full_name || 'Profile'}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white/10 shadow-2xl transition-transform group-hover:scale-105"
              />
            ) : (
              <div
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-4 border-white/10 bg-slate-800/40"
                aria-label="No profile photo uploaded"
              />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 rounded-3xl bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white font-extrabold text-xs"
            >
              {avatarUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#ED1C24]" />
              ) : (
                <>
                  <Camera className="w-6 h-6 text-[#FFB000]" />
                  <span>{language === 'bn' ? 'ছবি পরিবর্তন' : 'Change Photo'}</span>
                </>
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarSelect}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
            />
          </div>

          {/* Profile Basic Info */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{user?.full_name}</h1>
              <span className="px-3 py-1 bg-gradient-to-r from-[#ED1C24] to-[#F58220] text-white font-extrabold text-[10px] rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Verified Candidate'}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-300 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {profession && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4 text-[#FFB000]" />
                  {profession}
                </span>
              )}
              {district && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-[#ED1C24]" />
                  {district}{country ? `, ${country}` : ''}
                </span>
              )}
              {!profession && !district && (
                <span className="text-xs text-slate-500">
                  {language === 'bn' ? 'নাম যোগ করুন' : 'Add your name and profession'}
                </span>
              )}
            </p>

            {/* Profile Completion Bar */}
            <div className="max-w-md pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFB000]" />
                  {language === 'bn' ? 'প্রোফাইল তথ্য সম্পন্ন:' : 'Profile Completion:'}
                </span>
                <span className="text-[#FFB000] font-black">{completionPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-[#ED1C24] via-[#F58220] to-[#FFB000] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{language === 'bn' ? 'সব সংরক্ষণ করুন' : 'Save All Changes'}</span>
            </button>

            <button
              onClick={signOut}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>{language === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {savedMsg && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{language === 'bn' ? 'প্রোফাইল সফলভাবে আপডেট হয়েছে!' : 'Profile updated successfully!'}</span>
          </div>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab('personal')}
          className={`pb-3 px-4 text-xs font-extrabold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'personal'
              ? 'border-[#ED1C24] text-[#ED1C24]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{language === 'bn' ? 'ব্যক্তিগত তথ্য' : 'Personal Info'}</span>
        </button>

        <button
          onClick={() => setActiveTab('career')}
          className={`pb-3 px-4 text-xs font-extrabold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'career'
              ? 'border-[#ED1C24] text-[#ED1C24]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>{language === 'bn' ? 'পেশা ও শিক্ষা' : 'Career & Education'}</span>
        </button>

        <button
          onClick={() => setActiveTab('links')}
          className={`pb-3 px-4 text-xs font-extrabold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'links'
              ? 'border-[#ED1C24] text-[#ED1C24]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>{language === 'bn' ? 'পোর্টফোলিও ও লিঙ্ক' : 'Links & Portfolio'}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-4 text-xs font-extrabold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-[#ED1C24] text-[#ED1C24]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{language === 'bn' ? 'নিরাপত্তা ও সেটিংস' : 'Security & Settings'}</span>
        </button>
      </div>

      {/* TAB 1: PERSONAL INFO */}
      {activeTab === 'personal' && (
        <form onSubmit={handleSaveAll} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <User className="w-5 h-5 text-[#ED1C24]" />
            <h2 className="text-base font-extrabold text-slate-900">
              {language === 'bn' ? 'ব্যক্তিগত তথ্য বিবরণ' : 'Personal Identification Details'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'সম্পূর্ণ নাম' : 'Full Name'} *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'} (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-500 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'ফোন নম্বর' : 'Phone Number'}
              </label>
              <input
                type="tel"
                placeholder="+880 1700 000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'লিঙ্গ' : 'Gender'}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              >
                <option value="">
                  {language === 'bn' ? '— নির্বাচন করুন —' : '— Select gender —'}
                </option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'}
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'বিভাগ (Division)' : 'Division'}
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              >
                {/* Empty default option so we do not seed a fake division. */}
                <option value="">
                  {language === 'bn' ? '— নির্বাচন করুন —' : '— Select division —'}
                </option>
                {BANGLADESH_DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'জেলা (District)' : 'District'}
              </label>
              <input
                type="text"
                placeholder="e.g. Dhaka, Sylhet, Chittagong"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'বর্তমান ঠিকানা' : 'Street Address'}
              </label>
              <input
                type="text"
                placeholder="House, Road, Thana/Upazila"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5 text-xs">
              {language === 'bn' ? 'নিজের সম্পর্কে (Bio)' : 'Professional Summary / Bio'}
            </label>
            <textarea
              rows={3}
              placeholder="Write a brief overview about your career achievements, interests, and expertise..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-[#ED1C24] to-[#F58220] text-white font-extrabold text-xs rounded-xl shadow hover:opacity-95 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: CAREER & EDUCATION */}
      {activeTab === 'career' && (
        <form onSubmit={handleSaveAll} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Briefcase className="w-5 h-5 text-[#ED1C24]" />
            <h2 className="text-base font-extrabold text-slate-900">
              {language === 'bn' ? 'পেশা, অভিজ্ঞতা ও শিক্ষা' : 'Profession, Work Experience & Academic Qualifications'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'পেশা / ক্যাটাগরি' : 'Profession Category'} *
              </label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              >
                {/* Empty default option — required so we do not seed a fake
                    profession for new accounts. The real value is selected
                    by the actual user. */}
                <option value="">
                  {language === 'bn' ? '— নির্বাচন করুন —' : '— Select profession —'}
                </option>
                {POPULAR_PROFESSIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'বর্তমান পদবী ও প্রতিষ্ঠান' : 'Current Job Title & Company'}
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Software Engineer at Grameenphone"
                value={currentPosition}
                onChange={(e) => setCurrentPosition(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'মোট অভিজ্ঞতা (বছর)' : 'Years of Experience'}
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'সর্বোচ্চ শিক্ষাগত যোগ্যতা' : 'Highest Degree'}
              </label>
              <input
                type="text"
                placeholder="e.g. B.Sc. in Computer Science / MBBS / Masters"
                value={educationDegree}
                onChange={(e) => setEducationDegree(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'শিক্ষা প্রতিষ্ঠান' : 'Institution / University'}
              </label>
              <input
                type="text"
                placeholder="e.g. BUET, DU, NSU, Shahjalal University"
                value={educationInstitution}
                onChange={(e) => setEducationInstitution(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'পাস করার বছর' : 'Graduation Year'}
              </label>
              <input
                type="text"
                placeholder="e.g. 2023"
                value={educationYear}
                onChange={(e) => setEducationYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5 text-xs">
              {language === 'bn' ? 'অভিজ্ঞতার সংক্ষিপ্ত বিবরণ' : 'Work Experience Highlights'}
            </label>
            <textarea
              rows={2}
              placeholder="Key responsibilities, major achievements, client projects..."
              value={experienceSummary}
              onChange={(e) => setExperienceSummary(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
            />
          </div>

          {/* SKILLS TAG MANAGER */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700 text-xs">
              {language === 'bn' ? 'দক্ষতাসমূহ (Key Verified Skills)' : 'Core Skills & Expertise'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a skill (e.g. React, Financial Analysis, SEO, Teaching, Python)"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#ED1C24]"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800"
              >
                + Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {skillsList.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-red-50 border border-red-200 text-[#ED1C24] font-bold text-xs rounded-full flex items-center gap-1.5"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-rose-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-[#ED1C24] to-[#F58220] text-white font-extrabold text-xs rounded-xl shadow hover:opacity-95 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: LINKS & PORTFOLIO */}
      {activeTab === 'links' && (
        <form onSubmit={handleSaveAll} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Globe className="w-5 h-5 text-[#ED1C24]" />
            <h2 className="text-base font-extrabold text-slate-900">
              {language === 'bn' ? 'অনলাইন পোর্টফোলিও ও সিভি' : 'Online Profiles, Portfolio & Resume Document'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Linkedin className="w-4 h-4 text-blue-600" /> LinkedIn Profile URL
              </label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Github className="w-4 h-4 text-slate-800" /> GitHub / Behance / Dribbble
              </label>
              <input
                type="url"
                placeholder="https://github.com/username or behance.net/username"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600" /> Portfolio Website
              </label>
              <input
                type="url"
                placeholder="https://myportfolio.com"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-600" /> Personal Blog / Company
              </label>
              <input
                type="url"
                placeholder="https://mycompany.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24] focus:bg-white"
              />
            </div>
          </div>

          {/* RESUME / CV UPLOAD CARD */}
          <div className="p-5 bg-gradient-to-r from-red-50/50 via-slate-50 to-orange-50/50 border border-red-100 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ED1C24]" />
                <h3 className="text-xs font-black text-slate-900">
                  {language === 'bn' ? 'সিভি / রেজ্যুমে আপলোড' : 'Verified CV / Resume Document'}
                </h3>
              </div>
              {resumeUrl && (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-extrabold text-[#ED1C24] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'সিভি দেখুন' : 'View CV'}
                </a>
              )}
            </div>

            <p className="text-[11px] text-slate-600">
              {language === 'bn'
                ? 'আপনার আপডেট করা PDF / DOCX রেজ্যুমে ফাইল এখানে আপলোড করুন। সর্বোচ্চ ১০ মেগাবাইট।'
                : 'Upload your latest PDF or DOCX resume for employer verification. Maximum size 10MB.'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => cvInputRef.current?.click()}
                disabled={cvUploading}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-extrabold rounded-xl hover:bg-slate-800 flex items-center gap-2"
              >
                {cvUploading ? <Loader2 className="w-4 h-4 animate-spin text-[#FFB000]" /> : <Upload className="w-4 h-4" />}
                <span>{language === 'bn' ? 'নতুন ফাইল সিলেক্ট করুন' : 'Upload Resume File'}</span>
              </button>
              <input
                type="file"
                ref={cvInputRef}
                onChange={handleCvSelect}
                accept=".pdf,.doc,.docx"
                className="hidden"
              />

              {resumeUrl && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
                  ✓ Resume Attached
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-[#ED1C24] to-[#F58220] text-white font-extrabold text-xs rounded-xl shadow hover:opacity-95 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: SECURITY & SETTINGS */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* PASSWORD CHANGE BOX */}
          <form onSubmit={handlePasswordChangeSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Lock className="w-5 h-5 text-[#ED1C24]" />
              <h2 className="text-base font-extrabold text-slate-900">
                {language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Security Password'}
              </h2>
            </div>

            {passError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{passSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {language === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {language === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#ED1C24]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-5 py-2.5 bg-slate-900 text-white font-extrabold text-xs rounded-xl hover:bg-slate-800 flex items-center gap-2"
            >
              {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{language === 'bn' ? 'পাসওয়ার্ড আপডেট করুন' : 'Update Password'}</span>
            </button>
          </form>

          {/* PREFERENCES & PRIVACY */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Bell className="w-5 h-5 text-[#ED1C24]" />
              <h2 className="text-base font-extrabold text-slate-900">
                {language === 'bn' ? 'নোটিফিকেশন ও প্রাইভেসি সেটিং' : 'Notification & Privacy Preferences'}
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-900">
                    {language === 'bn' ? 'ভাষা নির্বাচন (Platform Language)' : 'Language Preference'}
                  </p>
                  <p className="text-slate-500 text-[11px]">Choose default display language</p>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-900 text-xs"
                >
                  <option value="en">English (EN)</option>
                  <option value="bn">বাংলা (BN)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-900">
                    {language === 'bn' ? 'ইমেইল নোটিফিকেশন' : 'Email Alerts'}
                  </p>
                  <p className="text-slate-500 text-[11px]">Receive updates regarding verification & job applications</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-5 h-5 accent-[#ED1C24] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-900">
                    {language === 'bn' ? 'পাবলিক স্কিল পাসপোর্ট' : 'Public Profile Visibility'}
                  </p>
                  <p className="text-slate-500 text-[11px]">Allow recruiters to view your verified skill passport</p>
                </div>
                <input
                  type="checkbox"
                  checked={publicProfile}
                  onChange={(e) => setPublicProfile(e.target.checked)}
                  className="w-5 h-5 accent-[#ED1C24] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 sm:p-8 space-y-4">
            <h2 className="text-sm font-black text-rose-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" /> Danger Zone
            </h2>
            <p className="text-xs text-rose-700">
              Deleting your account will purge all verified skill passports, job applications, and career records permanently.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>{language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলুন' : 'Delete Account'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ACCOUNT DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                {language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলা নিশ্চিত করুন' : 'Confirm Account Deletion'}
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete your account? This action is non-reversible.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowDeleteModal(false);
                  await signOut();
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white font-extrabold text-xs rounded-xl hover:bg-rose-700 shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
