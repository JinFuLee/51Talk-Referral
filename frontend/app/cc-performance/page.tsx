'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import type { CCPerformanceResponse } from '@/lib/types/cc-performance';
import { CCPerformanceSummaryCards } from '@/components/cc-performance/CCPerformanceSummaryCards';
import { CCPerformanceTable } from '@/components/cc-performance/CCPerformanceTable';

export default function CCPerformancePage() {
  const { data, isLoading, error, mutate } = useSWR<CCPerformanceResponse>(
    '/api/cc-performance',
    swrFetcher
  );

  return (
    <div className="space-y-6 px-6 py-6">
      {/* 页头 */}
      <div>
        <h1 className="page-title">CC 个人业绩</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          CC 前端销售全维度业绩 · 漏斗 · 过程指标 · 节奏分析
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          CC 负责 M0~M2（0-90天）全漏斗转化 · 业绩 = CC 前端 + 新单 + 转介绍渠道
        </p>
      </div>

      {/* L0：汇总 KPI 卡片 */}
      <CCPerformanceSummaryCards
        grandTotal={data?.grand_total ?? null}
        timeProgressPct={data?.time_progress_pct ?? 0}
        exchangeRate={data?.exchange_rate ?? 34}
      />

      {/* L1：个人业绩明细表（含 L2 展开详情） */}
      <CCPerformanceTable
        teams={data?.teams ?? []}
        exchangeRate={data?.exchange_rate ?? 34}
        isLoading={isLoading}
        error={error}
        onRetry={() => mutate()}
      />
    </div>
  );
}
