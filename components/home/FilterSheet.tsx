'use client';

import { useEffect } from 'react';
import { Icon } from '../Icon';
import { PriceRange } from './PriceRange';
import { SegmentedStars } from './SegmentedStars';

type Props = {
  open: boolean;
  stars: number | null;
  min: number | null;
  max: number | null;
  resultCount: number;
  onStars: (v: number | null) => void;
  onPrice: (min: number | null, max: number | null) => void;
  onReset: () => void;
  onClose: () => void;
};

export function FilterSheet({
  open,
  stars,
  min,
  max,
  resultCount,
  onStars,
  onPrice,
  onReset,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-lg motion-safe:animate-[slideUp_200ms_ease-out]"
      >
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          <button
            type="button"
            aria-label="Close filters"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <p className="pb-2 text-sm font-medium text-slate-900">Star rating</p>
            <SegmentedStars value={stars} onChange={onStars} />
          </div>
          <div>
            <p className="pb-2 text-sm font-medium text-slate-900">Price (USD)</p>
            <PriceRange min={min} max={max} onCommit={onPrice} />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
          >
            Show {resultCount}
          </button>
        </div>
      </div>
    </div>
  );
}
