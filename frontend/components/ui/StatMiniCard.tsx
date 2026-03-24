'use client';

import React from 'react';

interface StatMiniCardProps {
  label: string;
  value: string | number;
  sub?: string;
  subtitle?: string; // L1 渐进式披露副标题（指标定义说明）
  accent?: 'blue' | 'green' | 'yellow' | 'red' | 'slate';
}

const accentColor: Record<string, string> = {
  blue: 'text-primary',
  green: 'text-success',
  yellow: 'text-warning',
  red: 'text-destructive',
  slate: 'text-[var(--text-primary)]',
};

function StatMiniCardBase({ label, value, sub, subtitle, accent = 'slate' }: StatMiniCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[var(--bg-surface)] px-4 py-3">
      <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
      <p className={`text-xl font-bold ${accentColor[accent]}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
      {subtitle && (
        <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

export const StatMiniCard = React.memo(StatMiniCardBase);
