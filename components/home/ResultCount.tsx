export function ResultCount({ loading, total }: { loading: boolean; total: number }) {
  const label = loading
    ? 'Loading hotels…'
    : total === 0
      ? 'No hotels'
      : `${total.toLocaleString('en-US')} ${total === 1 ? 'hotel' : 'hotels'}`;
  return (
    <p aria-live="polite" className="text-sm text-slate-600">
      {label}
    </p>
  );
}
