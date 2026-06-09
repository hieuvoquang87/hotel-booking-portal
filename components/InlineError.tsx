import { Button } from '@/components/ui/button';
import { Icon } from '@/components/Icon';

type InlineErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive"
    >
      <Icon name="x" size={16} className="shrink-0" />
      <span className="flex-1 text-sm">{message}</span>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
