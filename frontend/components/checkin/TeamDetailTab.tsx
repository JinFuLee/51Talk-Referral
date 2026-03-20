'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';

// ── 团队列表 ──────────────────────────────────────────────────────────────────
const TEAM_OPTIONS = [
  { value: 'CC01Team', label: 'CC01' },
  { value: 'CC02Team', label: 'CC02' },
  { value: 'CC03Team', label: 'CC03' },
  { value: 'CC04Team', label: 'CC04' },
  { value: 'CC05Team', label: 'CC05' },
  { value: 'CC06Team', label: 'CC06' },
  { value: 'SS', label: 'SS' },
  { value: 'LP', label: 'LP' },
  { value: '运营', label: '运营' },
];

// ── 类型定义 ──────────────────────────────────────────────────────────────────
interface CheckinPersonRow {
  name: string;
  valid_students: number;
  checked_in: number;
  checkin_rate: number;
  /** 按月打卡明细，键为 "M0"/"M1"/... */
  monthly: Record<string, number | null>;
}

interface TeamDetailResponse {
  team: string;
  members: CheckinPersonRow[];
  summary: {
    total_students: number;
    total_checked_in: number;
    checkin_rate: number;
    monthly: Record<string, number | null>;
  };
  /** 月份标签列表，如 ["M0","M1","M2",...] */
  month_labels: string[];
}

// ── 打卡率颜色编码 ─────────────────────────────────────────────────────────────
function rateColor(rate: number): string {
  if (rate >= 0.6) return 'text-green-600 font-semibold';
  if (rate >= 0.4) return 'text-yellow-600 font-semibold';
  return 'text-red-600 font-semibold';
}

function fmtRate(rate: number | null | undefined): string {
  if (rate == null) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

// ── 组件 ──────────────────────────────────────────────────────────────────────
export function TeamDetailTab() {
  const [selectedTeam, setSelectedTeam] = useState<string>(TEAM_OPTIONS[0].value);

  const { data, error, isLoading } = useSWR<TeamDetailResponse>(
    `/api/checkin/team-detail?team=${encodeURIComponent(selectedTeam)}`,
    swrFetcher,
    { refreshInterval: 30_000 }
  );

  const monthLabels = data?.month_labels ?? [];
  const members = data?.members ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-3">
      {/* 团队选择器 */}
      <div className="flex flex-wrap gap-1.5">
        {TEAM_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelectedTeam(opt.value)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedTeam === opt.value
                ? 'bg-[var(--n-800)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 加载态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 gap-2 text-sm text-[var(--text-muted)]">
          <Spinner size="sm" />
          <span>加载中…</span>
        </div>
      )}

      {/* 错误态 */}
      {error && !isLoading && (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">
          数据加载失败，请稍后刷新重试
        </div>
      )}

      {/* 空态 */}
      {!isLoading && !error && members.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">
          暂无{TEAM_OPTIONS.find((o) => o.value === selectedTeam)?.label ?? selectedTeam}
          团队打卡数据
          <p className="mt-1 text-xs">请确认已上传围场过程数据（D2）并运行分析</p>
        </div>
      )}

      {/* 数据表格 */}
      {!isLoading && !error && members.length > 0 && (
        <div className="overflow-x-auto rounded border border-slate-100">
          <table className="w-full text-sm">
            {/* 表头 */}
            <thead>
              <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
                <th className="py-1.5 px-2 border-0 text-center whitespace-nowrap w-10">排名</th>
                <th className="py-1.5 px-2 border-0 text-left whitespace-nowrap">销售</th>
                <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">有效学员</th>
                <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">已打卡</th>
                <th className="py-1.5 px-2 border-0 text-right whitespace-nowrap">打卡率</th>
                {monthLabels.map((m) => (
                  <th
                    key={m}
                    className="py-1.5 px-2 border-0 text-right whitespace-nowrap min-w-[52px]"
                  >
                    {m}
                  </th>
                ))}
              </tr>
            </thead>

            {/* 数据行 */}
            <tbody>
              {members.map((row, i) => (
                <tr key={row.name} className="even:bg-[var(--bg-subtle)]">
                  <td className="py-1 px-2 text-xs text-center text-[var(--text-muted)] font-mono tabular-nums">
                    {i + 1}
                  </td>
                  <td className="py-1 px-2 text-xs font-medium whitespace-nowrap">{row.name}</td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {fmtNum(row.valid_students)}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                    {fmtNum(row.checked_in)}
                  </td>
                  <td
                    className={`py-1 px-2 text-xs text-right font-mono tabular-nums ${rateColor(row.checkin_rate)}`}
                  >
                    {fmtRate(row.checkin_rate)}
                  </td>
                  {monthLabels.map((m) => {
                    const val = row.monthly[m];
                    return (
                      <td
                        key={m}
                        className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]"
                      >
                        {fmtRate(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* 汇总行 */}
            {summary && (
              <tfoot>
                <tr className="bg-slate-100 font-semibold border-t border-slate-200">
                  <td className="py-1.5 px-2 text-xs text-center text-[var(--text-muted)]">—</td>
                  <td className="py-1.5 px-2 text-xs">团队合计</td>
                  <td className="py-1.5 px-2 text-xs text-right font-mono tabular-nums">
                    {fmtNum(summary.total_students)}
                  </td>
                  <td className="py-1.5 px-2 text-xs text-right font-mono tabular-nums">
                    {fmtNum(summary.total_checked_in)}
                  </td>
                  <td
                    className={`py-1.5 px-2 text-xs text-right font-mono tabular-nums ${rateColor(summary.checkin_rate)}`}
                  >
                    {fmtRate(summary.checkin_rate)}
                  </td>
                  {monthLabels.map((m) => {
                    const val = summary.monthly[m];
                    return (
                      <td key={m} className="py-1.5 px-2 text-xs text-right font-mono tabular-nums">
                        {fmtRate(val)}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 图例说明 */}
      {!isLoading && !error && members.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500 opacity-70" />
            ≥60% 达标
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400 opacity-70" />
            40–60% 接近
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400 opacity-70" />
            &lt;40% 落后
          </span>
          <span className="ml-auto">M0 = 当月，M1 = 上月，M2 = 上上月…</span>
        </div>
      )}
    </div>
  );
}
