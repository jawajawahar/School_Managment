import React from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'accent' | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
  info: 'bg-info-tint text-info',
  brand: 'bg-brand-tint text-brand',
  accent: 'bg-accent-tint text-accent',
  neutral: 'bg-surface-muted text-ink-muted',
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', className, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold font-mono-data whitespace-nowrap',
      toneClasses[tone],
      className
    )}
    {...props}
  />
);

export const StatusDot: React.FC<{ tone?: BadgeTone; className?: string }> = ({ tone = 'neutral', className }) => {
  const dotColor: Record<BadgeTone, string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
    brand: 'bg-brand',
    accent: 'bg-accent',
    neutral: 'bg-ink-faint',
  };
  return <span className={cn('w-1.5 h-1.5 rounded-full inline-block', dotColor[tone], className)} />;
};
