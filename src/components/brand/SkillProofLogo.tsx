

import React from 'react';

type Variant = 'full' | 'icon' | 'auto';
type ColorMode = 'light' | 'dark';

export interface SkillProofLogoProps {
  variant?: Variant;
  colorMode?: ColorMode;
  size?: number;
  className?: string;
  
  title?: string;
  
  hideWordmark?: boolean;
}

export const SkillProofLogo: React.FC<SkillProofLogoProps> = ({
  variant = 'full',
  colorMode = 'light',
  size = 36,
  className = '',
  title = 'SkillProof',
  hideWordmark = false,
}) => {
  const dark = colorMode === 'dark';
  const showWordmark =
    !hideWordmark &&
    (variant === 'full' || (variant === 'auto' && size >= 28));

  
  const wordFontPx = Math.max(12, Math.round(size * 0.58));

  return (
    <span
      className={`inline-flex items-center gap-2 sm:gap-2.5 align-middle ${className}`}
      role="img"
      aria-label={title}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={`sp-mark-${dark ? 'dark' : 'light'}`}
            x1="6"
            y1="6"
            x2="58"
            y2="58"
            gradientUnits="userSpaceOnUse"
          >
            {dark ? (
              <>
                <stop offset="0" stopColor="#FF3B47" />
                <stop offset="0.55" stopColor="#F97316" />
                <stop offset="1" stopColor="#FF8A00" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor="#E31B23" />
                <stop offset="0.55" stopColor="#F97316" />
                <stop offset="1" stopColor="#FF8A00" />
              </>
            )}
          </linearGradient>
        </defs>

        {}
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="14"
          fill={`url(#sp-mark-${dark ? 'dark' : 'light'})`}
        />

        {}
        <g transform="translate(40 16)">
          <rect
            x="0"
            y="6"
            width="14"
            height="2.5"
            rx="1.25"
            fill={dark ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.88)'}
          />
          <rect
            x="6"
            y="0"
            width="2.5"
            height="14"
            rx="1.25"
            fill={dark ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.88)'}
          />
        </g>

        {}
        <path
          d="M18 36 L28 44 L46 26"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showWordmark && (
        <span
          className="font-black tracking-tight leading-none whitespace-nowrap"
          style={{ fontSize: `${wordFontPx}px` }}
        >
          <span
            style={{
              color: dark ? '#ffffff' : 'var(--brand-dark)',
            }}
          >
            Skill
          </span>
          <span
            style={{
              background: dark
                ? 'linear-gradient(90deg, #FFE9D6 0%, #FFFFFF 55%, #FFF1E0 100%)'
                : 'linear-gradient(90deg, #E31B23 0%, #F97316 55%, #FF8A00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Proof
          </span>
        </span>
      )}
    </span>
  );
};

export default SkillProofLogo;
