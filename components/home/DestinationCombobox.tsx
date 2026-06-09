'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DestinationOption } from '@/lib/destinations';
import { Icon } from '../Icon';

// Diacritic-insensitive lowercase for substring matching.
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Props = {
  options: DestinationOption[];
  value: { country: string | null; city: string | null } | null;
  onSelect: (option: DestinationOption) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

function selectedLabel(options: DestinationOption[], value: Props['value']): string {
  if (!value?.country) return '';
  const match = options.find((o) =>
    value.city
      ? o.kind === 'city' && o.params.country === value.country && o.params.city === value.city
      : o.kind === 'country' && o.params.country === value.country,
  );
  return match?.label ?? '';
}

export function DestinationCombobox({ options, value, onSelect, loading, error, onRetry }: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // -1 = nothing highlighted yet; the first ArrowDown highlights index 0.
  const [active, setActive] = useState(-1);

  const q = norm(query.trim());
  const results = q ? options.filter((o) => norm(o.search).includes(q)) : options;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function choose(opt: DestinationOption | undefined) {
    if (!opt) return;
    onSelect(opt);
    setQuery('');
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open) choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const display = open ? query : query || selectedLabel(options, value);

  return (
    <div ref={wrapRef} className="relative w-full max-w-[560px]">
      <div className="bg-background flex items-center gap-2 rounded-lg border px-3">
        <Icon name="search" size={20} className="text-muted-foreground" />
        <Input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          disabled={loading}
          placeholder={loading ? 'Loading destinations…' : 'Search a city or country…'}
          value={display}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className="border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0"
        />
        <Icon
          name="chevron"
          size={20}
          className={`text-muted-foreground ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {error ? (
        <div className="text-destructive mt-1 flex items-center gap-2 text-sm">
          <span>Couldn’t load destinations.</span>
          <Button
            type="button"
            variant="link"
            onClick={onRetry}
            className="text-destructive h-auto p-0 font-medium underline"
          >
            Retry
          </Button>
        </div>
      ) : null}

      {open && !error ? (
        <div
          id={listId}
          role="listbox"
          className="bg-card absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border shadow-lg"
        >
          {results.length === 0 ? (
            <div className="text-muted-foreground px-3 py-3 text-sm">No destinations</div>
          ) : (
            results.map((o, i) => (
              <div
                key={o.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                className={`flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm ${
                  i === active ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
                } ${o.kind === 'country' ? 'font-medium' : ''}`}
              >
                <Icon
                  name={o.kind === 'country' ? 'search' : 'pin'}
                  size={16}
                  className="text-muted-foreground"
                />
                <span>{o.label}</span>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 tabular-nums">
                  {o.count}
                </span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
