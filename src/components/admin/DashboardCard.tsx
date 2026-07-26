/**
 * DashboardCard — small metric card used by the Admin Dashboard.
 * Accepts an icon, label, value, color, and an optional subLabel (e.g. "+5 today").
 */
import React from 'react';

export interface DashboardCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string;
  color?: string; // tailwind bg color
  subLabel?: string;
  href?: string;
}

export function DashboardCard({ icon: Icon, label, value, color = 'bg-gray-500', subLabel, href }: DashboardCardProps) {
  const inner = (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subLabel && <p className="mt-1 text-xs text-gray-400">{subLabel}</p>}
        </div>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
  if (href) {
    return <a href={href} className="block">{inner}</a>;
  }
  return inner;
}

export default DashboardCard;