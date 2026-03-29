'use client';

import { useState, useMemo } from 'react';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatUSD, formatRate } from '@/lib/utils';
import type { RoiAnalysisResponse, RoiStudentRow, RiskLevel } from '@/lib/types/checkin-roi';
import { RISK_LEVEL_CONFIG } from '@/lib/types/checkin-roi';

interface Props {
  enclosureFilter?: string | null;
}

const FILTER_OPTIONS: { id: RiskLevel | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'gold', label: '⭐ 金牌推荐人' },
  { id: 'effective', label: '✅ 有效推荐' },
  { id: 'stuck_pay', label: '🔄 成交待跟进' },
  { id: 'stuck_show', label: '🔄 出席待跟进' },
  { id: 'potential', label: '👀 高潜待激活' },
  { id: 'freeloader', label: '⚠️ 纯消耗' },
  { id: 'newcomer', label: '🆕 新人观望' },
  { id: 'casual', label: '💤 低频参与' },
];

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = RISK_LEVEL_CONFIG[level];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
    >
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function RoiCell({ roi }: { roi: number | null }) {
  if (roi == null) return <span className="text-[var(--text-muted)]">—</span>;
  const color = roi >= 200 ? '#16a34a' : roi >= 0 ? '#ca8a04' : '#dc2626';
  return (
    <span className="font-semibold" style={{ color }}>
      {roi.toFixed(1)}%
    </span>
  );
}

// CSV 导出
function exportToCSV(students: RoiStudentRow[]) {
  const headers = [
    '排名',
    '学员ID',
    '围场',
    '负责人',
    '团队',
    '活动次卡',
    '绑定次卡',
    '出席次卡',
    '付费次卡',
    '总次卡',
    '总成本(USD)',
    '收入(USD)',
    'ROI%',
    '风险等级',
    '本月打卡',
    '课耗',
  ];
  const rows = students.map((s, i) => [
    i + 1,
    s.student_id,
    s.enclosure,
    s.cc_name,
    s.team,
    s.activity_cards,
    s.binding_cards,
    s.attendance_cards,
    s.payment_cards,
    s.total_cards,
    s.total_cost_usd,
    s.revenue_usd,
    s.roi ?? '',
    RISK_LEVEL_CONFIG[s.risk_level]?.label ?? s.risk_level,
    s.days_this_month,
    s.lesson_this_month,
  ]);

  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ROI学员排行_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RoiStudentTable({ enclosureFilter }: Props) {
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [sortKey, setSortKey] = useState<'roi' | 'cost' | 'revenue'>('roi');

  const params = new URLSearchParams();
  if (enclosureFilter) params.set('enclosure', enclosureFilter);

  const { data, isLoading, error } = useFilteredSWR<RoiAnalysisResponse>(
    `/api/checkin/roi-analysis${params.toString() ? '?' + params.toString() : ''}`
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.students;
    if (riskFilter !== 'all') {
      list = list.filter((s) => s.risk_level === riskFilter);
    }
    // 排序
    return [...list].sort((a, b) => {
      if (sortKey === 'roi') {
        const ar = a.roi ?? -Infinity;
        const br = b.roi ?? -Infinity;
        return br - ar;
      }
      if (sortKey === 'cost') return b.total_cost_usd - a.total_cost_usd;
      return b.revenue_usd - a.revenue_usd;
    });
  }, [data, riskFilter, sortKey]);

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

  if (!data || data.students.length === 0) {
    return <EmptyState title="暂无学员 ROI 数据" description="当前条件下无参与活动的学员" />;
  }

  return (
    <div className="space-y-3">
      {/* 筛选 + 排序 + 导出 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRiskFilter(opt.id)}
              className={[
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                riskFilter === opt.id
                  ? 'bg-[var(--action-accent)] text-white border-[var(--action-accent)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as 'roi' | 'cost' | 'revenue')}
            className="input-base text-xs py-1 px-2"
          >
            <option value="roi">按 ROI 排序</option>
            <option value="revenue">按收入排序</option>
            <option value="cost">按成本排序</option>
          </select>
          <button
            onClick={() => exportToCSV(filtered)}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            导出 CSV
          </button>
        </div>
      </div>

      {/* 结果数 */}
      <p className="text-xs text-[var(--text-muted)]">
        共 {filtered.length.toLocaleString()} 位学员
        {riskFilter !== 'all' && `（已按${RISK_LEVEL_CONFIG[riskFilter as RiskLevel]?.label}筛选）`}
      </p>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th text-right w-10">#</th>
              <th className="slide-th">学员 ID</th>
              <th className="slide-th">围场</th>
              <th className="slide-th">负责人</th>
              <th className="slide-th">活动卡</th>
              <th className="slide-th">绑定卡</th>
              <th className="slide-th">出席卡</th>
              <th className="slide-th">付费卡</th>
              <th className="slide-th text-right">总成本</th>
              <th className="slide-th text-right">收入</th>
              <th className="slide-th text-right">ROI</th>
              <th className="slide-th">风险等级</th>
              <th className="slide-th text-right">打卡次</th>
              <th className="slide-th text-right">课耗</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-xs text-[var(--text-muted)]">
                  该风险等级下无学员
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr
                  key={s.student_id || i}
                  className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
                >
                  <td className="slide-td text-right text-[var(--text-muted)]">{i + 1}</td>
                  <td className="slide-td font-mono text-xs">{s.student_id || '—'}</td>
                  <td className="slide-td">{s.enclosure || '—'}</td>
                  <td className="slide-td">{s.cc_name || '—'}</td>
                  <td className="slide-td text-right">{s.activity_cards}</td>
                  <td className="slide-td text-right">{s.binding_cards}</td>
                  <td className="slide-td text-right">{s.attendance_cards}</td>
                  <td className="slide-td text-right">{s.payment_cards}</td>
                  <td className="slide-td text-right">{formatUSD(s.total_cost_usd)}</td>
                  <td className="slide-td text-right">{formatUSD(s.revenue_usd)}</td>
                  <td className="slide-td text-right">
                    <RoiCell roi={s.roi} />
                  </td>
                  <td className="slide-td">
                    <RiskBadge level={s.risk_level} />
                  </td>
                  <td className="slide-td text-right">{s.days_this_month}</td>
                  <td className="slide-td text-right">
                    {s.lesson_this_month > 0 ? s.lesson_this_month.toFixed(1) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
