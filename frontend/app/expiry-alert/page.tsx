'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ExpiryAlertSummary, ExpiryAlertItem } from '@/lib/types/enclosure-ss-lp';

/* ── 紧急度分层颜色 ──────────────────────────────────────── */

function urgencyLevel(days: number | null): 'urgent' | 'warning' | 'watch' {
  if (days === null) return 'watch';
  if (days <= 7) return 'urgent';
  if (days <= 14) return 'warning';
  return 'watch';
}

const URGENCY_CONFIG = {
  urgent: {
    label: '紧急',
    sub: '≤7天',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    count: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    label: '预警',
    sub: '8~14天',
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-700',
    count: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  watch: {
    label: '关注',
    sub: '15~30天',
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-700',
    count: 'text-green-600',
    badge: 'bg-green-100 text-green-700',
  },
} as const;

/* ── 摘要卡片区 ──────────────────────────────────────────── */

function SummaryCards({ summary }: { summary: ExpiryAlertSummary }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {(['urgent', 'warning', 'watch'] as const).map((level) => {
        const cfg = URGENCY_CONFIG[level];
        const count =
          level === 'urgent'
            ? summary.urgent_count
            : level === 'warning'
              ? summary.warning_count
              : summary.watch_count;
        return (
          <div key={level} className={`rounded-lg border p-4 flex flex-col gap-1 ${cfg.bg}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.sub}
              </span>
            </div>
            <div className={`text-3xl font-bold font-mono tabular-nums ${cfg.count}`}>
              {(count ?? 0).toLocaleString()}
            </div>
            <div className={`text-xs ${cfg.text} opacity-70`}>名学员次卡即将到期</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 失联天数颜色 ──────────────────────────────────────────── */

function contactDaysBadge(days: number | null) {
  if (days === null) return <span className="text-[var(--text-muted)]">无记录</span>;
  if (days <= 7)
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-700">
        {days}天
      </span>
    );
  if (days <= 14)
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-yellow-100 text-yellow-700">
        {days}天
      </span>
    );
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
      {days}天
    </span>
  );
}

const RISK_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-green-100 text-green-700',
};
const RISK_LABEL: Record<string, string> = { high: '高风险', medium: '中风险', low: '低风险' };

/* ── 到期预警表格 ──────────────────────────────────────────── */

function ExpiryTable({ items }: { items: ExpiryAlertItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState title="30天内无到期学员" description="目前没有次卡即将到期的学员，请定期检查" />
    );
  }

  const sorted = [...items].sort((a, b) => (a.days_to_expiry ?? 999) - (b.days_to_expiry ?? 999));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="slide-thead-row">
            <th className="slide-th slide-th-left py-2 px-2">风险</th>
            <th className="slide-th slide-th-left py-2 px-2">学员 ID</th>
            <th className="slide-th slide-th-left py-2 px-2">围场段</th>
            <th className="slide-th slide-th-left py-2 px-2">CC</th>
            <th className="slide-th slide-th-right py-2 px-2">剩余天数</th>
            <th className="slide-th slide-th-right py-2 px-2">失联天数</th>
            <th className="slide-th slide-th-right py-2 px-2">当前次卡</th>
            <th className="slide-th slide-th-right py-2 px-2">本月注册</th>
            <th className="slide-th slide-th-right py-2 px-2">本月付费</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => {
            const level = urgencyLevel(item.days_to_expiry);
            const cfg = URGENCY_CONFIG[level];
            const rl = item.risk_level ?? 'low';
            return (
              <tr
                key={`${item.stdt_id}-${i}`}
                className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}
              >
                <td className="slide-td py-1.5 px-2">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${RISK_BADGE[rl] ?? ''}`}
                  >
                    {RISK_LABEL[rl] ?? '—'}
                  </span>
                </td>
                <td className="slide-td py-1.5 px-2 font-mono">{item.stdt_id}</td>
                <td className="slide-td py-1.5 px-2 text-[var(--text-secondary)]">
                  {item.enclosure ?? '—'}
                </td>
                <td className="slide-td py-1.5 px-2 font-medium">{item.cc_name ?? '—'}</td>
                <td className="slide-td py-1.5 px-2 text-right">
                  {item.days_to_expiry !== null ? (
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${cfg.badge}`}
                    >
                      {item.days_to_expiry}天
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="slide-td py-1.5 px-2 text-right">
                  {contactDaysBadge(item.days_since_last_contact ?? null)}
                </td>
                <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                  {item.current_cards ?? '—'}
                </td>
                <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                  {item.monthly_referral_registrations ?? '—'}
                </td>
                <td className="slide-td py-1.5 px-2 text-right font-mono tabular-nums">
                  {item.monthly_referral_payments ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── 主页面 ───────────────────────────────────────────────── */

export default function ExpiryAlertPage() {
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    mutate: mutateSummary,
  } = useSWR<ExpiryAlertSummary>('/api/students/expiry-alert/summary', swrFetcher);

  const {
    data: items,
    isLoading: itemsLoading,
    error: itemsError,
    mutate: mutateItems,
  } = useSWR<ExpiryAlertItem[]>('/api/students/expiry-alert?days=30', swrFetcher);

  const isLoading = summaryLoading || itemsLoading;
  const error = summaryError || itemsError;
  function handleRetry() {
    void mutateSummary();
    void mutateItems();
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">次卡到期预警</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          30 天内次卡即将到期学员 · 按紧急度分层展示
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <EmptyState
          title="数据加载失败"
          description="请检查后端服务是否正常运行，或数据源是否已上传"
          action={{ label: '重试', onClick: handleRetry }}
        />
      ) : (
        <>
          {/* 摘要卡片 */}
          {summary && <SummaryCards summary={summary} />}

          {/* 学员列表 */}
          <Card title={`到期学员明细（30天内，共 ${summary?.total ?? 0} 人）`}>
            <ExpiryTable items={items ?? []} />
          </Card>
        </>
      )}
    </div>
  );
}
