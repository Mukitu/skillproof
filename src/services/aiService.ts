
import { parseResume } from './aiCareer';

export async function parseCVTextWithAI(
  _cvText: string,
  base64Data: string,
  fileName: string,
  mimeType: string
): Promise<any> {
  const blob = base64ToBlob(base64Data, mimeType);
  const file = new File([blob], fileName, { type: mimeType });
  const { profile, confidence } = await parseResume(file);
  
  
  return {
    ...profile,
    name: profile.personal_information?.name,
    email: profile.personal_information?.email,
    phone: profile.personal_information?.phone,
    location: profile.personal_information?.location,
    bio: profile.personal_information?.bio,
    github_url: profile.personal_information?.github_url,
    linkedin_url: profile.personal_information?.linkedin_url,
    portfolio_url: profile.personal_information?.portfolio_url,
    confidence_json: confidence,
    confidence_overall: confidence.overall,
  };
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function calculateCompleteness(profile: any): number {
  if (!profile) return 0;
  const keys = ['name', 'email', 'phone', 'location', 'bio', 'skills', 'experience', 'education'];
  const filled = keys.filter((k) => {
    const v = profile[k];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    return !!v;
  }).length;
  return Math.round((filled / keys.length) * 100);
}

export function calculateDynamicProfileCompleteness(_user: any, profile: any): number {
  return calculateCompleteness(profile);
}

export default { parseCVTextWithAI, calculateCompleteness, calculateDynamicProfileCompleteness };