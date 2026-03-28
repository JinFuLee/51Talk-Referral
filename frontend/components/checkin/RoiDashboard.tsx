'use client';

import useSWR from 'swr';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatUSD } from '@/lib/utils';
import type { RoiAnalysisResponse, RiskLevel } from '@/lib/types/checkin-roi';
import { RISK_LEVEL_CONFIG, RISK_PIE_COLORS } from '@/lib/types/checkin-roi';

interface Props {
  enclosureFilter?: string | null;
}

// 汇总数字卡片
function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="card-base p-4">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-xl font-semibold" style={color ? { color } : undefined}>
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
    </div>
  );
}

export function RoiDashboard({ enclosureFilter }: Props) {
  const params = new URLSearchParams();
  if (enclosureFilter) params.set('enclosure', enclosureFilter);

  const { data, isLoading, error } = useSWR<RoiAnalysisResponse>(
    `/api/checkin/roi-analysis${params.toString() ? '?' + params.toString() : ''}`,
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="ROI 数据加载失败" description="请检查后端服务是否正常运行" />;
  }

  if (!data || data.summary.total_students === 0) {
    return (
      <EmptyState
        title="暂无 ROI 数据"
        description="当前围场过滤下无活动参与学员，请调整筛选条件"
      />
    );
  }

  const { summary, channel_roi } = data;

  // 饼图数据
  const pieData = (
    Object.entries(summary.risk_distribution) as [RiskLevel, { count: number; pct: number }][]
  )
    .filter(([, v]) => v.count > 0)
    .map(([key, v]) => ({
      name: RISK_LEVEL_CONFIG[key].label,
      value: v.count,
      pct: v.pct,
      color: RISK_PIE_COLORS[key],
    }));

  // 渠道条形图数据
  const barData = Object.entries(channel_roi).map(([ch, v]) => ({
    channel: ch,
    成本: Math.round(v.cost_usd),
    收入: Math.round(v.revenue_approx_usd),
    roi: v.roi,
  }));

  // ROI 颜色判断
  const roiColor =
    summary.overall_roi == null
      ? 'var(--text-muted)'
      : summary.overall_roi >= 200
        ? '#16a34a'
        : summary.overall_roi >= 0
          ? '#ca8a04'
          : '#dc2626';

  return (
    <div className="space-y-5">
      {/* 汇总卡片行 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="参与学员数"
          value={summary.total_students.toLocaleString()}
          sub="有活动参与或有收入的学员"
        />
        <SummaryCard
          label="总活动成本"
          value={formatUSD(summary.total_cost_usd)}
          sub="次卡成本（按 $1.31/张）"
        />
        <SummaryCard
          label="总转介绍收入"
          value={formatUSD(summary.total_revenue_usd)}
          sub="D3 带新付费金额"
        />
        <SummaryCard
          label="整体 ROI"
          value={summary.overall_roi != null ? `${summary.overall_roi.toFixed(1)}%` : '—'}
          sub="(收入−成本)/成本"
          color={roiColor}
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 风险分层饼图 */}
        <div className="card-base p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">风险分层分布</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, pct }) => `${name} ${(pct * 100).toFixed(1)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} 人`,
                    name,
                  ]}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="暂无分层数据" />
          )}
        </div>

        {/* 渠道 ROI 条形图 */}
        <div className="card-base p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
            渠道成本 vs 收入对比
          </h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="成本" fill="#e05545" radius={[3, 3, 0, 0]} />
                <Bar dataKey="收入" fill="#2d9f6f" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="暂无渠道数据" />
          )}

          {/* 渠道 ROI 数字快览 */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {barData.map((b) => (
              <div key={b.channel} className="text-center">
                <p className="text-xs text-[var(--text-muted)]">{b.channel}</p>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color:
                      b.roi == null
                        ? 'var(--text-muted)'
                        : b.roi >= 200
                          ? '#16a34a'
                          : b.roi >= 0
                            ? '#ca8a04'
                            : '#dc2626',
                  }}
                >
                  {b.roi != null ? `${b.roi.toFixed(0)}%` : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 风险等级说明 */}
      <div className="card-base p-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">风险等级说明</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(
            Object.entries(RISK_LEVEL_CONFIG) as [
              RiskLevel,
              (typeof RISK_LEVEL_CONFIG)[RiskLevel],
            ][]
          ).map(([key, cfg]) => {
            const dist = summary.risk_distribution[key];
            return (
              <div
                key={key}
                className="flex items-start gap-2 p-2 rounded-lg"
                style={{ backgroundColor: cfg.bgColor }}
              >
                <span className="text-sm">{cfg.emoji}</span>
                <div>
                  <p className="text-xs font-medium" style={{ color: cfg.color }}>
                    {cfg.label}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {dist?.count ?? 0} 人（{((dist?.pct ?? 0) * 100).toFixed(1)}%）
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
