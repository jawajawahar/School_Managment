import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
};

/** Generic dialog shell — replaces the repeated fixed/backdrop/portal markup across modules. */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, eyebrow, size = 'md', children, footer }) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6 overflow-hidden print:static print:bg-transparent print:p-0 print:m-0 print:overflow-visible print:block"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'bg-surface border border-border rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col my-auto animate-scale-in overflow-hidden relative z-10 print:static print:bg-transparent print:border-none print:shadow-none print:max-h-none print:overflow-visible print:w-full print:block',
          sizeClasses[size]
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border bg-surface shrink-0 z-20 print:hidden">
          <div>
            {eyebrow && <div className="text-xs font-mono-data font-semibold uppercase tracking-wide text-brand mb-1">{eyebrow}</div>}
            <h3 className="font-display font-semibold text-xl text-ink leading-snug">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-muted transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4 text-sm overflow-y-auto flex-1 print:overflow-visible print:max-h-none print:p-0 print:m-0 print:block">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-border bg-surface shrink-0 z-20 print:hidden">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
