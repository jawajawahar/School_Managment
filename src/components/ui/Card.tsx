import React from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padded = true, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-surface border border-border rounded-2xl shadow-xs',
        padded && 'p-5 sm:p-6',
        interactive && 'transition-all duration-150 hover:shadow-sm hover:border-border-strong cursor-pointer',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-border', className)} {...props} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn('font-display font-semibold text-[17px] text-ink', className)} {...props} />
);
