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

  // vs 目标差值
  const vsDiff =
    targetPct !== undefined && pct !== null ? ((pct - targetPct) / targetPct) * 100 : null;
  const vsIsPositive = vsDiff !== null && vsDiff >= 0;
  const vsColor =
    vsDiff === null
      ? 'var(--text-muted)'
      : vsIsPositive
        ? 'var(--color-success)'
        : 'var(--color-danger)';

  return (
    <div className="card-interactive p-4">
      <p className="text-xs text-[var(--text-secondary)] mb-2">{label}</p>
      <div className="flex items-baseline">
        <p className={`text-3xl font-bold ${textColor}`}>{pct}%</p>
        {vsDiff !== null && (
          <span className="text-xs font-medium ml-2" style={{ color: vsColor }}>
            {vsIsPositive ? '↑' : '↓'}
            {Math.abs(vsDiff).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
      {targetPct !== undefined && (
        <>
          <div className="mt-3 h-1 rounded-full bg-[var(--n-200)]">
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(pct ?? 0, 100)}%`,
                backgroundColor:
                  status === 'green'
                    ? 'var(--color-success)'
                    : status === 'yellow'
                      ? 'var(--color-warning)'
                      : status === 'red'
                        ? 'var(--color-danger)'
                        : 'var(--color-primary)',
              }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">目标 {targetPct}%</p>
        </>
      )}
    </div>
  );
}

export const RateCard = React.memo(RateCardBase);
