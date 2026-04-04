'use client';

import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';

const I18N = {
  zh: {
    loading: '加载今日推送状态…',
    loadError: '无法获取今日推送状态',
    noRecord: (date: string) => `今日暂无推送记录（${date}）`,
    dingtalk: '钉钉',
  },
  'zh-TW': {
    loading: '載入今日推送狀態…',
    loadError: '無法取得今日推送狀態',
    noRecord: (date: string) => `今日暫無推送記錄（${date}）`,
    dingtalk: '釘釘',
  },
  en: {
    loading: "Loading today's push status…",
    loadError: "Failed to fetch today's push status",
    noRecord: (date: string) => `No push records today (${date})`,
    dingtalk: 'DingTalk',
  },
  th: {
    loading: 'กำลังโหลดสถานะการส่งวันนี้…',
    loadError: 'ไม่สามารถดึงสถานะการส่งวันนี้',
    noRecord: (date: string) => `ไม่มีบันทึกการส่งวันนี้ (${date})`,
    dingtalk: 'DingTalk',
  },
};

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
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const { data, isLoading, error } = useFilteredSWR<TodayData>('/api/notifications/today', {
    refreshInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t.loading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-3 text-[var(--color-warning)]">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{t.loadError}</span>
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
        <span className="text-sm">{t.noRecord(data?.date ?? '')}</span>
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
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
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
            <span className="text-xs font-semibold w-12 text-orange-600">{t.dingtalk}</span>
            {renderEntries(dingtalkEntries)}
          </div>
        </>
      )}
    </div>
  );
}
