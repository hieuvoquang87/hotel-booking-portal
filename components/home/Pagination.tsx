import { Button } from '@/components/ui/button';
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

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3 py-6">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="min-w-11"
      >
        <Icon name="chevron" size={18} className="rotate-90" />
      </Button>
      <span className="text-sm tabular-nums text-slate-600">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="min-w-11"
      >
        <Icon name="chevron" size={18} className="-rotate-90" />
      </Button>
    </nav>
  );
}
