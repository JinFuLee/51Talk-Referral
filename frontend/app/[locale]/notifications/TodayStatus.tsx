'use client';

import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

/** 后端 /api/notifications/today 实际返回格式 */
interface ChannelRecord {
  pushed: boolean;
  time: string;
  result: string;
  platform: string;
}

interface TodayData {
  date: string;
  channels: Record<string, ChannelRecord>;
  total: number;
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

  if (error) {
    return (
      <div className="flex items-center gap-2 py-3 text-amber-600">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">无法获取今日推送状态</span>
      </div>
    );
  }

  const channels = data?.channels ?? {};
  const channelEntries = Object.entries(channels);

  // 无推送数据时显示空状态
  if (channelEntries.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-[var(--text-muted)]">
        <Clock className="w-4 h-4" />
        <span className="text-sm">今日暂无推送记录（{data?.date ?? ''}）</span>
      </div>
    );
  }

  // 按平台分组
  const larkEntries = channelEntries.filter(([, v]) => v.platform === 'lark');
  const dingtalkEntries = channelEntries.filter(([, v]) => v.platform === 'dingtalk');

  function renderEntries(entries: [string, ChannelRecord][]) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {entries.map(([id, rec]) => (
          <div key={id} className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-[var(--text-primary)]">{id}</span>
            {rec.pushed ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs text-[var(--text-muted)]">
                  {rec.time} ({rec.result})
                </span>
              </>
            ) : (
              <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {larkEntries.length > 0 && (
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold w-12 text-action-accent">Lark</span>
          {renderEntries(larkEntries)}
        </div>
      )}
      {dingtalkEntries.length > 0 && (
        <>
          <div className="border-t border-[var(--border-default)]" />
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold w-12 text-orange-600">钉钉</span>
            {renderEntries(dingtalkEntries)}
          </div>
        </>
      )}
    </div>
  );
}
