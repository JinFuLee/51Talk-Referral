'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

interface HeatmapRow {
  enclosure: string;
  week1_avg: number | null;
  week2_avg: number | null;
  week3_avg: number | null;
  week4_avg: number | null;
  trend_ratio: number | null;
}

const WEEKS = [
  { key: 'week1_avg' as const, label: '第1周' },
  { key: 'week2_avg' as const, label: '第2周' },
  { key: 'week3_avg' as const, label: '第3周' },
  { key: 'week4_avg' as const, label: '第4周' },
];

/** 根据 0-1 强度值映射 CSS 背景色（Warm Neutral 深浅） */
function intensityBg(ratio: number): string {
  if (ratio >= 0.85) return 'var(--n-800)';
  if (ratio >= 0.65) return 'var(--n-600)';
  if (ratio >= 0.45) return 'var(--n-400)';
  if (ratio >= 0.25) return 'var(--n-300)';
  if (ratio >= 0.05) return 'var(--n-200)';
  return 'var(--n-100)';
}

function intensityText(ratio: number): string {
  return ratio >= 0.45 ? '#fff' : 'var(--text-primary)';
}

function HeatCell({ value, maxVal }: { value: number | null; maxVal: number }) {
  if (value == null) {
    return (
      <td className="slide-td text-center">
        <span className="text-xs text-[var(--text-muted)]">—</span>
      </td>
    );
  }
  const ratio = maxVal > 0 ? value / maxVal : 0;
  return (
    <td className="slide-td text-center p-1">
      <div
        className="rounded-md px-2 py-1.5 text-xs font-mono tabular-nums font-semibold"
        style={{
          backgroundColor: intensityBg(ratio),
          color: intensityText(ratio),
        }}
      >
        {(value ?? 0).toFixed(2)}
      </div>
    </td>
  );
}

export default function LearningHeatmapPage() {
  const { data, isLoading, error } = useSWR<HeatmapRow[]>(
    '/api/analysis/learning-heatmap',
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="数据加载失败"
        description="无法获取学习热图数据，请检查后端服务是否正常运行"
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="page-title">学习热图</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">各围场每周平均转码次数热力图</p>
        </div>
        <EmptyState
          title="暂无转码数据"
          description={'数据源中未找到「第N周转码」列，请上传包含周转码信息的学员数据文件'}
        />
      </div>
    );
  }

  // 求全局最大值用于归一化
  const allValues = data.flatMap((row) =>
    WEEKS.map((w) => row[w.key]).filter((v): v is number => v != null)
  );
  const maxVal = Math.max(...allValues, 0.001);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="page-title">学习热图</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          各围场每周平均转码次数 · 颜色越深代表学习活跃度越高
        </p>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span>活跃度：</span>
        {[
          { label: '极低', bg: 'var(--n-100)' },
          { label: '低', bg: 'var(--n-200)' },
          { label: '中', bg: 'var(--n-300)' },
          { label: '较高', bg: 'var(--n-400)' },
          { label: '高', bg: 'var(--n-600)' },
          { label: '极高', bg: 'var(--n-800)' },
        ].map(({ label, bg }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: bg }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* 热图表格 */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th text-left">围场 / 生命周期</th>
              {WEEKS.map((w) => (
                <th key={w.key} className="slide-th text-center">
                  {w.label}
                </th>
              ))}
              <th className="slide-th text-center">周均</th>
              <th className="slide-th text-center">
                <span className="inline-flex items-center gap-1 group relative cursor-default">
                  趋势
                  <span
                    className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
                    title="历史均值/本周转码比，>1=衰减，<1=增长，≈1=稳定"
                  >
                    ⓘ
                  </span>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                    衰减比 = 前几周均值/本周，&gt;1表示本周低于历史
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const vals = WEEKS.map((w) => row[w.key]).filter((v): v is number => v != null);
              const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
              return (
                <tr
                  key={row.enclosure}
                  className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                >
                  <td className="slide-td font-medium text-[var(--text-primary)]">
                    {row.enclosure}
                  </td>
                  {WEEKS.map((w) => (
                    <HeatCell key={w.key} value={row[w.key]} maxVal={maxVal} />
                  ))}
                  <td className="slide-td text-center">
                    {avg != null ? (
                      <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                        {avg.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="slide-td text-center">
                    {row.trend_ratio != null ? (
                      <span
                        className={`text-xs font-medium ${
                          row.trend_ratio > 1.15
                            ? 'text-red-500'
                            : row.trend_ratio < 0.85
                              ? 'text-green-600'
                              : 'text-[var(--text-secondary)]'
                        }`}
                        title={`衰减比: ${row.trend_ratio}`}
                      >
                        {row.trend_ratio > 1.15 ? '↓' : row.trend_ratio < 0.85 ? '↑' : '→'}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 说明 */}
      <p className="text-xs text-[var(--text-muted)]">
        数值 = 该围场所有学员在对应周内的平均转码次数（转码 = 学员分享推荐链接的行为）
      </p>
    </div>
  );
}
