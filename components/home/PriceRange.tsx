'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

const toNum = (s: string): number | null => {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export function PriceRange({
  min,
  max,
  onCommit,
}: {
  min: number | null;
  max: number | null;
  onCommit: (min: number | null, max: number | null) => void;
}) {
  const [minStr, setMinStr] = useState(min?.toString() ?? '');
  const [maxStr, setMaxStr] = useState(max?.toString() ?? '');

  // Resync local inputs when the URL (props) changes externally (e.g. Reset) by
  // adjusting state during render — the prop is the source of truth, not an effect.
  const [prev, setPrev] = useState({ min, max });
  if (prev.min !== min || prev.max !== max) {
    setPrev({ min, max });
    setMinStr(min?.toString() ?? '');
    setMaxStr(max?.toString() ?? '');
  }

  const commit = () => {
    let lo = toNum(minStr);
    let hi = toNum(maxStr);
    if (lo !== null && hi !== null && lo > hi) [lo, hi] = [hi, lo];
    onCommit(lo, hi);
  };

  return (
    <div role="group" aria-label="Price range in US dollars" className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2">
        <span className="text-sm text-slate-400">$</span>
        <Input
          aria-label="Minimum price"
          inputMode="numeric"
          value={minStr}
          placeholder="min"
          onChange={(e) => setMinStr(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-16 border-0 bg-transparent px-0 py-0 shadow-none tabular-nums focus-visible:border-transparent focus-visible:ring-0"
        />
      </div>
      <span className="text-slate-400">–</span>
      <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2">
        <span className="text-sm text-slate-400">$</span>
        <Input
          aria-label="Maximum price"
          inputMode="numeric"
          value={maxStr}
          placeholder="max"
          onChange={(e) => setMaxStr(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-16 border-0 bg-transparent px-0 py-0 shadow-none tabular-nums focus-visible:border-transparent focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
