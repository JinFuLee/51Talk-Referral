'use client';

import { useTranslations } from 'next-intl';
import { formatUSD, formatValue } from '@/lib/utils';
import type { GapDashboard } from '@/lib/types/report';
type Lang = string;

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
  if (val == null) return 'text-muted-token';
  if (val >= 0) return 'text-success-token';
  if (val >= -10) return 'text-warning-token';
  return 'text-danger-token';
}

interface Props {
  data: GapDashboard | null | undefined;
  /** 月度达标视角的 gap 数据（actual - target，无 BM 调整） */
  monthlyData?: GapDashboard | null;
}

export function GapDashboardSlide({ data, monthlyData }: Props) {
  const t = useTranslations('GapDashboardSlide');

  if (!data) {
    return (
      <div className="card-base p-5 flex flex-col justify-center items-center gap-2 min-h-[280px]">
        <p className="text-sm font-medium text-secondary-token">{t('noData')}</p>
        <p className="text-xs text-muted-token">{t('noDataDesc')}</p>
      </div>
    );
  }

  // BM 视角数据
  const bmData = data;
  // 月度视角数据（优先用 monthlyData，无则 fallback 到 data）
  const monthlyViewData = monthlyData ?? data;
  const { gaps: monthlyGaps, channel_targets } = monthlyViewData;
  const channelKeys = Object.keys(channel_targets ?? {});

  function renderGapCard(key: GapKey, val: number | null | undefined, compact = false) {
    const isNeg = (val ?? 0) < 0;
    const label = isNeg ? t('shortfall') : t('surplus');
    const isRevOrAsp = key === 'revenue_gap' || key === 'asp_gap';
    return (
      <div
        key={key}
        className={`rounded-lg border ${compact ? 'p-2' : 'p-3'} ${
          isNeg ? 'bg-danger-surface border-danger-token' : 'bg-success-surface border-subtle-token'
        }`}
      >
        <p className="text-[9px] font-semibold text-muted-token uppercase tracking-wide mb-1">
          {t(`gapItems.${key}`)}
        </p>
        <p
          className={`${compact ? 'text-sm' : 'text-base'} font-bold font-mono tabular-nums ${gapStatusColor(val)}`}
        >
          {isNeg ? '▼ ' : isRevOrAsp ? '+' : '+'}
          {formatGapValue(key, val)}
        </p>
        <p className={`text-[9px] mt-0.5 ${isNeg ? 'text-danger-token' : 'text-success-token'}`}>
          {label}
        </p>
      </div>
    );
  }

  return (
    <div className="card-base p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold text-primary-token font-display">{t('title')}</h3>
        <p className="text-xs text-muted-token mt-0.5">{t('subtitle')}</p>
      </div>

      {/* Section 1: 月度达标视角（主要） */}
      <div>
        <p className="text-[10px] font-semibold text-secondary-token uppercase tracking-wide mb-2">
          {t('monthlyDesc')}
        </p>
        {!monthlyData ? (
          <p className="text-xs text-muted-token py-2">{t('noData')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {GAP_KEYS.map((key) => renderGapCard(key, monthlyGaps[key]))}
          </div>
        )}

        {/* 渠道缺口表格 - 仅月度视角 */}
        {channelKeys.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-muted-token uppercase tracking-wide mb-2">
              {t('channelGaps')}
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left">{t('channel')}</th>
                  <th className="slide-th slide-th-right">{t('target')}</th>
                  <th className="slide-th slide-th-right">{t('gap')}</th>
                </tr>
              </thead>
              <tbody>
                {channelKeys.map((ch, i) => {
                  const tgt = channel_targets[ch];
                  const gapVal = monthlyGaps.channel_lead_gaps?.[ch];
                  return (
                    <tr key={ch} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                      <td className="slide-td font-medium text-primary-token">{ch}</td>
                      <td className="slide-td text-right font-mono tabular-nums text-muted-token">
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

      {/* Section 2: BM 进度视角（次要，更紧凑） */}
      <div className="pt-3 border-t border-subtle-token">
        <p className="text-[10px] font-semibold text-secondary-token uppercase tracking-wide mb-2">
          {t('bmDesc')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {GAP_KEYS.map((key) => renderGapCard(key, bmData.gaps[key], true))}
        </div>
      </div>
    </div>
  );
}
