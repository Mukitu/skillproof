/* eslint-disable react/no-unescaped-entities */

/**
 * SkillsSection
 * -------------
 * Renders the candidate's public skill list as a chip grid. Every skill
 * the candidate has on file in their SkillProof AI Profile — both
 * verified (passed assessment) and unverified — surfaces here so the
 * employer sees a single combined view.
 *
 * Skills that have a public URL (e.g. evidence link) become clickable
 * links. Verified skills get an extra badge so the employer can tell
 * which skills SkillProof has independently verified.
 *
 * The detailed "Verified Skills" section is rendered separately in
 * VerifiedSkillsSection so the verifier has a dedicated spot, but we
 * never hide chips here just because they're verified.
 */

import React from 'react';
import { Wrench, ExternalLink, ShieldCheck } from 'lucide-react';
import { Section, collectSkills } from './profileHelpers';

interface Props {
  payload: any;
}

export function SkillsSection({ payload }: Props) {
  const { all, verified, withUrl } = collectSkills(payload);

  if (all.length === 0) {
    // Hide the entire section when there's nothing to show.
    return null;
  }

  // Build a set of verified skill names (lowercase) so we can badge
  // verified chips without removing them from the list.
  const verifiedKeys = new Set(verified.map((v) => v.toLowerCase()));
  const unverifiedCount = all.filter((s) => !verifiedKeys.has(s.toLowerCase())).length;

  return (
    <Section
      id="skills"
      eyebrow="Skills"
      title="Public Skills"
      icon={<Wrench className="h-4 w-4" />}
      helper={
        verified.length > 0 && unverifiedCount > 0
          ? `${unverifiedCount} added skill${unverifiedCount === 1 ? '' : 's'} · ${verified.length} verified (see next section)`
          : verified.length > 0
          ? `${all.length} skill${all.length === 1 ? '' : 's'} — all verified by SkillProof`
          : `${all.length} public skill${all.length === 1 ? '' : 's'}`
      }
      badge={`${all.length}`}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {all.map((skill, idx) => {
            const key = skill.toLowerCase();
            const isVerified = verifiedKeys.has(key);
            const url = withUrl.get(key);
            const inner = (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  isVerified
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-slate-200 bg-slate-50 text-slate-700'
                } hover:border-[#E31B23] hover:bg-white hover:text-[#E31B23]`}
              >
                {isVerified ? <ShieldCheck className="h-3 w-3" /> : null}
                {skill}
                {url ? <ExternalLink className="h-3 w-3 opacity-60" /> : null}
              </span>
            );
            if (url) {
              return (
                <a
                  key={`${skill}-${idx}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {inner}
                </a>
              );
            }
            return (
              <span key={`${skill}-${idx}`}>
                {inner}
              </span>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
