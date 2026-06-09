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
    <Card
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Icon name={icon} size={26} />
      </span>
      <p className="text-foreground text-lg font-semibold">{title}</p>
      {subtext ? <p className="text-muted-foreground text-sm">{subtext}</p> : null}
      {actionLabel && onAction ? (
        <Button type="button" onClick={onAction} className="mt-2 px-4">
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
