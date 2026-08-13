
import React, { useEffect, useState } from 'react';

interface AnimatedBarProps {
  value: number;
  label?: string;
  hint?: string;
  showValue?: boolean;
  className?: string;
}

export const AnimatedBar: React.FC<AnimatedBarProps> = ({
  value, label, hint, showValue = true, className = '',
}) => {
  const target = Math.max(0, Math.min(100, Math.round(value)));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    
    
    const t = window.setTimeout(() => setWidth(target), 30);
    return () => window.clearTimeout(t);
  }, [target]);

  const tone = target >= 85
    ? 'from-emerald-400 to-emerald-600'
    : target >= 60
      ? 'from-amber-400 to-orange-500'
      : target > 0
        ? 'from-rose-400 to-rose-600'
        : 'from-slate-300 to-slate-400';

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-[11px] font-bold">
          {label && <span className="text-slate-600">{label}</span>}
          {showValue && <span className="text-slate-700">{target}%</span>}
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone} transition-all duration-1000 ease-out`}
          style={{ width: `${width}%` }}
          role="progressbar"
          aria-valuenow={target}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
};

export default AnimatedBar;