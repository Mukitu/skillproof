
import type { ComponentType, CSSProperties } from 'react';
import { Award, Code2, Sparkles, Wrench } from 'lucide-react';
import type { VerifiedSkill, VerifiedSkillCategory } from '../../types/database';

interface VerifiedSkillBadgesProps {
  skills: VerifiedSkill[];
  
  variant?: 'default' | 'compact' | 'onDark';
  className?: string;
  
  showHeaders?: boolean;
}

const CATEGORY_META: Record<VerifiedSkillCategory, {
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  styles: string;
}> = {
  skill: {
    label: 'Skills',
    icon: Sparkles,
    styles: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  technology: {
    label: 'Technologies',
    icon: Code2,
    styles: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  tool: {
    label: 'Tools',
    icon: Wrench,
    styles: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  core_competency: {
    label: 'Core Competencies',
    icon: Award,
    styles: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
};

const DARK_VARIANT: Record<VerifiedSkillCategory, string> = {
  skill: 'bg-amber-300/20 text-amber-100 border-amber-300/30',
  technology: 'bg-indigo-300/20 text-indigo-100 border-indigo-300/30',
  tool: 'bg-cyan-300/20 text-cyan-100 border-cyan-300/30',
  core_competency: 'bg-emerald-300/20 text-emerald-100 border-emerald-300/30',
};

const ORDER: VerifiedSkillCategory[] = ['skill', 'technology', 'tool', 'core_competency'];

export function VerifiedSkillBadges({
  skills,
  variant = 'default',
  className = '',
  showHeaders = true,
}: VerifiedSkillBadgesProps) {
  if (!skills || skills.length === 0) return null;

  const grouped: Record<VerifiedSkillCategory, VerifiedSkill[]> = {
    skill: [],
    technology: [],
    tool: [],
    core_competency: [],
  };
  for (const s of skills) {
    const cat: VerifiedSkillCategory =
      (Object.keys(grouped) as VerifiedSkillCategory[]).includes(s.category)
        ? s.category
        : 'skill';
    grouped[cat].push(s);
  }

  const isCompact = variant === 'compact';
  const isDark = variant === 'onDark';
  const chipBase = isCompact
    ? 'rounded-full px-2 py-0.5 text-[10px] font-semibold border'
    : 'rounded-full px-3 py-1 text-xs font-semibold border shadow-sm';
  const containerBase = isCompact ? 'flex flex-wrap gap-1.5' : 'flex flex-wrap gap-2';
  const headerBase = 'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]';

  return (
    <div className={`space-y-2 ${className}`} data-testid="verified-skill-badges" data-variant={variant}>
      {ORDER.filter((c) => grouped[c].length > 0).map((cat) => {
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        return (
          <div key={cat} className="space-y-1.5">
            {showHeaders && (
              <p className={`${headerBase} ${isDark ? 'text-amber-200/90' : 'text-slate-500'}`}>
                <Icon size={11} className={isDark ? 'text-amber-300' : ''} /> {meta.label}
              </p>
            )}
            <div className={containerBase}>
              {grouped[cat].map((s) => (
                <span
                  key={`${cat}:${s.name}`}
                  className={`${chipBase} ${isDark ? DARK_VARIANT[cat] : meta.styles}`}
                  title={`${meta.label.slice(0, -1)} · ${s.name}`}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}


export function renderVerifiedSkillsInline(
  skills: VerifiedSkill[],
  options: { compact?: boolean } = {},
): string {
  if (!skills?.length) return '';
  const grouped: Record<VerifiedSkillCategory, VerifiedSkill[]> = {
    skill: [], technology: [], tool: [], core_competency: [],
  };
  for (const s of skills) {
    const c = (Object.keys(grouped) as VerifiedSkillCategory[]).includes(s.category)
      ? s.category : 'skill';
    grouped[c].push(s);
  }
  const palette: Record<VerifiedSkillCategory, { bg: string; fg: string; border: string }> = {
    skill: { bg: 'rgba(251,191,36,0.18)', fg: '#FEF3C7', border: 'rgba(251,191,36,0.35)' },
    technology: { bg: 'rgba(165,180,252,0.18)', fg: '#E0E7FF', border: 'rgba(165,180,252,0.35)' },
    tool: { bg: 'rgba(103,232,249,0.18)', fg: '#CFFAFE', border: 'rgba(103,232,249,0.35)' },
    core_competency: { bg: 'rgba(110,231,183,0.18)', fg: '#D1FAE5', border: 'rgba(110,231,183,0.35)' },
  };
  const labels: Record<VerifiedSkillCategory, string> = {
    skill: 'SKILLS',
    technology: 'TECHNOLOGIES',
    tool: 'TOOLS',
    core_competency: 'CORE COMPETENCIES',
  };
  const chipStyle = (cat: VerifiedSkillCategory): CSSProperties => ({
    background: palette[cat].bg,
    color: palette[cat].fg,
    border: `1px solid ${palette[cat].border}`,
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
  });
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const sections = ORDER.filter((c) => grouped[c].length > 0).map((cat) => `
    <div style="margin-top:${options.compact ? '6px' : '12px'};">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;color:#FCD34D;text-transform:uppercase;margin-bottom:6px;">${labels[cat]}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${grouped[cat].map((s) => `<span style="${Object.entries(chipStyle(cat)).map(([k, v]) => `${k}:${v};`).join('')}">${escape(s.name)}</span>`).join('')}
      </div>
    </div>
  `).join('');

  return sections;
}

export default VerifiedSkillBadges;