import { Icon } from '../Icon';

const ITEMS = [
  { icon: 'star' as const, label: 'Real guest ratings' },
  { icon: 'sliders' as const, label: 'Filter by price & stars' },
  { icon: 'building' as const, label: '40+ properties' },
];

export function TrustStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
      {ITEMS.map(({ icon, label }, i) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <Icon name={icon} size={14} className="text-slate-400" aria-hidden />
          <span>{label}</span>
          {i < ITEMS.length - 1 ? (
            <span className="mx-1 text-slate-300 select-none" aria-hidden>
              ·
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
