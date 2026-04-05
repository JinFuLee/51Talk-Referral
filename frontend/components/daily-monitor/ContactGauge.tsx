'use client';

interface ContactGaugeProps {
  label: string;
  rate: number;
  color?: string;
}

function rateColor(rate: number): string {
  if (rate >= 0.6) return 'text-success-token';
  if (rate >= 0.4) return 'text-warning-token';
  return 'text-danger-token';
}

function barColor(rate: number): string {
  if (rate >= 0.6) return 'bg-success-token';
  if (rate >= 0.4) return 'bg-warning-token';
  return 'bg-danger-token';
}

export function ContactGauge({ label, rate }: ContactGaugeProps) {
  const pct = Math.round(rate * 100);

  return (
    <div className="bg-surface border border-default-token rounded-lg p-4 text-center">
      <p className="text-xs text-muted-token uppercase tracking-wider mb-2">{label}</p>
      <div className={`text-3xl font-bold font-mono tabular-nums ${rateColor(rate)}`}>{pct}%</div>
      <div className="mt-2 w-full bg-subtle rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor(rate)}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
