

import React from 'react';

type Elevation = 'flat' | 'raised' | 'floating';

export interface BrandCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation;
  
  interactive?: boolean;
  
  noPadding?: boolean;
  
  accent?: boolean;
}

const elevationClasses: Record<Elevation, string> = {
  flat: 'shadow-brand-sm',
  raised: 'shadow-brand',
  floating: 'shadow-brand-lg',
};

export const BrandCard: React.FC<BrandCardProps> = ({
  elevation = 'raised',
  interactive = false,
  noPadding = false,
  accent = false,
  className = '',
  children,
  ...rest
}) => {
  return (
    <div
      {...rest}
      className={[
        'relative bg-white border border-[var(--brand-border)] rounded-brand-lg overflow-hidden',
        elevationClasses[elevation],
        interactive
          ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand-md cursor-pointer'
          : '',
        className,
      ].join(' ')}
    >
      {accent && (
        <div
          aria-hidden="true"
          className="h-1 w-full"
          style={{
            background:
              'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        />
      )}
      <div className={noPadding ? '' : 'p-5 sm:p-6'}>{children}</div>
    </div>
  );
};

export default BrandCard;