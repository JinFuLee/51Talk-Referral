'use client';

import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

interface RoleStatus {
  role: string;
  sent: boolean;
  time?: string;
  channels: number;
  total: number;
}

interface TodayData {
  lark: RoleStatus[];
  dingtalk: RoleStatus[];
  date: string;
}

const ROLE_COLORS: Record<string, string> = {
  CC: 'bg-emerald-100 text-emerald-700',
  LP: 'bg-purple-100 text-purple-700',
  SS: 'bg-blue-100 text-blue-700',
  运营: 'bg-stone-100 text-stone-600',
  ALL: 'bg-gray-100 text-gray-600',
};

function RoleChip({ role, sent, time }: { role: string; sent: boolean; time?: string }) {
  const color = ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600';
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{role}</span>
      {sent ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {time && <span className="text-xs text-[var(--text-muted)]">{time}</span>}
        </>
      ) : (
        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
      )}
    </div>
  );
}

function PlatformRow({
  label,
  statuses,
  color,
}: {
  label: string;
  statuses: RoleStatus[];
  color: string;
}) {
  const sent = statuses.filter((s) => s.sent).length;
  const total = statuses.length;
  const allOk = sent === total;

  return (
    <div className="flex items-center gap-4">
      <div className={`text-xs font-semibold w-12 ${color}`}>{label}</div>
      <div className="flex items-center gap-3 flex-wrap">
        {statuses.map((s) => (
          <RoleChip key={s.role} role={s.role} sent={s.sent} time={s.time} />
        ))}
      </div>
      <div className="ml-auto flex items-center gap-1">
        {allOk ? (
          <span className="text-xs text-emerald-600 font-medium">
            {sent}/{total} 正常
          </span>
        ) : sent === 0 ? (
          <span className="text-xs text-[var(--text-muted)]">今日未推送</span>
        ) : (
          <span className="text-xs text-amber-600 font-medium">
            {sent}/{total} 已发
          </span>
        )}
      </div>
    </div>
  );
}

export function TodayStatus() {
  const { data, isLoading, error } = useSWR<TodayData>('/api/notifications/today', swrFetcher, {
    refreshInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">加载今日推送状态…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 py-3 text-amber-600">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">无法获取今日推送状态</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <PlatformRow label="Lark" statuses={data.lark} color="text-blue-600" />
      <div className="border-t border-[var(--border-default)]" />
      <PlatformRow label="钉钉" statuses={data.dingtalk} color="text-orange-600" />
    </div>
  );
}
