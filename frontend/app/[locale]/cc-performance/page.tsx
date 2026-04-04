'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import type { CCPerformanceResponse } from '@/lib/types/cc-performance';
import { CCPerformanceSummaryCards } from '@/components/cc-performance/CCPerformanceSummaryCards';
import { CCPerformanceTable } from '@/components/cc-performance/CCPerformanceTable';
import type { ViewMode } from '@/components/cc-performance/CCPerformanceTable';
import { CCTargetUpload } from '@/components/cc-performance/CCTargetUpload';

const I18N = {
  zh: {
    title: 'CC 个人业绩',
    subtitle: 'CC 前端销售全维度业绩 · 漏斗 · 过程指标 · 节奏分析',
    scope: 'CC 负责 M0~M2（0-90天）全漏斗转化 · 业绩 = CC 前端 + 新单 + 转介绍渠道',
  },
  'zh-TW': {
    title: 'CC 個人業績',
    subtitle: 'CC 前端銷售全維度業績 · 漏斗 · 過程指標 · 節奏分析',
    scope: 'CC 負責 M0~M2（0-90天）全漏斗轉化 · 業績 = CC 前端 + 新單 + 轉介紹渠道',
  },
  en: {
    title: 'CC Individual Performance',
    subtitle: 'CC Sales — Full Funnel · KPIs · Process Metrics · Pace Analysis',
    scope:
      'CC handles M0–M2 (0–90 days) full-funnel conversion · Revenue = CC + New Orders + Referral Channel',
  },
  th: {
    title: 'ผลงานส่วนตัว CC',
    subtitle: 'CC ยอดขายทุกมิติ · ช่องทาง · ตัวชี้วัดกระบวนการ · การวิเคราะห์จังหวะ',
    scope:
      'CC รับผิดชอบ M0~M2 (0-90 วัน) การแปลงเต็มช่องทาง · ยอด = CC + คำสั่งซื้อใหม่ + ช่องการแนะนำ',
  },
};

export default function CCPerformancePage() {
  usePageDimensions({
    country: true,
    dataRole: 'cc',
    enclosure: true,
    team: true,
  });
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const { data, isLoading, error, mutate } =
    useFilteredSWR<CCPerformanceResponse>('/api/cc-performance');

  // 达标 / BM 参照系，全局同步到卡片和表格
  const [viewMode, setViewMode] = useState<ViewMode>('target');

  return (
    <div className="space-y-6 px-6 py-6">
      {/* 页头 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{t.title}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t.subtitle}</p>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.scope}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          <CCTargetUpload
            month={data?.month || new Date().toISOString().slice(0, 7).replace('-', '')}
            onUploadSuccess={() => mutate()}
          />
        </div>
      </div>

      {/* L0：汇总 KPI 卡片（跟随 viewMode 切换） */}
      <CCPerformanceSummaryCards
        grandTotal={data?.grand_total ?? null}
        timeProgressPct={data?.time_progress_pct ?? 0}
        exchangeRate={data?.exchange_rate ?? 34}
        viewMode={viewMode}
      />

      {/* L1：个人业绩明细表（含 L2 展开详情，含 达标/BM 切换按钮） */}
      <CCPerformanceTable
        teams={data?.teams ?? []}
        exchangeRate={data?.exchange_rate ?? 34}
        isLoading={isLoading}
        error={error}
        onRetry={() => mutate()}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </div>
  );
}
