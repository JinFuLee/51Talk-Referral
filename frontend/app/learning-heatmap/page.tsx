'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

interface HeatmapRow {
  enclosure: string;
  total_students: number;
  week1_avg: number | null;
  week2_avg: number | null;
  week3_avg: number | null;
  week4_avg: number | null;
}

interface HeatmapResponse {
  rows: HeatmapRow[];
  week_cols_found: Record<string, string | null>;
  summary: string;
}

function cellColor(val: number | null, max: number): string {
  if (val == null) return 'bg-[var(--n-100)] text-[var(--text-muted)]';
  if (max === 0) return 'bg-[var(--n-100)] text-[var(--text-muted)]';
  const intensity = val / max;
  if (intensity >= 0.8) return 'bg-emerald-700 text-white';
  if (intensity >= 0.6) return 'bg-emerald-500 text-white';
  if (intensity >= 0.4) return 'bg-emerald-300 text-[var(--text-primary)]';
  if (intensity >= 0.2) return 'bg-emerald-100 text-[var(--text-primary)]';
  return 'bg-[var(--n-100)] text-[var(--text-muted)]';
}

export default function LearningHeatmapPage() {
  const { data, isLoading, error } = useSWR<HeatmapResponse>(
    '/api/analysis/learning-heatmap',
    swrFetcher
  );

  // 计算每周最大值（用于颜色归一化）
  const weekMaxes = {
    week1: 0,
    week2: 0,
    week3: 0,
    week4: 0,
  };
  if (data?.rows) {
    for (const row of data.rows) {
      if ((row.week1_avg ?? 0) > weekMaxes.week1) weekMaxes.week1 = row.week1_avg ?? 0;
      if ((row.week2_avg ?? 0) > weekMaxes.week2) weekMaxes.week2 = row.week2_avg ?? 0;
      if ((row.week3_avg ?? 0) > weekMaxes.week3) weekMaxes.week3 = row.week3_avg ?? 0;
      if ((row.week4_avg ?? 0) > weekMaxes.week4) weekMaxes.week4 = row.week4_avg ?? 0;
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">学习热图</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          按围场 × 周次 分布转码率 · 颜色越深表示转码次数越高
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          定义：围场 = 围场（生命周期）分段 | 转码 = 第1～4周学员转码次数均值
        </p>
      </div>

      <Card title={data ? `学习热图 — ${data.summary}` : '学习热图'}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState title="加载失败" description="请检查后端服务是否正常运行" />
        ) : !data || data.rows.length === 0 ? (
          <EmptyState title="暂无热图数据" description="需要 D4 学员数据中包含 第1~4周转码 列" />
        ) : (
          <div className="overflow-x-auto">
            {/* 列可用性提示 */}
            {Object.values(data.week_cols_found).some((v) => v === null) && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-700">
                部分周次列未在数据中找到，对应格显示为灰色。 已找到：
                {Object.entries(data.week_cols_found)
                  .filter(([, v]) => v !== null)
                  .map(([k]) => k)
                  .join('、') || '无'}
              </div>
            )}

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--text-muted)] w-32">
                    围场
                  </th>
                  <th className="text-center py-2.5 px-2 text-xs font-semibold text-[var(--text-muted)]">
                    第1周转码
                  </th>
                  <th className="text-center py-2.5 px-2 text-xs font-semibold text-[var(--text-muted)]">
                    第2周转码
                  </th>
                  <th className="text-center py-2.5 px-2 text-xs font-semibold text-[var(--text-muted)]">
                    第3周转码
                  </th>
                  <th className="text-center py-2.5 px-2 text-xs font-semibold text-[var(--text-muted)]">
                    第4周转码
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-[var(--text-muted)]">
                    学员数
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.enclosure}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <td className="py-2.5 px-3 text-xs font-medium text-[var(--text-primary)]">
                      {row.enclosure}
                    </td>
                    {(
                      [
                        [row.week1_avg, weekMaxes.week1],
                        [row.week2_avg, weekMaxes.week2],
                        [row.week3_avg, weekMaxes.week3],
                        [row.week4_avg, weekMaxes.week4],
                      ] as [number | null, number][]
                    ).map(([val, max], i) => (
                      <td key={i} className="py-1 px-2 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-mono tabular-nums min-w-[3rem] ${cellColor(val, max)}`}
                        >
                          {val != null ? val.toFixed(2) : '—'}
                        </span>
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-xs font-mono tabular-nums text-right text-[var(--text-secondary)]">
                      {row.total_students.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 颜色图例 */}
            <div className="mt-4 flex items-center gap-3 px-1">
              <span className="text-xs text-[var(--text-muted)]">低</span>
              {[
                'bg-[var(--n-100)]',
                'bg-emerald-100',
                'bg-emerald-300',
                'bg-emerald-500',
                'bg-emerald-700',
              ].map((cls, i) => (
                <div key={i} className={`w-6 h-3 rounded ${cls}`} />
              ))}
              <span className="text-xs text-[var(--text-muted)]">高</span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">（周均转码次数）</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
