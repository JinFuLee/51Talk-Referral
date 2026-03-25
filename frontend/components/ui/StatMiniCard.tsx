'use client';

import React from 'react';

interface StatMiniCardProps {
  label: string;
  value: string | number;
  sub?: string;
  subtitle?: string; // L1 渐进式披露副标题（指标定义说明）
  accent?: 'blue' | 'green' | 'yellow' | 'red' | 'slate';
  /** 目标值（数值型，与 value 同量纲）。传入后显示进度条 + vs 目标标签 */
  target?: number;
  /** 实际数值（用于进度条计算，优先取此值，无则从 value 转换） */
  actual?: number;
}

const accentColor: Record<string, string> = {
  blue: 'text-primary',
  green: 'text-success',
  yellow: 'text-warning',
  red: 'text-destructive',
  slate: 'text-[var(--text-primary)]',
};

function ProgressBar({ ratio }: { ratio: number }) {
  const pct = Math.min(ratio * 100, 100);
  const barColor =
    ratio >= 1
      ? 'var(--color-success)'
      : ratio >= 0.8
        ? 'var(--color-warning)'
        : 'var(--color-danger)';

  return (
    <div className="mt-2 h-1 rounded-full bg-[var(--n-200)]">
      <div
        className="h-1 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: barColor }}
      />
    </div>
  );
}

function VsTargetBadge({ ratio }: { ratio: number }) {
  const diff = (ratio - 1) * 100;
  const isPositive = diff >= 0;
  const color = isPositive ? 'var(--color-success)' : 'var(--color-danger)';
  const arrow = isPositive ? '↑' : '↓';
  const text = `${arrow}${Math.abs(diff).toFixed(1)}%`;

  return (
    <span className="text-xs font-medium ml-2" style={{ color }}>
      {text}
    </span>
  );
}

function StatMiniCardBase({
  label,
  value,
  sub,
  subtitle,
  accent = 'slate',
  target,
  actual,
}: StatMiniCardProps) {
  // 计算 actual 数值：优先用 actual prop，其次尝试将 value 转为数字
  const actualNum = actual ?? (typeof value === 'number' ? value : parseFloat(String(value)));
  const hasTarget = target !== undefined && target !== null && target !== 0 && !isNaN(actualNum);
  const ratio = hasTarget ? actualNum / target! : 0;

  return (
    <div className="card-interactive px-4 py-3">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <div className="flex items-baseline">
        <p className={`stat-number text-2xl font-bold ${accentColor[accent]}`}>{value}</p>
        {hasTarget && <VsTargetBadge ratio={ratio} />}
      </div>
      {hasTarget && <ProgressBar ratio={ratio} />}
      {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
      {subtitle && (
        <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

export const StatMiniCard = React.memo(StatMiniCardBase);
