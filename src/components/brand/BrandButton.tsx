

import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface BrandButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  
  fullWidth?: boolean;
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5 rounded-brand',
  md: 'h-11 px-4 text-sm gap-2 rounded-brand',
  lg: 'h-12 px-5 text-base gap-2.5 rounded-brand-lg',
};

const variantClasses: Record<Variant, string> = {
  primary:
    'text-white shadow-brand-sm hover:shadow-brand-md ' +
    'bg-[linear-gradient(135deg,#E31B23_0%,#F97316_55%,#FF8A00_100%)] ' +
    'hover:brightness-[1.05] active:brightness-95 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-white text-[var(--brand-dark)] border border-[var(--brand-border)] ' +
    'hover:bg-[var(--brand-background)] hover:border-[var(--brand-orange)] ' +
    'active:bg-[var(--brand-orange-soft)] disabled:opacity-50 disabled:cursor-not-allowed',
  success:
    'bg-[var(--brand-success)] text-white shadow-brand-sm hover:brightness-110 ' +
    'active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-[var(--brand-danger)] text-white shadow-brand-sm hover:brightness-110 ' +
    'active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-[var(--brand-primary)] hover:bg-[var(--brand-orange-soft)] ' +
    'active:bg-[var(--brand-orange-soft)] disabled:opacity-50 disabled:cursor-not-allowed',
};

export const BrandButton: React.FC<BrandButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center font-bold transition-all select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)] focus-visible:ring-offset-2',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      <span className={loading ? 'sr-only' : ''}>{children}</span>
      {!loading && rightIcon}
    </button>
  );
};

export default BrandButton;