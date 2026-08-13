import React from 'react';

export interface TabBarItem<T extends string> {
  key: T;
  label: string;
  labelBn: string;
  icon: React.ReactNode;
}

export const TabBar = <T extends string>(props: {
  items: TabBarItem<T>[];
  active: T;
  onChange: (next: T) => void;
  t: (en: string, bn: string) => string;
}) => {
  const { items, active, onChange, t } = props;
  return (
    <div className="relative z-10 mt-5 flex flex-wrap gap-2">
      {items.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
              isActive
                ? 'border-transparent bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white shadow'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className={isActive ? 'text-white' : 'text-slate-500'}>{tab.icon}</span>
            {t(tab.label, tab.labelBn)}
          </button>
        );
      })}
    </div>
  );
};

export default TabBar;