export function HotelCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div data-testid="sk-photo" className="aspect-video animate-pulse bg-slate-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-7/12 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-5/12 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-6/12 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-4/12 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
