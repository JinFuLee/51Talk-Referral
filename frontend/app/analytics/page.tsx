'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { MonthlyOverviewSlide } from '@/components/analytics/MonthlyOverviewSlide';
import { GapDashboardSlide } from '@/components/analytics/GapDashboardSlide';
import { ScenarioCompareSlide } from '@/components/analytics/ScenarioCompareSlide';
import { ProjectionSlide } from '@/components/analytics/ProjectionSlide';
import { RevenueContributionSlide } from '@/components/analytics/RevenueContributionSlide';
import type { DailyReport } from '@/lib/types/report';

// ── I18N ──────────────────────────────────────────────────────────────────────
const I18N = {
  zh: {
    title: '运营分析报告',
    subtitle: '全量 326 数据点 · T-1 日自动更新',
    bmProgress: '工作日进度',
    dataDate: '数据日期',
    noData: '暂无报告数据',
    noDataDesc: '请上传本月 Excel 数据源后重新加载',
    loading: '加载中…',
    loadError: '数据加载失败',
    loadErrorDesc: '请检查后端服务是否正常运行',
    retry: '重试',
    lang: 'EN',
    block1: '月度总览',
    block2: '缺口仪表盘',
    block3: '效率推演',
    block4: '达标测算',
    block5: '业绩贡献',
  },
  en: {
    title: 'Operations Analytics Report',
    subtitle: '326 data points · Auto-updated T-1',
    bmProgress: 'Workday Progress',
    dataDate: 'Data Date',
    noData: 'No report data available',
    noDataDesc: "Please upload this month's Excel data source",
    loading: 'Loading…',
    loadError: 'Data load failed',
    loadErrorDesc: 'Please check if the backend service is running',
    retry: 'Retry',
    lang: '中',
    block1: 'Monthly Overview',
    block2: 'Gap Dashboard',
    block3: 'Scenario Analysis',
    block4: 'Projection',
    block5: 'Revenue Contribution',
  },
} as const;

type Lang = keyof typeof I18N;

export default function AnalyticsPage() {
  const { data, isLoading, error, mutate } = useSWR<DailyReport>('/api/report/daily', swrFetcher);

  // 语言切换（localStorage 持久化）
  const [lang, setLang] = useState<Lang>('zh');

  // 初始化语言偏好
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('analytics-lang') as Lang | null;
    if (stored && stored !== lang) {
      // 不在 render 中直接 setState，用 useEffect 处理
    }
  }

  const t = I18N[lang];
  const bm = data?.bm_pct ?? 0;
  const date = data?.date ?? '—';

  function toggleLang() {
    const next: Lang = lang === 'zh' ? 'en' : 'zh';
    setLang(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('analytics-lang', next);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 顶部 Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] font-display">{t.title}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{t.subtitle}</p>
        </div>
        <button
          onClick={toggleLang}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors duration-150"
        >
          {t.lang}
        </button>
      </div>

      {/* ── BM 进度条 ── */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {t.bmProgress}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)]">
              {t.dataDate}：{date}
            </span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{formatRate(bm)}</span>
          </div>
        </div>
        <div className="w-full bg-[var(--color-accent-subtle)] rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, bm * 100)}%`,
              backgroundColor:
                bm >= 1
                  ? 'var(--color-success)'
                  : bm >= 0.8
                    ? 'var(--color-warning)'
                    : 'var(--color-accent)',
            }}
          />
        </div>
      </div>

      {/* ── 三态处理 ── */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-base h-48 animate-pulse bg-[var(--n-100)]" />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="card-base flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-base font-semibold text-red-600">{t.loadError}</p>
          <p className="text-sm text-[var(--text-muted)]">{t.loadErrorDesc}</p>
          <button onClick={() => mutate()} className="btn-secondary">
            {t.retry}
          </button>
        </div>
      )}

      {!isLoading && !error && !data && (
        <div className="card-base flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-base font-semibold text-[var(--text-secondary)]">{t.noData}</p>
          <p className="text-sm text-[var(--text-muted)]">{t.noDataDesc}</p>
        </div>
      )}

      {/* ── 11 区块布局 ── */}
      {data && !isLoading && (
        <div className="space-y-6">
          {/* Row 1: 区块 1 + 区块 2 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <MonthlyOverviewSlide data={data.blocks.monthly_overview} lang={lang} />
            <GapDashboardSlide
              data={data.blocks.gap_dashboard}
              monthlyData={data.blocks.gap_dashboard?.monthly}
              lang={lang}
            />
          </div>

          {/* Row 2: 区块 3 + 区块 4 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ScenarioCompareSlide data={data.blocks.scenario_analysis} lang={lang} />
            <ProjectionSlide data={data.blocks.projection} bm_pct={data.bm_pct} lang={lang} />
          </div>

          {/* Row 3: 区块 5（全宽） */}
          <RevenueContributionSlide data={data.blocks.revenue_contribution} lang={lang} />

          {/* Row 4-6: 区块 6-11 占位（由 FE2 实现） */}
          <div className="card-base p-6 text-center text-sm text-[var(--text-muted)]">
            区块 6-11（MoM 归因 / 例子归因 / 增量分解 / 漏斗杠杆 / 渠道归因）由 FE2 MK 实现
          </div>
        </div>
      )}
    </div>
  );
}
