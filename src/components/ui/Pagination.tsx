import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemLabel?: string;
}

/** Shared page-number control — replaces the hand-rolled version duplicated across modules. */
export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange, totalItems, itemLabel = 'items' }) => {
  if (totalPages <= 1) return null;

  const pagesToShow = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border text-sm text-ink-muted">
      {typeof totalItems === 'number' && (
        <span>Page <strong className="text-ink">{page}</strong> of <strong className="text-ink">{totalPages}</strong> ({totalItems} {itemLabel})</span>
      )}
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        {pagesToShow.map((p, idx, arr) => (
          <React.Fragment key={p}>
            {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-ink-faint">...</span>}
            <button
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${page === p ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'}`}
            >
              {p}
            </button>
          </React.Fragment>
        ))}
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
