import type { PassportLevel } from '../../types/database';

interface LevelBadgeProps {
  level: PassportLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Tier badge for the SkillProof Passport card.
 * Each level has its own gradient palette + iconographic mark.
 */
export function LevelBadge({ level, size = 'md', showLabel = true }: LevelBadgeProps) {
  const styles = STYLES[level];
  const sizing = SIZING[size];
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider ${styles.bg} ${sizing.pad} ${sizing.text}`}>
      <svg viewBox="0 0 24 24" className={sizing.icon} fill="currentColor" aria-hidden>
        <path d={MARK_PATH[level]} />
      </svg>
      {showLabel && <span>{level}</span>}
    </div>
  );
}

const MARK_PATH: Record<PassportLevel, string> = {
  Bronze:
    'M12 2 L14.6 8.5 L21.5 9 L16.3 13.5 L18 20.5 L12 16.8 L6 20.5 L7.7 13.5 L2.5 9 L9.4 8.5 Z',
  Silver:
    'M12 2 L21 7 L21 14 C21 18 17 21 12 22 C7 21 3 18 3 14 L3 7 Z M9 12 L11 14 L15 10',
  Gold:
    'M12 2 L15 9 L22 9 L16.5 13 L19 20 L12 15.5 L5 20 L7.5 13 L2 9 L9 9 Z M12 7 L13.5 11 L17 11 L14.2 13.2 L15.4 16.6 L12 14.2 L8.6 16.6 L9.8 13.2 L7 11 L10.5 11 Z',
  Platinum:
    'M5 4 H19 V11 C19 16 15.5 19 12 20 C8.5 19 5 16 5 11 Z M9 10 L11 12 L15 8 M5 4 L12 7 L19 4',
};

const STYLES: Record<PassportLevel, { bg: string }> = {
  Bronze: { bg: 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-amber-50 shadow-md shadow-amber-500/40' },
  Silver: { bg: 'bg-gradient-to-r from-slate-400 via-slate-300 to-slate-500 text-slate-900 shadow-md shadow-slate-400/40' },
  Gold: { bg: 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-amber-950 shadow-md shadow-yellow-400/50' },
  Platinum: { bg: 'bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-500 text-white shadow-lg shadow-fuchsia-500/40' },
};

const SIZING = {
  sm: { pad: 'px-2 py-0.5 text-[10px]', icon: 'h-3 w-3', text: 'text-[10px]' },
  md: { pad: 'px-2.5 py-1 text-[11px]', icon: 'h-3.5 w-3.5', text: 'text-[11px]' },
  lg: { pad: 'px-3.5 py-1.5 text-sm', icon: 'h-5 w-5', text: 'text-sm' },
} as const;

export default LevelBadge;