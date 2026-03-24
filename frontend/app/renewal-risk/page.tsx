'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface RenewalSegment {
  label: string;
  count: number;
  percentage: number;
}

interface HighRiskStudent {
  stdt_id: string;
  days_since_renewal: number | null;
  enclosure: string | null;
  cc_name: string | null;
  total_renewal_orders: number | null;
}

interface RenewalRiskData {
  segments: RenewalSegment[];
  high_risk_students: HighRiskStudent[];
}

// 按未续费天数着色
function segmentColor(label: string): string {
  if (label.startsWith('0')) return '#10b981'; // 绿色 — 安全
  if (label.startsWith('31')) return '#f59e0b'; // 黄色 — 关注
  if (label.startsWith('61')) return '#f97316'; // 橙色 — 预警
  return '#ef4444'; // 红色 — 高风险 (90+)
}

export default function RenewalRiskPage() {
  const { data, isLoading, error } = useSWR<RenewalRiskData>(
    '/api/analysis/renewal-risk',
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
    return <EmptyState title="数据加载失败" description="无法获取续费风险数据，请检查后端服务" />;
  }

  const segments = data?.segments ?? [];
  const highRiskStudents = data?.high_risk_students ?? [];

  if (segments.length === 0 && highRiskStudents.length === 0) {
    return <EmptyState title="暂无续费风险数据" description="请上传含续费记录的数据文件后刷新" />;
  }

  const chartData = segments.map((s) => ({
    name: s.label,
    count: s.count,
    percentage: s.percentage,
  }));

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">续费风险</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          学员未续费天数分布 · 高风险学员名单（90+ 天）
        </p>
      </div>

      {/* 分布条形图 */}
      {chartData.length > 0 && (
        <Card title="未续费天数分布">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="count"
                tick={{ fontSize: 11 }}
                label={{ value: '学员数', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'count' ? [`${value} 人`, '学员数'] : [`${value}%`, '占比']
                }
              />
              <Bar yAxisId="count" dataKey="count" name="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={segmentColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* 分布占比汇总行 */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {segments.map((s, i) => (
              <div key={i} className="text-center bg-[var(--bg-subtle)] rounded-lg p-2">
                <p className="text-lg font-bold" style={{ color: segmentColor(s.label) }}>
                  {s.count.toLocaleString()}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
                <p className="text-xs font-medium" style={{ color: segmentColor(s.label) }}>
                  {s.percentage.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 高风险学员列表 */}
      <Card title={`高风险学员（90+ 天未续费）— ${highRiskStudents.length} 人`}>
        {highRiskStudents.length === 0 ? (
          <EmptyState title="暂无高风险学员" description="90 天以上未续费学员列表为空" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th text-left">学员 ID</th>
                  <th className="slide-th text-right">未续费天数</th>
                  <th className="slide-th text-left">围场</th>
                  <th className="slide-th text-left">CC</th>
                  <th className="slide-th text-right">历史续费次数</th>
                </tr>
              </thead>
              <tbody>
                {highRiskStudents.map((s, i) => (
                  <tr key={s.stdt_id} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td font-mono text-xs">{s.stdt_id}</td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {s.days_since_renewal != null ? (
                        <span className="font-bold text-red-600">{s.days_since_renewal} 天</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="slide-td text-xs">{s.enclosure ?? '—'}</td>
                    <td className="slide-td text-xs">{s.cc_name ?? '—'}</td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {s.total_renewal_orders != null
                        ? s.total_renewal_orders.toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
