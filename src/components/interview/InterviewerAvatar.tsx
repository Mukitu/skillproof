
import React, { useId } from 'react';

export type AvatarVariant = 'male' | 'female';
export type AvatarMood = 'idle' | 'speaking' | 'listening' | 'thinking';

export interface InterviewerAvatarProps {
  variant?: AvatarVariant;
  mood?: AvatarMood;
  className?: string;
}

const InterviewerAvatar: React.FC<InterviewerAvatarProps> = ({
  variant = 'female',
  mood = 'idle',
  className,
}) => {
  const id = useId().replace(/:/g, '');

  
  
  const palette = variant === 'female'
    ? {
        skin: '#F1C7A6',
        skinShadow: '#D9A57E',
        hair: '#1F1B16',
        hairShine: '#3A302A',
        suit: '#1E3A8A',
        suitShadow: '#172554',
        blouse: '#F8FAFC',
        accent: '#E31B23',
        lip: '#C9265F',
        cheek: 'rgba(237, 28, 36, 0.10)',
      }
    : {
        skin: '#E8B894',
        skinShadow: '#C9916A',
        hair: '#241A12',
        hairShine: '#3F2E20',
        suit: '#0F172A',
        suitShadow: '#020617',
        shirt: '#FFFFFF',
        tie: '#E31B23',
        accent: '#F97316',
        lip: '#9B3F45',
        cheek: 'rgba(245, 130, 32, 0.10)',
      };

  const isSpeaking = mood === 'speaking';
  const isListening = mood === 'listening';
  const isThinking = mood === 'thinking';

  const ringClass = isSpeaking
    ? 'animate-avatar-speak-ring'
    : isListening
      ? 'animate-avatar-listen-ring'
      : '';

  return (
    <div className={`relative flex items-center justify-center ${className ?? ''}`}>
      {}
      <div
        className={`absolute inset-0 rounded-full ${ringClass}`}
        aria-hidden
      />

      {}
      <div className="animate-avatar-idle">
        <div className="animate-avatar-head">
          <svg
            viewBox="0 0 240 260"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full drop-shadow-2xl"
            role="img"
            aria-label={`SkillProof AI interviewer (${variant})`}
          >
            <defs>
              <radialGradient id={`bg-${id}`} cx="50%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.6" />
              </radialGradient>
              <linearGradient id={`suit-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.suit} />
                <stop offset="100%" stopColor={palette.suitShadow} />
              </linearGradient>
              <linearGradient id={`skin-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.skin} />
                <stop offset="100%" stopColor={palette.skinShadow} />
              </linearGradient>
              <linearGradient id={`hair-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.hairShine} />
                <stop offset="100%" stopColor={palette.hair} />
              </linearGradient>
            </defs>

            {}
            <circle cx="120" cy="120" r="115" fill={`url(#bg-${id})`} />

            {}
            <path
              d="M10 260 C 30 190, 70 170, 120 170 C 170 170, 210 190, 230 260 Z"
              fill={`url(#suit-${id})`}
            />
            {}
            {variant === 'female' ? (
              <>
                <path
                  d="M95 175 L120 200 L145 175 L135 215 L105 215 Z"
                  fill={palette.blouse}
                />
                <path
                  d="M115 200 L120 210 L125 200 L122 260 L118 260 Z"
                  fill={palette.accent}
                />
              </>
            ) : (
              <>
                <path
                  d="M100 170 L120 195 L140 170 L132 225 L108 225 Z"
                  fill={palette.shirt}
                />
                {}
                <path
                  d="M115 195 L120 205 L125 195 L130 230 L120 245 L110 230 Z"
                  fill={palette.tie}
                />
              </>
            )}

            {}
            <rect
              x="108"
              y="148"
              width="24"
              height="32"
              rx="10"
              fill={`url(#skin-${id})`}
            />

            {}
            <ellipse
              cx="120"
              cy="100"
              rx="58"
              ry="68"
              fill={`url(#skin-${id})`}
            />

            {}
            {variant === 'female' ? (
              <>
                <path
                  d="M62 100 C 58 50, 90 28, 120 28 C 152 28, 184 52, 180 102
                     C 180 88, 168 70, 152 64
                     C 144 76, 130 82, 120 80
                     C 110 82, 96 76, 88 64
                     C 72 70, 62 88, 62 100 Z"
                  fill={`url(#hair-${id})`}
                />
                {}
                <path
                  d="M80 60 C 100 45, 140 45, 160 60 C 140 55, 100 55, 80 60 Z"
                  fill={palette.hairShine}
                  opacity="0.6"
                />
              </>
            ) : (
              <>
                <path
                  d="M68 95 C 66 60, 96 38, 122 38 C 150 38, 178 60, 174 96
                     C 170 84, 158 76, 144 74
                     C 134 78, 124 80, 114 78
                     C 102 76, 88 78, 78 86
                     C 72 88, 68 92, 68 95 Z"
                  fill={`url(#hair-${id})`}
                />
              </>
            )}

            {}
            <ellipse cx="62" cy="108" rx="6" ry="10" fill={palette.skinShadow} />
            <ellipse cx="178" cy="108" rx="6" ry="10" fill={palette.skinShadow} />

            {}
            <rect
              x="84"
              y="88"
              width="24"
              height="5"
              rx="2.5"
              fill={palette.hair}
            />
            <rect
              x="132"
              y="88"
              width="24"
              height="5"
              rx="2.5"
              fill={palette.hair}
            />

            {}
            <g className={isSpeaking || isListening ? 'animate-avatar-blink' : 'animate-avatar-blink'}>
              {}
              <ellipse cx="96" cy="105" rx="6" ry="7" fill="#FFFFFF" />
              <circle cx="97" cy="106" r="3.4" fill="#0F172A" />
              <circle cx="98" cy="104.5" r="1" fill="#FFFFFF" />
              {}
              <ellipse cx="144" cy="105" rx="6" ry="7" fill="#FFFFFF" />
              <circle cx="145" cy="106" r="3.4" fill="#0F172A" />
              <circle cx="146" cy="104.5" r="1" fill="#FFFFFF" />
            </g>

            {}
            <circle cx="78" cy="124" r="10" fill={palette.cheek} />
            <circle cx="162" cy="124" r="10" fill={palette.cheek} />

            {}
            <path
              d="M120 110 L116 130 L124 130 Z"
              fill={palette.skinShadow}
              opacity="0.7"
            />

            {}
            {isSpeaking ? (
              <g>
                <rect
                  x="106"
                  y="146"
                  width="28"
                  height="6"
                  rx="3"
                  fill={palette.lip}
                  className="animate-avatar-lip-a"
                  style={{ transformOrigin: '120px 149px' }}
                />
                <rect
                  x="112"
                  y="153"
                  width="16"
                  height="4"
                  rx="2"
                  fill={palette.skinShadow}
                  className="animate-avatar-lip-b"
                  style={{ transformOrigin: '120px 155px' }}
                />
              </g>
            ) : isListening ? (
              <path
                d="M104 150 Q 120 156 136 150"
                stroke={palette.lip}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            ) : isThinking ? (
              <path
                d="M108 150 Q 120 148 132 150"
                stroke={palette.lip}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M104 150 Q 120 158 136 150"
                stroke={palette.lip}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            )}

            {}
            <circle cx="148" cy="232" r="4" fill={palette.accent} />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default InterviewerAvatar;
