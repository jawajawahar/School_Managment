import React from 'react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, compact = false, className }) => (
  <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-14', className)}>
    <div className={cn('rounded-2xl bg-surface-muted flex items-center justify-center text-ink-faint mb-3', compact ? 'w-10 h-10' : 'w-14 h-14')}>
      <Icon className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
    </div>
    <p className="font-display font-semibold text-[15px] text-ink">{title}</p>
    {description && <p className="text-sm text-ink-muted mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
