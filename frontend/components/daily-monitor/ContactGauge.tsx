'use client';

interface ContactGaugeProps {
  label: string;
  rate: number;
  color?: string;
}

function rateColor(rate: number): string {
  if (rate >= 0.6) return 'text-emerald-800';
  if (rate >= 0.4) return 'text-amber-800';
  return 'text-[var(--color-danger)]';
}

function barColor(rate: number): string {
  if (rate >= 0.6) return 'bg-green-500';
  if (rate >= 0.4) return 'bg-yellow-400';
  return 'bg-red-400';
}

export function ContactGauge({ label, rate }: ContactGaugeProps) {
  const pct = Math.round(rate * 100);

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4 text-center">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">{label}</p>
      <div className={`text-3xl font-bold font-mono tabular-nums ${rateColor(rate)}`}>{pct}%</div>
      <div className="mt-2 w-full bg-[var(--bg-subtle)] rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor(rate)}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
