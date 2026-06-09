import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateFieldProps {
  id: string;
  label: string;
  value: string | null;
  min?: string;
  onChange: (v: string | null) => void;
}

export function DateField({ id, label, value, min, onChange }: DateFieldProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value ?? ''}
        min={min}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : v);
        }}
      />
    </div>
  );
}
