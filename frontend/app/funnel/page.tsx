'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { formatRate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { FunnelResult, ScenarioResult } from '@/lib/types/funnel';
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

// 带邀约节点的完整漏斗类型
interface InvitationFunnelStage {
  name: string;
  count: number;
  conversion_rate?: number;
}

interface InvitationFunnelResponse {
  stages: InvitationFunnelStage[];
}

const GAP_COLORS: Record<string, string> = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#94a3b8',
};

function gapColor(gap: number) {
  if (gap > 0) return GAP_COLORS.positive;
  if (gap < 0) return GAP_COLORS.negative;
  return GAP_COLORS.neutral;
}

interface FunnelResponse {
  funnel: FunnelResult;
  scenario: ScenarioResult[];
}

export default function FunnelPage() {
  const {
    data: funnelData,
    isLoading: fLoading,
    error: fError,
  } = useSWR<FunnelResult>('/api/funnel', swrFetcher);
  const { data: scenarioRaw, isLoading: sLoading } = useSWR('/api/funnel/scenario', swrFetcher);
  const { data: invitationData } = useSWR<InvitationFunnelResponse>(
    '/api/funnel/with-invitation',
    swrFetcher
  );

  const isLoading = fLoading || sLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (fError) {
    return <EmptyState title="数据加载失败" description="无法获取漏斗数据，请检查后端服务" />;
  }

  const stages = (funnelData?.stages ?? []).filter((s) => s.target != null || s.actual != null);

  // 后端返回单对象或数组；字段名映射到前端期望的 ScenarioResult 结构
  const scenarioList: ScenarioResult[] = scenarioRaw
    ? [scenarioRaw].flat().map((s: Record<string, unknown>) => ({
        stage: (s.scenario_stage ?? s.stage ?? '') as string,
        current_rate: (s.scenario_rate_current ?? s.current_rate ?? 0) as number,
        scenario_rate: (s.scenario_rate_target ?? s.scenario_rate ?? 0) as number,
        impact_registrations: (s.impact_registrations ?? 0) as number,
        impact_payments: (s.incremental_payments ?? s.impact_payments ?? 0) as number,
        impact_revenue: (s.incremental_revenue ?? s.impact_revenue ?? 0) as number,
      }))
    : [];
  // 仅展示有 stage 名称的条目（过滤无效空对象）
  const scenarios = scenarioList.filter((s) => !!s.stage);

  const conversionChartData = stages
    .filter((s) => s.conversion_rate !== undefined)
    .map((s) => ({
      name: s.name,
      actual: Number(((s.conversion_rate ?? 0) * 100).toFixed(1)),
      target: Number(((s.target_rate ?? 0) * 100).toFixed(1)),
      // rate_gap 后端未提供时，用 actual 转化率 vs target_rate 的差值着色；
      // 若 target_rate 也不存在，则用 conversion_rate 绝对值（>0 为绿色）
      gap:
        s.rate_gap != null
          ? s.rate_gap
          : s.target_rate != null
            ? (s.conversion_rate ?? 0) - s.target_rate
            : (s.conversion_rate ?? 0),
    }));

  // 带邀约节点的完整漏斗
  const invitationStages = invitationData?.stages ?? [];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">漏斗分析</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">各环节目标 vs 实际 · 场景推演</p>
      </div>

      {/* 带邀约节点的完整 4 段漏斗 */}
      {invitationStages.length > 0 && (
        <Card title="完整邀约漏斗（注册 → 邀约 → 出席 → 付费）">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th text-left">环节</th>
                  <th className="slide-th text-right">数量</th>
                  <th className="slide-th text-right">上段转化率</th>
                </tr>
              </thead>
              <tbody>
                {invitationStages.map((s, i) => (
                  <tr key={s.name} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td font-medium">{s.name}</td>
                    <td className="slide-td text-right font-mono tabular-nums font-semibold">
                      {(s.count ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {s.conversion_rate != null ? `${(s.conversion_rate * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 漏斗环节表格 */}
      <Card title="漏斗各环节达成">
        {stages.length === 0 ? (
          <EmptyState title="暂无漏斗数据" description="上传数据后自动刷新" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
                  <th className="py-1.5 px-2 border-0 text-left">环节</th>
                  <th className="py-1.5 px-2 border-0 text-right">目标</th>
                  <th className="py-1.5 px-2 border-0 text-right">实际</th>
                  <th className="py-1.5 px-2 border-0 text-right">差距</th>
                  <th className="py-1.5 px-2 border-0 text-right">达成率</th>
                  <th className="py-1.5 px-2 border-0 text-right">转化率</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => (
                  <tr key={s.name} className="even:bg-[var(--bg-subtle)]">
                    <td className="py-1 px-2 text-xs font-medium">{s.name}</td>
                    <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {(s.target ?? 0).toLocaleString()}
                    </td>
                    <td className="py-1 px-2 text-xs text-right font-mono tabular-nums font-semibold">
                      {(s.actual ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`py-1 px-2 text-xs text-right font-mono tabular-nums font-medium ${
                        (s.gap ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {(s.gap ?? 0) >= 0 ? '+' : ''}
                      {(s.gap ?? 0).toLocaleString()}
                    </td>
                    <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                      <span
                        className={`font-medium ${
                          (s.achievement_rate ?? 0) >= 1
                            ? 'text-green-600'
                            : (s.achievement_rate ?? 0) >= 0.8
                              ? 'text-yellow-600'
                              : 'text-red-500'
                        }`}
                      >
                        {formatRate(s.achievement_rate)}
                      </span>
                    </td>
                    <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {s.conversion_rate !== undefined ? formatRate(s.conversion_rate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 转化率柱状图 */}
      {conversionChartData.length > 0 && (
        <Card title="各环节转化率对比">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={conversionChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="actual" name="实际" radius={[4, 4, 0, 0]}>
                {conversionChartData.map((entry, i) => (
                  <Cell key={i} fill={gapColor(entry.gap)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 场景推演表格 */}
      <Card title="场景推演：提升转化率影响">
        {scenarios.length === 0 ? (
          <EmptyState title="暂无场景数据" description="场景推演需要漏斗基础数据" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
                  <th className="py-1.5 px-2 border-0 text-left">环节</th>
                  <th className="py-1.5 px-2 border-0 text-right">当前转化率</th>
                  <th className="py-1.5 px-2 border-0 text-right">场景转化率</th>
                  <th className="py-1.5 px-2 border-0 text-right">影响注册数</th>
                  <th className="py-1.5 px-2 border-0 text-right">影响付费数</th>
                  <th className="py-1.5 px-2 border-0 text-right">影响业绩</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.stage} className="even:bg-[var(--bg-subtle)]">
                    <td className="py-1 px-2 text-xs font-medium">{s.stage}</td>
                    <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {formatRate(s.current_rate)}
                    </td>
                    <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-blue-600 font-medium">
                      {formatRate(s.scenario_rate)}
                    </td>
                    <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                      +{(s.impact_registrations ?? 0).toLocaleString()}
                    </td>
                    <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                      +{(s.impact_payments ?? 0).toLocaleString()}
                    </td>
                    <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-green-600 font-medium">
                      +${(s.impact_revenue ?? 0).toLocaleString()}
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
