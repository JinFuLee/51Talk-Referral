'use client';

import { useTranslations } from 'next-intl';
import { formatRate, fmtEnc } from '@/lib/utils';
import type { EnclosureCCMetrics } from '@/lib/types/enclosure';
interface EnclosureHeatmapProps {
  metrics: EnclosureCCMetrics[];
}

function heatmapBg(value: number, low: number, high: number): string {
  if (value >= high) return 'bg-success-surface text-success-token';
  if (value >= low) return 'bg-warning-surface text-warning-token';
  return 'bg-danger-surface text-danger-token';
}

export function EnclosureHeatmap({ metrics }: EnclosureHeatmapProps) {
  const t = useTranslations('EnclosureHeatmap');

  if (metrics.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-token">{t('empty')}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="slide-thead-row text-xs">
            <th className="py-1.5 px-2 border-0 text-left">{t('enclosure')}</th>
            <th className="py-1.5 px-2 border-0 text-left">{t('cc')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('students')}</th>
            <th className="py-1.5 px-2 border-0 text-center">{t('participationRate')}</th>
            <th className="py-1.5 px-2 border-0 text-center">{t('cargoRatio')}</th>
            <th className="py-1.5 px-2 border-0 text-center">{t('checkinRate')}</th>
            <th className="py-1.5 px-2 border-0 text-center">{t('ccReach')}</th>
            <th className="py-1.5 px-2 border-0 text-center">{t('ssReach')}</th>
            <th className="py-1.5 px-2 border-0 text-center">{t('lpReach')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('registrations')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('payments')}</th>
            <th className="py-1.5 px-2 border-0 text-right">{t('revenue')}</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((r, i) => (
            <tr key={i} className="even:bg-subtle">
              <td className="py-1 px-2 text-xs text-secondary-token">{fmtEnc(r.enclosure)}</td>
              <td className="py-1 px-2 text-xs font-medium">{r.cc_name}</td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                {(r.students ?? 0).toLocaleString()}
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.participation_rate, 0.1, 0.2)}`}
                >
                  {formatRate(r.participation_rate)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.cargo_ratio, 0.05, 0.1)}`}
                >
                  {formatRate(r.cargo_ratio)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.checkin_rate, 0.3, 0.5)}`}
                >
                  {formatRate(r.checkin_rate)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.cc_reach_rate, 0.3, 0.5)}`}
                >
                  {formatRate(r.cc_reach_rate)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.ss_reach_rate ?? 0, 0.3, 0.5)}`}
                >
                  {formatRate(r.ss_reach_rate ?? 0)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${heatmapBg(r.lp_reach_rate ?? 0, 0.3, 0.5)}`}
                >
                  {formatRate(r.lp_reach_rate ?? 0)}
                </span>
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                {(r.registrations ?? 0).toLocaleString()}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                {(r.payments ?? 0).toLocaleString()}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">
                ${(r.revenue_usd ?? 0).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
