'use client';

import { useLocale } from 'next-intl';
import type { DataSourceStatus } from '@/lib/types';
import { DataSourceHealthCard } from './DataSourceHealthCard';
import { DataSourceSummaryBar } from './DataSourceSummaryBar';
import { EmptyState } from '@/components/ui/EmptyState';

/* ── I18N ────────────────────────────────────────────────────────── */

const I18N = {
  zh: {
    emptyTitle: '未检测到数据源',
    emptyDesc: '请前往设置页面配置数据文件路径',
  },
  'zh-TW': {
    emptyTitle: '未偵測到資料來源',
    emptyDesc: '請前往設定頁面設定資料檔案路徑',
  },
  en: {
    emptyTitle: 'No data sources detected',
    emptyDesc: 'Please go to Settings to configure data file paths',
  },
  th: {
    emptyTitle: 'ไม่พบแหล่งข้อมูล',
    emptyDesc: 'กรุณาไปที่หน้าตั้งค่าเพื่อกำหนดเส้นทางไฟล์ข้อมูล',
  },
} as const;

type Locale = keyof typeof I18N;

export function DataSourceSection({ sources }: { sources: DataSourceStatus[] }) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  if (sources.length === 0) {
    return <EmptyState title={t.emptyTitle} description={t.emptyDesc} />;
  }

  return (
    <div>
      <DataSourceSummaryBar sources={sources} />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {sources.map((s) => (
          <DataSourceHealthCard key={s.id} source={s} />
        ))}
      </div>
    </div>
  );
}
