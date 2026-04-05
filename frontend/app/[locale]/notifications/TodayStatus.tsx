'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';

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
  const t = useTranslations('TodayStatus');
  const { data, isLoading, error } = useFilteredSWR<TodayData>('/api/notifications/today', {
    refreshInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-token">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t('loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-3 text-warning-token">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{t('loadError')}</span>
      </div>
    );
  }

  const channels = data?.channels ?? {};
  const channelEntries = Object.entries(channels);

  // 无推送数据时显示空状态
  if (channelEntries.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-token">
        <Clock className="w-4 h-4" />
        <span className="text-sm">{t('noRecord', { date: data?.date ?? '' })}</span>
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
            <span className="text-xs font-medium text-primary-token">{id}</span>
            {rec.pushed ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-success-token" />
                <span className="text-xs text-muted-token">
                  {rec.time} ({rec.result})
                </span>
              </>
            ) : (
              <Clock className="w-3.5 h-3.5 text-muted-token" />
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
          <div className="border-t border-default-token" />
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold w-12 text-orange-600">{t('dingtalk')}</span>
            {renderEntries(dingtalkEntries)}
          </div>
        </>
      )}
    </div>
  );
}
