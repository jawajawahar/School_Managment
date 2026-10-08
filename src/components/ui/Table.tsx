import React from 'react';
import { cn } from '../../lib/cn';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className, ...props }) => (
  <div className="w-full overflow-x-auto">
    <table className={cn('w-full text-sm border-collapse', className)} {...props} />
  </div>
);

export const THead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = (props) => <thead {...props} />;

export const TH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className, ...props }) => (
  <th
    className={cn(
      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted bg-surface-muted border-b border-border first:rounded-tl-xl last:rounded-tr-xl',
      className
    )}
    {...props}
  />
);

export const TBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = (props) => <tbody {...props} />;

export const TR: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className, ...props }) => (
  <tr className={cn('border-b border-border last:border-b-0 hover:bg-surface-muted/60 transition-colors duration-100', className)} {...props} />
);

export const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className, ...props }) => (
  <td className={cn('px-4 py-3 text-sm text-ink align-middle', className)} {...props} />
);
