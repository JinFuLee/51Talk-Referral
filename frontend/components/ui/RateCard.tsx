'use client';

import React from 'react';

interface RateCardProps {
  label: string;
  rate: number; // 0~1
  sub?: string;
  target?: number; // 0~1
}

function RateCardBase({ label, rate, sub, target }: RateCardProps) {
  const pct = Math.round(rate * 100);
  const targetPct = target !== undefined ? Math.round(target * 100) : undefined;
  const status =
    targetPct === undefined
      ? 'slate'
      : pct >= targetPct
        ? 'green'
        : pct >= targetPct * 0.85
          ? 'yellow'
          : 'red';

  const textColor =
    status === 'green'
      ? 'text-success'
      : status === 'yellow'
        ? 'text-warning'
        : status === 'red'
          ? 'text-destructive'
          : 'text-[var(--text-primary)]';

  const barColor =
    status === 'green'
      ? 'bg-success'
      : status === 'yellow'
        ? 'bg-warning'
        : status === 'red'
          ? 'bg-destructive'
          : 'bg-primary';

  return (
    <div className="card-interactive p-4">
      <p className="text-xs text-[var(--text-secondary)] mb-2">{label}</p>
      <p className={`text-3xl font-bold ${textColor}`}>{pct}%</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
      {targetPct !== undefined && (
        <>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${barColor}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">目标 {targetPct}%</p>
        </>
      )}
    </div>
  );
}

export const RateCard = React.memo(RateCardBase);
