import React from 'react';
import { cn } from '../../lib/cn';

export interface TabOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ElementType;
  count?: number;
}

interface TabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

/** Generic segmented-control tab switcher, replaces bespoke pill-tab markup in each module. */
export function Tabs<T extends string>({ options, value, onChange, className }: TabsProps<T>) {
  return (
    <div className={cn('inline-flex items-center gap-1 p-1 bg-surface-muted border border-border rounded-xl', className)}>
      {options.map((opt) => {
        const isActive = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
              isActive ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {opt.label}
            {typeof opt.count === 'number' && (
              <span
                className={cn(
                  'text-[10px] font-mono-data px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-brand-tint text-brand' : 'bg-surface text-ink-faint'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
