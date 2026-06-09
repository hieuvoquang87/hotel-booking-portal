import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from './Icon';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  subtext?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, subtext, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon name={icon} size={26} />
      </span>
      <p className="text-lg font-semibold text-foreground">{title}</p>
      {subtext ? <p className="text-sm text-muted-foreground">{subtext}</p> : null}
      {actionLabel && onAction ? (
        <Button type="button" onClick={onAction} className="mt-2 px-4">
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
