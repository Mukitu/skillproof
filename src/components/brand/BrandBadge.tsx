

import React from 'react';
import {
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  Info,
  CircleDot,
  ShieldCheck,
  Award,
  AlertTriangle,
} from 'lucide-react';

export type BrandBadgeVariant =
  | 'verified'
  | 'pending'
  | 'review'
  | 'failed'
  | 'info'
  | 'neutral'
  | 'certified'
  | 'warning'
  | 'passport';

type Size = 'sm' | 'md';

export interface BrandBadgeProps {
  variant?: BrandBadgeVariant;
  size?: Size;
  icon?: React.ReactNode;
  
  label?: string;
  
  children?: React.ReactNode;
  
  filled?: boolean;
  className?: string;
}

interface VariantConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  filledClass: string;
  outlinedClass: string;
}

const variants: Record<BrandBadgeVariant, VariantConfig> = {
  verified: {
    label: 'Verified',
    icon: CheckCircle2,
    filledClass:
      'bg-[var(--brand-success-soft)] text-[var(--brand-success)] border border-[var(--brand-success)]/20',
    outlinedClass:
      'bg-white text-[var(--brand-success)] border border-[var(--brand-success)]/30',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    filledClass:
      'bg-[var(--brand-warning-soft)] text-[#92400E] border border-[var(--brand-warning)]/25',
    outlinedClass:
      'bg-white text-[#92400E] border border-[var(--brand-warning)]/35',
  },
  review: {
    label: 'Under Review',
    icon: Eye,
    filledClass:
      'bg-[var(--brand-info-soft)] text-[var(--brand-info)] border border-[var(--brand-info)]/20',
    outlinedClass:
      'bg-white text-[var(--brand-info)] border border-[var(--brand-info)]/30',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    filledClass:
      'bg-[var(--brand-danger-soft)] text-[var(--brand-danger)] border border-[var(--brand-danger)]/20',
    outlinedClass:
      'bg-white text-[var(--brand-danger)] border border-[var(--brand-danger)]/30',
  },
  info: {
    label: 'Info',
    icon: Info,
    filledClass:
      'bg-[var(--brand-info-soft)] text-[var(--brand-info)] border border-[var(--brand-info)]/20',
    outlinedClass:
      'bg-white text-[var(--brand-info)] border border-[var(--brand-info)]/30',
  },
  neutral: {
    label: 'Neutral',
    icon: CircleDot,
    filledClass:
      'bg-slate-100 text-slate-600 border border-slate-200',
    outlinedClass:
      'bg-white text-slate-600 border border-slate-300',
  },
  certified: {
    label: 'Certified',
    icon: Award,
    filledClass:
      'text-white border border-transparent shadow-brand-sm ' +
      'bg-[linear-gradient(135deg,#E31B23_0%,#F97316_55%,#FF8A00_100%)]',
    outlinedClass:
      'bg-white text-[var(--brand-primary)] border border-[var(--brand-orange)]/50',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    filledClass:
      'bg-[var(--brand-warning-soft)] text-[#92400E] border border-[var(--brand-warning)]/25',
    outlinedClass:
      'bg-white text-[#92400E] border border-[var(--brand-warning)]/35',
  },
  passport: {
    label: 'Skill Passport',
    icon: ShieldCheck,
    filledClass:
      'text-white border border-transparent shadow-brand-sm ' +
      'bg-[linear-gradient(135deg,#E31B23_0%,#F97316_55%,#FF8A00_100%)]',
    outlinedClass:
      'bg-white text-[var(--brand-primary)] border border-[var(--brand-orange)]/50',
  },
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
};

const iconSize: Record<Size, string> = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
};

export const BrandBadge: React.FC<BrandBadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  icon,
  label,
  children,
  filled = true,
  className = '',
}) => {
  const cfg = variants[variant];
  const Icon = cfg.icon;
  const content = children ?? label ?? cfg.label;
  return (
    <span
      className={[
        'inline-flex items-center font-bold rounded-full whitespace-nowrap',
        sizeClasses[size],
        filled ? cfg.filledClass : cfg.outlinedClass,
        className,
      ].join(' ')}
    >
      {icon ?? <Icon className={iconSize[size]} aria-hidden="true" />}
      <span>{content}</span>
    </span>
  );
};

export default BrandBadge;