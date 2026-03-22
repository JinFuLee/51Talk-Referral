'use client';

import type { WarroomStudent } from '@/lib/types/cross-analysis';

interface HPFunnelProps {
  students: WarroomStudent[];
}

export function HPFunnel({ students }: HPFunnelProps) {
  const total = students.length;
  if (total === 0) return null;

  const totalNew = students.reduce((s, x) => s + x.total_new, 0);
  const totalAttend = students.reduce((s, x) => s + x.attendance, 0);
  const totalPay = students.reduce((s, x) => s + x.payments, 0);

  const steps = [
    { label: '高潜学员', value: total, color: '#6366f1', pct: 100 },
    {
      label: '带新注册',
      value: totalNew,
      color: '#8b5cf6',
      pct: total > 0 ? Math.round((totalNew / total) * 100) : 0,
    },
    {
      label: '出席',
      value: totalAttend,
      color: '#a78bfa',
      pct: total > 0 ? Math.round((totalAttend / total) * 100) : 0,
    },
    {
      label: '付费',
      value: totalPay,
      color: '#c4b5fd',
      pct: total > 0 ? Math.round((totalPay / total) * 100) : 0,
    },
  ];

  return (
    <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] shadow-[var(--shadow-subtle)] p-3">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">高潜漏斗</h3>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-3">
            <div className="w-16 shrink-0 text-xs text-[var(--text-secondary)] text-right">
              {step.label}
            </div>
            <div className="flex-1 h-7 rounded bg-[var(--bg-subtle)] overflow-hidden relative">
              <div
                className="h-full rounded transition-all flex items-center pl-2"
                style={{
                  width: `${Math.max(step.pct, 4)}%`,
                  backgroundColor: step.color,
                }}
              >
                <span className="text-[10px] font-bold text-white">{step.value}</span>
              </div>
            </div>
            <div className="w-10 shrink-0 text-xs text-[var(--text-muted)] text-right">
              {step.pct}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
