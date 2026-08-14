/* eslint-disable react/no-unescaped-entities */

/**
 * PublicProfileView
 * -----------------
 * Composite of the new /verify profile sections in the precise order
 * specified by the SkillProof Employer Verification spec:
 *
 *   1. Profile                  → ProfileHero
 *   2. Career Information       → CareerInformationSection
 *      (rich profile card: personal + professional fields, privacy-gated)
 *   3. Career Summary           → CareerSummarySection
 *   4. Skills                   → SkillsSection
 *   5. Verified Skills          → VerifiedSkillsSection
 *   6. Experience               → ExperienceSection
 *   7. Education                → EducationSection
 *   8. Certifications           → CertificationsSection
 *   9. Projects                 → ProjectsSection
 *  10. Portfolio & Social Links → PortfolioSection
 *  11. Career Readiness         → CareerReadinessSection
 *      (separate from assessment / credential scores)
 *  12. Skill Credentials        → CredentialsSection
 *      (multi-passport, no "primary" — every passport is independent)
 *  13. Verification             → VerificationSection
 *  14. Hire / Contact           → HireContactSection
 *
 * Privacy behaviour:
 *   - All sections silently hide when their data is empty.
 *   - When `payload.allow_employer_verification === false`, this
 *     component shows a clean private screen and renders NO
 *     professional content.
 *   - This component is fully driven by the unified RPC
 *     (fn_public_candidate_unified_view) output and the privacy
 *     toggles baked into the payload.
 *   - `verifiedUrl` is the canonical /verify?id= link used for the
 *     QR code + share buttons.
 *
 * Note: this component does NOT expose a "Download Digital CV" button
 * (per the explicit user direction). The Digital CV download service
 * is still available as a utility but is not surfaced in the UI.
 */

import React, { useMemo } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { ProfileHero } from './ProfileHero';
import { CareerInformationSection } from './CareerInformationSection';
import { CareerSummarySection } from './CareerSummarySection';
import { SkillsSection } from './SkillsSection';
import { VerifiedSkillsSection } from './VerifiedSkillsSection';
import { ExperienceSection } from './ExperienceSection';
import { EducationSection } from './EducationSection';
import { CertificationsSection } from './CertificationsSection';
import { ProjectsSection } from './ProjectsSection';
import { PortfolioSection } from './PortfolioSection';
import { CareerReadinessSection } from './CareerReadinessSection';
import { CredentialsSection } from './CredentialsSection';
import { CourseCertificatesSection } from './CourseCertificatesSection';
import { VerificationSection } from './VerificationSection';
import { HireContactSection } from './HireContactSection';
import { safeStr } from './profileHelpers';

interface Props {
  payload: any;
  verificationUrl: string | null;
}

export function PublicProfileView({ payload, verificationUrl }: Props) {
  const allowEmployer = Boolean(
    (payload as any)?.allow_employer_verification !== false,
  );

  // Pre-compute the empty-state hint for the private screen.
  const candidateName = useMemo(
    () => safeStr(payload?.candidate?.full_name ?? null) || 'SkillProof member',
    [payload],
  );

  if (!allowEmployer) {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            aria-hidden="true"
            className="h-1 w-full"
            style={{
              background: 'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
            }}
          />
          <div className="flex flex-col items-center gap-4 p-8 text-center sm:p-12">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                Private SkillProof Profile
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900 break-words">
                {candidateName} has chosen to keep their verified profile private.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-600 break-words">
                This candidate has turned off Employer Verification. Their
                professional information (skills, assessments, AI Career
                Profile, contact details) is not available publicly.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified by SkillProof — but private by candidate choice.
            </div>
            {verificationUrl ? (
              <p className="mt-2 text-[11px] text-slate-400">
                Verification URL:{' '}
                <span className="font-mono text-slate-500">{verificationUrl}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProfileHero
        payload={payload}
        verificationUrl={verificationUrl}
      />
      <CareerInformationSection payload={payload} />
      <CareerSummarySection payload={payload} />
      <SkillsSection payload={payload} />
      <VerifiedSkillsSection payload={payload} />
      <ExperienceSection payload={payload} />
      <EducationSection payload={payload} />
      <CertificationsSection payload={payload} />
      <ProjectsSection payload={payload} />
      <PortfolioSection payload={payload} />
      <CareerReadinessSection payload={payload} />
      <CredentialsSection payload={payload} />
      <CourseCertificatesSection payload={payload} />
      <VerificationSection payload={payload} verificationUrl={verificationUrl} />
      <HireContactSection
        payload={payload}
        verificationUrl={verificationUrl}
      />
    </div>
  );
}

export default PublicProfileView;
