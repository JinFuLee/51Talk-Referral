'use client';

import { formatUSD, formatValue } from '@/lib/utils';
import type { GapDashboard } from '@/lib/types/report';

// ── I18N ──────────────────────────────────────────────────────────────────────
const I18N = {
  zh: {
    title: '缺口仪表盘',
    subtitle: '各类缺口数值 · 从业绩倒推到注册数',
    gapItems: {
      revenue_gap: '业绩缺口',
      asp_gap: '客单价缺口',
      bill_gap: '付费缺口（笔）',
      showup_gap: '出席缺口（人）',
      appt_gap: '预约缺口（人）',
      lead_gap: '注册缺口（人）',
    } as Record<string, string>,
    channelTargets: '渠道口径目标',
    channelGaps: '各渠道注册缺口',
    noData: '暂无数据',
    noDataDesc: '请上传本月 Excel 数据源',
    channel: '渠道',
    target: '目标',
    gap: '缺口',
    shortfall: '缺口',
    surplus: '超额',
  },
  en: {
    title: 'Gap Dashboard',
    subtitle: 'Key gaps · Revenue down to registrations',
    gapItems: {
      revenue_gap: 'Revenue Gap',
      asp_gap: 'ASP Gap',
      bill_gap: 'Payment Gap (count)',
      showup_gap: 'Attendance Gap (pax)',
      appt_gap: 'Appointment Gap (pax)',
      lead_gap: 'Registration Gap (pax)',
    } as Record<string, string>,
    channelTargets: 'Channel Targets',
    channelGaps: 'Channel Registration Gaps',
    noData: 'No data available',
    noDataDesc: "Please upload this month's Excel data source",
    channel: 'Channel',
    target: 'Target',
    gap: 'Gap',
    shortfall: 'Short',
    surplus: 'Surplus',
  },
} as const;

type Lang = keyof typeof I18N;

const GAP_KEYS = [
  'revenue_gap',
  'asp_gap',
  'bill_gap',
  'showup_gap',
  'appt_gap',
  'lead_gap',
] as const;
type GapKey = (typeof GAP_KEYS)[number];

function formatGapValue(key: GapKey, val: number | null | undefined): string {
  if (val == null) return '—';
  const isRevOrAsp = key === 'revenue_gap' || key === 'asp_gap';
  if (isRevOrAsp) return formatUSD(val);
  return formatValue(Math.ceil(Math.abs(val)), false);
}

function gapStatusColor(val: number | null | undefined): string {
  if (val == null) return 'text-[var(--text-muted)]';
  if (val >= 0) return 'text-emerald-800';
  if (val >= -10) return 'text-amber-800';
  return 'text-red-700';
}

interface Props {
  data: GapDashboard | null | undefined;
  lang: Lang;
}

export function GapDashboardSlide({ data, lang }: Props) {
  const t = I18N[lang];

  if (!data) {
    return (
      <div className="card-base p-5 flex flex-col justify-center items-center gap-2 min-h-[280px]">
        <p className="text-sm font-medium text-[var(--text-secondary)]">{t.noData}</p>
        <p className="text-xs text-[var(--text-muted)]">{t.noDataDesc}</p>
      </div>
    );
  }

  const { gaps, channel_targets } = data;
  const channelKeys = Object.keys(channel_targets ?? {});

  return (
    <div className="card-base p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-display">{t.title}</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.subtitle}</p>
      </div>

      {/* 主缺口卡片组 */}
      <div className="grid grid-cols-2 gap-3">
        {GAP_KEYS.map((key) => {
          const val = gaps[key];
          const isNeg = (val ?? 0) < 0;
          const label = isNeg ? t.shortfall : t.surplus;
          const isRevOrAsp = key === 'revenue_gap' || key === 'asp_gap';
          return (
            <div
              key={key}
              className={`rounded-lg p-3 border ${
                isNeg
                  ? 'bg-red-50 border-red-200'
                  : 'bg-[var(--color-success-surface)] border-[var(--border-subtle)]'
              }`}
            >
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                {t.gapItems[key]}
              </p>
              <p className={`text-base font-bold font-mono tabular-nums ${gapStatusColor(val)}`}>
                {isNeg ? '▼ ' : isRevOrAsp ? '+' : '+'}
                {formatGapValue(key, val)}
              </p>
              <p className={`text-[10px] mt-0.5 ${isNeg ? 'text-red-600' : 'text-emerald-700'}`}>
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {/* 各渠道注册缺口表格 */}
      {channelKeys.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
            {t.channelGaps}
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">{t.channel}</th>
                <th className="slide-th slide-th-right">{t.target}</th>
                <th className="slide-th slide-th-right">{t.gap}</th>
              </tr>
            </thead>
            <tbody>
              {channelKeys.map((ch, i) => {
                const tgt = channel_targets[ch];
                const gapVal = gaps.channel_lead_gaps?.[ch];
                return (
                  <tr key={ch} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="slide-td font-medium text-[var(--text-primary)]">{ch}</td>
                    <td className="slide-td text-right font-mono tabular-nums text-[var(--text-muted)]">
                      {tgt != null ? tgt.toLocaleString() : '—'}
                    </td>
                    <td
                      className={`slide-td text-right font-mono tabular-nums ${gapStatusColor(gapVal)}`}
                    >
                      {gapVal != null
                        ? `${gapVal >= 0 ? '+' : ''}${Math.ceil(gapVal).toLocaleString()}`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
