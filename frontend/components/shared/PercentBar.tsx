import { cn } from "@/lib/utils";

interface PercentBarProps {
  value: number;
  max?: number;
  className?: string;
  colorClass?: string;
}

export function PercentBar({ value, max = 100, className, colorClass = "bg-blue-500" }: PercentBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("w-full bg-slate-100 rounded-full h-2", className)}>
      <div
        className={cn("h-2 rounded-full transition-all duration-500", colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
