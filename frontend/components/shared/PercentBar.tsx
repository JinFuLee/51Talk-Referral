import { cn } from "@/lib/utils";

interface PercentBarProps {
  value: number;
  max?: number;
  className?: string;
  colorClass?: string;
}

export function PercentBar({ value, max = 100, className, colorClass = "bg-brand-500" }: PercentBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("w-full bg-[var(--n-200)] rounded-full h-2", className)}>
      <div
        className={cn("h-2 rounded-full transition-all duration-200", colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
