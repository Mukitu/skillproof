interface PassportSealProps {
  size?: number;
  
  variant?: 'full' | 'compact';
  className?: string;
  
  animated?: boolean;
}


export function PassportSeal({ size = 96, variant = 'full', className = '', animated = false }: PassportSealProps) {
  return (
    <div className={`inline-flex items-center justify-center ${animated ? 'animate-[subtlepulse_3s_ease-in-out_infinite]' : ''} ${className}`}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label="SkillProof Official Seal"
        className="drop-shadow-[0_4px_12px_rgba(220,38,38,0.35)]"
      >
        <defs>
          <radialGradient id="seal-bg" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="55%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </radialGradient>
          <linearGradient id="seal-ring" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="seal-ribbon" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
        </defs>

        {}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          return (
            <circle
              key={i}
              cx="100"
              cy="38"
              r="6"
              fill="url(#seal-ring)"
              transform={`rotate(${angle} 100 100)`}
            />
          );
        })}

        {}
        <circle cx="100" cy="100" r="60" fill="url(#seal-bg)" stroke="url(#seal-ring)" strokeWidth="3" />
        <circle cx="100" cy="100" r="50" fill="none" stroke="#fef3c7" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />

        {}
        <text x="100" y="105" textAnchor="middle" fontSize="36" fontWeight="800" fill="#fff8e1" fontFamily="ui-serif, Georgia, serif">SP</text>
        <text x="100" y="128" textAnchor="middle" fontSize="9" fontWeight="600" fill="#fef3c7" letterSpacing="2">SKILLPROOF</text>

        {variant === 'full' && (
          <>
            {}
            <path d="M70 150 L100 135 L130 150 L120 185 L100 170 L80 185 Z" fill="url(#seal-ribbon)" stroke="#7f1d1d" strokeWidth="1" />
            <text x="100" y="165" textAnchor="middle" fontSize="9" fontWeight="700" fill="#7f1d1d" letterSpacing="1.5">OFFICIAL</text>
          </>
        )}
      </svg>
    </div>
  );
}

export default PassportSeal;