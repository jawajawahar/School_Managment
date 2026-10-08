import React from 'react';
import { cn } from '../../lib/cn';
import { IconTile } from './IconTile';
import type { BadgeTone } from './Badge';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: BadgeTone;
  footnote?: React.ReactNode;
  trend?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/** Single implementation for the KPI tile used across every module dashboard. */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  tone = 'brand',
  footnote,
  trend,
  onClick,
  className,
}) => {
  const interactive = Boolean(onClick);

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'bg-surface border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3 group',
        interactive && 'cursor-pointer transition-all duration-150 hover:shadow-sm hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{label}</span>
        <IconTile icon={icon} tone={tone} />
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-mono-data text-3xl font-semibold text-ink tracking-tight">{value}</span>
        {trend}
      </div>

      {footnote && (
        <div className="text-[13px] text-ink-muted border-t border-border pt-3 flex items-center justify-between">
          {footnote}
          {interactive && (
            <span className="text-brand font-semibold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          )}
        </div>
      )}
    </div>
  );
};
