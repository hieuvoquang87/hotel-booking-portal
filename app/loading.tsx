export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-5xl px-4 py-6">
      <span className="sr-only">Loading…</span>
      <div className="h-10 w-1/2 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
