import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}

/** Standard top-of-page block: title + description + primary actions, used by every module. */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, eyebrow }) => (
  <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 overflow-hidden">
    <div className="min-w-0 flex-1">
      {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
      <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink leading-tight">{title}</h1>
      {description && <p className="text-sm text-ink-muted mt-1.5 max-w-4xl leading-relaxed">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 2xl:justify-end min-w-0 max-w-full">{actions}</div>}
  </div>
);
