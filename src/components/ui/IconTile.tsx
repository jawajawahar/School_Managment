import React from 'react';
import { cn } from '../../lib/cn';
import type { BadgeTone } from './Badge';

interface IconTileProps {
  icon: React.ElementType;
  tone?: BadgeTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  brand: 'bg-brand-tint text-brand',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
  info: 'bg-info-tint text-info',
  accent: 'bg-accent-tint text-accent',
  neutral: 'bg-surface-muted text-ink-muted',
};

const sizeClasses = {
  sm: 'w-7 h-7 rounded-lg',
  md: 'w-9 h-9 rounded-xl',
  lg: 'w-11 h-11 rounded-xl',
};

const iconSizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/** The recurring "tinted icon-tile" signature used across stat cards, nav, and section headers. */
export const IconTile: React.FC<IconTileProps> = ({ icon: Icon, tone = 'brand', size = 'md', className }) => (
  <div
    className={cn(
      'flex items-center justify-center shrink-0',
      toneClasses[tone],
      sizeClasses[size],
      className
    )}
  >
    <Icon className={iconSizeClasses[size]} />
  </div>
);
