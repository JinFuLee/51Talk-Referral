'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
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
  Cell,
  ResponsiveContainer,
} from 'recharts';

export interface RenewalRiskSegment {
  segment_id: string;
  label: string;
  count: number;
  days_range: string;
  // percentage 由前端从 count / total 计算，后端不提供
}

export interface RenewalRiskStudent {
  stdt_id: string;
  days_since_last_renewal: number | null;
  enclosure: string | null;
  cc_name: string | null;
  days_to_expiry: number | null;
  monthly_referral_registrations: number | null;
  monthly_referral_payments: number | null;
  total_lesson_packages: number | null;
  total_renewal_orders: number | null;
}

export interface RenewalRiskData {
  segments: RenewalRiskSegment[];
  high_risk_students: RenewalRiskStudent[];
  total_students_with_data: number;
  high_risk_rate: number;
  renewal_col_used: string;
}

function segmentColor(label: string): string {
  if (label.includes('高风险') || label.includes('90')) return 'var(--chart-5-hex)';
  if (label.includes('中高') || label.includes('61')) return 'var(--chart-3-hex)';
  if (label.includes('关注') || label.includes('31')) return 'var(--chart-1-hex)';
  return 'var(--chart-4-hex)';
}

function riskBadge(days?: number | null): { label: string; cls: string } {
  if (days == null)
    return { label: '未知', cls: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]' };
  if (days > 90) return { label: '高风险', cls: 'bg-red-100 text-red-700' };
  if (days > 60) return { label: '中高风险', cls: 'bg-orange-100 text-orange-700' };
  if (days > 30) return { label: '关注', cls: 'bg-yellow-100 text-yellow-700' };
  return { label: '正常', cls: 'bg-green-100 text-green-700' };
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
  // percentage 由前端计算（后端不返回此字段）
  const totalCount = segments.reduce((s, seg) => s + (seg.count ?? 0), 0);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">续费风险</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          按未续费天数分布 · 高风险（90+ 天）学员列表
        </p>
      </div>

      {segments.length === 0 ? (
        <EmptyState title="暂无续费风险数据" description="上传数据文件后自动分析" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {segments.map((seg) => {
              const color = segmentColor(seg.label);
              const pct = totalCount > 0 ? (seg.count ?? 0) / totalCount : 0;
              return (
                <Card key={seg.segment_id ?? seg.label} title="">
                  <div className="pt-1">
                    <p className="text-xs text-[var(--text-muted)] mb-1">
                      {seg.label}（{seg.days_range ?? seg.label} 天）
                    </p>
                    <p className="text-2xl font-bold" style={{ color }}>
                      {(seg.count ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      占比 {formatRate(pct)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card title="未续费天数分布">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={segments} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), '学员数']} />
                <Bar dataKey="count" name="学员数" radius={[4, 4, 0, 0]}>
                  {segments.map((entry, i) => (
                    <Cell key={i} fill={segmentColor(entry.label)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      <Card title={`高风险学员（90+ 天未续费）· 共 ${highRiskStudents.length} 人`}>
        {highRiskStudents.length === 0 ? (
          <EmptyState title="暂无高风险学员" description="90 天以上未续费学员为空，数据良好" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th text-left">学员 ID</th>
                  <th className="slide-th text-right">未续费天数</th>
                  <th className="slide-th text-center">风险等级</th>
                  <th className="slide-th text-left">围场</th>
                  <th className="slide-th text-left">负责 CC</th>
                  <th className="slide-th text-right">
                    <span className="inline-flex items-center gap-1 group relative cursor-default">
                      总次卡数
                      <span
                        className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
                        title="历史购买次卡总数，衡量学员历史购买规模"
                      >
                        ⓘ
                      </span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                        历史购买次卡总数
                      </span>
                    </span>
                  </th>
                  <th className="slide-th text-right">
                    <span className="inline-flex items-center gap-1 group relative cursor-default">
                      总续费订单
                      <span
                        className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
                        title="1v1续费订单总数，高续费=高价值学员"
                      >
                        ⓘ
                      </span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none shadow-lg">
                        1v1续费订单总数，高续费=高价值
                      </span>
                    </span>
                  </th>
                  <th className="slide-th text-right">本月推荐注册</th>
                </tr>
              </thead>
              <tbody>
                {highRiskStudents.map((s, i) => {
                  const badge = riskBadge(s.days_since_last_renewal);
                  return (
                    <tr
                      key={s.stdt_id ?? i}
                      className="even:bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)]"
                    >
                      <td className="slide-td font-mono text-xs">{s.stdt_id ?? '—'}</td>
                      <td className="slide-td text-right font-mono tabular-nums font-semibold text-red-600">
                        {s.days_since_last_renewal ?? '—'}
                      </td>
                      <td className="slide-td text-center">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="slide-td text-[var(--text-secondary)]">
                        {s.enclosure ?? '—'}
                      </td>
                      <td className="slide-td">{s.cc_name ?? '—'}</td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        {s.total_lesson_packages != null
                          ? s.total_lesson_packages.toLocaleString()
                          : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        {s.total_renewal_orders != null
                          ? s.total_renewal_orders.toLocaleString()
                          : '—'}
                      </td>
                      <td className="slide-td text-right font-mono tabular-nums">
                        {s.monthly_referral_registrations ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
