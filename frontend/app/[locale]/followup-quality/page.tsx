'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRate } from '@/lib/utils';

/* ── 类型定义 ─────────────────────────────────────────────── */

interface FollowupSummary {
  total_students: number;
  high_quality_pct: number;
  low_quality_pct: number;
  suspicious_pct: number;
  avg_lost_days: number;
  lost_contact_count: number;
}

interface FollowupPerson {
  cc_name: string;
  cc_group: string;
  students: number;
  avg_call_duration_sec: number;
  high_quality_count: number;
  low_quality_count: number;
  suspicious_count: number;
  avg_lost_days: number;
  lost_14d_count: number;
  avg_note_delay_days: number;
  total_calls: number;
}

interface FollowupQualityResponse {
  summary: FollowupSummary;
  by_person: FollowupPerson[];
}

/* ── 工具函数 ─────────────────────────────────────────────── */

type SortKey = keyof FollowupPerson;

function fmt(v: number | null | undefined, decimals = 0): string {
  if (v == null) return '—';
  if (decimals > 0) return v.toFixed(decimals);
  return v.toLocaleString();
}

function fmtDuration(sec: number | null | undefined): string {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function pct(v: number | null | undefined): string {
  return formatRate(v);
}

/* ── Tab 按钮 ─────────────────────────────────────────────── */

type TabKey = 'cc' | 'ss' | 'lp';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'cc', label: 'CC 前端' },
  { key: 'ss', label: 'SS 后端' },
  { key: 'lp', label: 'LP 服务' },
];

/* ── CC 内容 ─────────────────────────────────────────────── */

function CCContent() {
  const { data, isLoading, error, mutate } = useSWR<FollowupQualityResponse>(
    '/api/analysis/followup-quality?role=cc',
    swrFetcher
  );

  const [sortKey, setSortKey] = useState<SortKey>('students');
  const [sortAsc, setSortAsc] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="数据加载失败"
        description="无法获取跟进质量数据，请检查后端服务是否正常运行"
        action={{ label: '重试', onClick: () => mutate() }}
      />
    );
  }

  const persons = data?.by_person ?? [];
  const summary = data?.summary;

  if (persons.length === 0) {
    return (
      <EmptyState
        title="暂无跟进数据"
        description="当前数据源缺少通话记录，上传含通话日志的数据文件后自动解析"
      />
    );
  }

  const sorted = [...persons].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortAsc ? av - bv : bv - av;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span className="text-[var(--text-muted)] ml-0.5">⇅</span>;
    return <span className="text-[var(--text-primary)] ml-0.5">{sortAsc ? '↑' : '↓'}</span>;
  }

  return (
    <div className="space-y-3">
      {/* 汇总卡片 */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card title="">
            <div className="text-center py-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">高质量通话占比</p>
              <p className="text-3xl font-bold text-emerald-800">{pct(summary.high_quality_pct)}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">通话时长 ≥120s</p>
            </div>
          </Card>
          <Card title="">
            <div className="text-center py-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">可疑通话占比</p>
              <p className="text-3xl font-bold text-amber-800">{pct(summary.suspicious_pct)}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">通话时长 &lt;30s</p>
            </div>
          </Card>
          <Card title="">
            <div className="text-center py-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">失联 &gt;14 天</p>
              <p className="text-3xl font-bold text-[var(--color-danger)]">
                {(summary.lost_contact_count ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                人 / 共 {(summary.total_students ?? 0).toLocaleString()} 名学员
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* CC 个人明细表 */}
      <Card title="CC 个人跟进质量明细">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th text-center w-10">排名</th>
                <th className="slide-th text-left">CC 名称</th>
                <th className="slide-th text-left">组别</th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('students')}
                >
                  学员数{sortIcon('students')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('avg_call_duration_sec')}
                >
                  均接通时长{sortIcon('avg_call_duration_sec')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('high_quality_count')}
                >
                  高质量数{sortIcon('high_quality_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('suspicious_count')}
                >
                  可疑数{sortIcon('suspicious_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('avg_lost_days')}
                >
                  均失联天数{sortIcon('avg_lost_days')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('lost_14d_count')}
                >
                  失联&gt;14天{sortIcon('lost_14d_count')}
                </th>
                <th
                  className="slide-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('total_calls')}
                >
                  总拨打次数{sortIcon('total_calls')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const highRate = p.students > 0 ? p.high_quality_count / p.students : 0;
                const suspRate = p.students > 0 ? p.suspicious_count / p.students : 0;
                return (
                  <tr key={p.cc_name} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td text-center text-[var(--text-muted)] font-mono">
                      {i + 1}
                    </td>
                    <td className="slide-td font-medium">{p.cc_name}</td>
                    <td className="slide-td text-[var(--text-secondary)] text-xs">{p.cc_group}</td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {(p.students ?? 0).toLocaleString()}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      {fmtDuration(p.avg_call_duration_sec)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      <span
                        className={
                          highRate >= 0.6
                            ? 'text-emerald-800 font-semibold'
                            : highRate >= 0.4
                              ? 'text-amber-800'
                              : 'text-[var(--color-danger)]'
                        }
                      >
                        {p.high_quality_count}
                      </span>
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      <span
                        className={
                          suspRate > 0.3
                            ? 'text-[var(--color-danger)] font-semibold'
                            : suspRate > 0.1
                              ? 'text-amber-800'
                              : 'text-[var(--text-secondary)]'
                        }
                      >
                        {p.suspicious_count}
                      </span>
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {fmt(p.avg_lost_days, 1)}
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums">
                      <span
                        className={
                          p.lost_14d_count > 5
                            ? 'text-[var(--color-danger)] font-semibold'
                            : 'text-[var(--text-secondary)]'
                        }
                      >
                        {p.lost_14d_count}
                      </span>
                    </td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--text-muted)]">
                      {(p.total_calls ?? 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2 px-1">
          高质量：接通时长 ≥120s · 可疑：接通时长 &lt;30s · 点击列标题排序
        </p>
      </Card>
    </div>
  );
}

/* ── 主页面 ─────────────────────────────────────────────── */

export default function FollowupQualityPage() {
  const [tab, setTab] = useState<TabKey>('cc');

  return (
    <div className="space-y-3">
      {/* 页头 */}
      <div>
        <h1 className="page-title">跟进质量分析</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          通话质量分层 · 失联风险预警 · 跟进行为评估
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          高质量：通话 ≥120s · 可疑：通话 &lt;30s · 失联：最后联系距今天数
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 border-b border-[var(--border-default)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
              tab === t.key
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-b-0 border-[var(--border-default)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {tab === 'cc' && <CCContent />}
      {tab === 'ss' && (
        <EmptyState
          title="SS 跟进数据暂未接入"
          description="SS 后端跟进数据等数据源补充后自动启用，无需手动配置"
        />
      )}
      {tab === 'lp' && (
        <EmptyState
          title="LP 跟进数据暂未接入"
          description="LP 服务跟进数据等数据源补充后自动启用，无需手动配置"
        />
      )}
    </div>
  );
}
