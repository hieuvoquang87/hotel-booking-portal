import { Icon } from '../Icon';

export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const btn =
    'flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3 py-6">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className={btn}
      >
        <Icon name="chevron" size={18} className="rotate-90" />
      </button>
      <span className="text-sm tabular-nums text-slate-600">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className={btn}
      >
        <Icon name="chevron" size={18} className="-rotate-90" />
      </button>
    </nav>
  );
}
