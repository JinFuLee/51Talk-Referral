import { cn } from '@/lib/utils';

interface PercentBarProps {
  value: number;
  max?: number;
  className?: string;
  colorClass?: string;
}

export function PercentBar({
  value,
  max = 100,
  className,
  colorClass = 'bg-action-active',
}: PercentBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('w-full bg-n-200 rounded-full h-1.5', className)}>
      <div
        className={cn('h-1.5 rounded-full transition-all duration-200', colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
