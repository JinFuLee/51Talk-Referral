'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { HealthScoreCards } from '@/components/enclosure-health/HealthScoreCards';
import { SegmentBenchmark } from '@/components/enclosure-health/SegmentBenchmark';
import { CCVarianceBox } from '@/components/enclosure-health/CCVarianceBox';
import type {
  EnclosureHealthScore,
  EnclosureBenchmarkRow,
  EnclosureVarianceRow,
} from '@/lib/types/cross-analysis';

export default function EnclosureHealthPage() {
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);

  const {
    data: scoresData,
    isLoading: loadingScores,
    error: scoresError,
  } = useSWR<EnclosureHealthScore[]>('/api/enclosure-health/scores', swrFetcher);

  const {
    data: benchmarkData,
    isLoading: loadingBenchmark,
    error: benchmarkError,
  } = useSWR<EnclosureBenchmarkRow[]>('/api/enclosure-health/benchmark', swrFetcher);

  const {
    data: varianceData,
    isLoading: loadingVariance,
    error: varianceError,
  } = useSWR<EnclosureVarianceRow[]>('/api/enclosure-health/variance', swrFetcher);

  const scores = Array.isArray(scoresData) ? scoresData : [];
  const benchmarks = Array.isArray(benchmarkData) ? benchmarkData : [];
  const variances = Array.isArray(varianceData) ? varianceData : [];

  const greenCount = scores.filter((s) => s.level === 'green').length;
  const yellowCount = scores.filter((s) => s.level === 'yellow').length;
  const redCount = scores.filter((s) => s.level === 'red').length;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">围场健康扫描仪</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          14段围场 · 健康分 · 对标分析 · CC方差诊断
        </p>
      </div>

      {/* 顶部汇总 */}
      {scores.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-medium text-green-700 dark:text-green-400">健康</span>
            <span className="font-bold text-green-700 dark:text-green-400">{greenCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="font-medium text-yellow-700 dark:text-yellow-400">警告</span>
            <span className="font-bold text-yellow-700 dark:text-yellow-400">{yellowCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="font-medium text-red-700 dark:text-red-400">危险</span>
            <span className="font-bold text-red-700 dark:text-red-400">{redCount}</span>
          </div>
        </div>
      )}

      {/* 健康分卡片 */}
      <Card title="围场健康分（14 段）">
        {loadingScores ? (
          <div className="flex items-center justify-center h-32">
            <Spinner size="lg" />
          </div>
        ) : scoresError ? (
          <div className="text-center py-8">
            <p className="text-base font-semibold text-red-600">数据加载失败</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">请检查后端服务是否正常运行</p>
          </div>
        ) : !scores.length ? (
          <EmptyState title="暂无围场健康数据" description="上传围场数据后自动生成" />
        ) : (
          <HealthScoreCards
            data={scores}
            onSegmentClick={(seg) => setExpandedSegment(expandedSegment === seg ? null : seg)}
          />
        )}
      </Card>

      {/* 展开的围场段 CC 列表 */}
      {expandedSegment && (
        <Card
          title={`${expandedSegment} — CC 列表`}
          actions={
            <button
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              onClick={() => setExpandedSegment(null)}
            >
              收起
            </button>
          }
        >
          {(() => {
            const seg = scores.find((s) => s.segment === expandedSegment);
            if (!seg) return <div className="text-sm text-[var(--text-muted)]">无数据</div>;
            return (
              <div className="text-sm text-[var(--text-secondary)]">
                <p>
                  围场段 <strong>{seg.segment}</strong> 健康分{' '}
                  <strong>{(seg.health_score ?? 0).toFixed(0)}</strong>
                </p>
                <p className="text-xs mt-1 text-[var(--text-muted)]">
                  参与率 {formatRate(seg.participation)} · 转化率 {formatRate(seg.conversion)} ·
                  打卡率 {formatRate(seg.checkin)}
                </p>
                <p className="text-xs mt-2 text-[var(--text-muted)]">
                  点击围场健康卡片可在此展开 CC 明细（需后端
                  /api/enclosure-health/segment-ccs?segment= 接口支持）
                </p>
              </div>
            );
          })()}
        </Card>
      )}

      {/* 围场间对标柱图 */}
      <Card title="围场段对标分析（4 指标分组柱图）">
        {loadingBenchmark ? (
          <div className="flex items-center justify-center h-48">
            <Spinner />
          </div>
        ) : benchmarkError ? (
          <div className="text-center py-8">
            <p className="text-base font-semibold text-red-600">数据加载失败</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">请检查后端服务是否正常运行</p>
          </div>
        ) : !benchmarks.length ? (
          <EmptyState title="暂无对标数据" description="上传围场数据后自动生成" />
        ) : (
          <SegmentBenchmark data={benchmarks} />
        )}
      </Card>

      {/* CC 方差箱线图 */}
      <Card title="CC 方差诊断（各围场段内 CC 分布）">
        {loadingVariance ? (
          <div className="flex items-center justify-center h-32">
            <Spinner />
          </div>
        ) : varianceError ? (
          <div className="text-center py-8">
            <p className="text-base font-semibold text-red-600">数据加载失败</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">请检查后端服务是否正常运行</p>
          </div>
        ) : !variances.length ? (
          <EmptyState title="暂无方差数据" description="上传围场数据后自动生成" />
        ) : (
          <CCVarianceBox data={variances} />
        )}
      </Card>
    </div>
  );
}
