import type { Hotel } from '@/types/domain';

type PoliciesListProps = {
  policies: Hotel['policies'];
};

export function PoliciesList({ policies }: PoliciesListProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Check-in', value: policies.checkInTime },
    { label: 'Check-out', value: policies.checkOutTime },
    { label: 'Cancellation', value: policies.cancellation },
  ];

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Policies</h2>
      <dl className="divide-y divide-border rounded-lg border">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between px-4 py-3 text-sm">
            <dt className="font-medium text-muted-foreground">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
