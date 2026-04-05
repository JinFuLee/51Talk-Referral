'use client';

import { useLocale } from 'next-intl';
import { formatRate, formatUSD, formatValue } from '@/lib/utils';
import type { Projection } from '@/lib/types/report';

// ── I18N ──────────────────────────────────────────────────────────────────────
const I18N = {
  zh: {
    title: '全月达标测算',
    subtitle: '以当前效率线性外推 · 敏感性分析',
    projections: [
      { key: 'projected_registrations', label: '预测注册数' },
      { key: 'projected_appointments', label: '预测预约数' },
      { key: 'projected_attendance', label: '预测出席数' },
      { key: 'projected_payments', label: '预测付费数' },
      { key: 'projected_revenue_usd', label: '预测业绩' },
    ],
    revenueGap: '距月目标',
    aspSensitivity: '客单价敏感性',
    aspSensDesc: '客单价每跌 $1 影响业绩',
    dailyAvgSection: '当前日均节奏',
    dailyMetrics: {
      registrations: '注册/天',
      payments: '付费/天',
      revenue_usd: '业绩/天',
    } as Record<string, string>,
    noData: '暂无预测数据',
    noDataDesc: '需要漏斗基础数据和工作日进度',
    metric: '指标',
    projectedValue: '预测值',
    ahead: '可能超额',
    behind: '可能落后',
  },
  en: {
    title: 'Month-End Projection',
    subtitle: 'Linear extrapolation at current pace · Sensitivity',
    projections: [
      { key: 'projected_registrations', label: 'Proj. Registrations' },
      { key: 'projected_appointments', label: 'Proj. Appointments' },
      { key: 'projected_attendance', label: 'Proj. Attendance' },
      { key: 'projected_payments', label: 'Proj. Payments' },
      { key: 'projected_revenue_usd', label: 'Proj. Revenue' },
    ],
    revenueGap: 'Revenue Gap to Target',
    aspSensitivity: 'ASP Sensitivity',
    aspSensDesc: 'Revenue impact per $1 ASP drop',
    dailyAvgSection: 'Current Daily Pace',
    dailyMetrics: {
      registrations: 'Reg/day',
      payments: 'Pay/day',
      revenue_usd: 'Rev/day',
    } as Record<string, string>,
    noData: 'No projection data',
    noDataDesc: 'Requires funnel data and workday progress',
    metric: 'Metric',
    projectedValue: 'Projected',
    ahead: 'Likely surplus',
    behind: 'Likely shortfall',
  },
  'zh-TW': {
    title: '全月達標測算',
    subtitle: '以當前效率線性外推 · 敏感性分析',
    projections: [
      { key: 'projected_registrations', label: '預測註冊數' },
      { key: 'projected_appointments', label: '預測預約數' },
      { key: 'projected_attendance', label: '預測出席數' },
      { key: 'projected_payments', label: '預測付費數' },
      { key: 'projected_revenue_usd', label: '預測業績' },
    ],
    revenueGap: '距月目標',
    aspSensitivity: '客單價敏感性',
    aspSensDesc: '客單價每跌 $1 影響業績',
    dailyAvgSection: '當前日均節奏',
    dailyMetrics: {
      registrations: '註冊/天',
      payments: '付費/天',
      revenue_usd: '業績/天',
    } as Record<string, string>,
    noData: '暫無預測資料',
    noDataDesc: '需要漏斗基礎資料和工作日進度',
    metric: '指標',
    projectedValue: '預測值',
    ahead: '可能超額',
    behind: '可能落後',
  },
  th: {
    title: 'การคาดการณ์สิ้นเดือน',
    subtitle: 'การคาดการณ์เชิงเส้นตามความเร็วปัจจุบัน · การวิเคราะห์ความไว',
    projections: [
      { key: 'projected_registrations', label: 'คาด ลงทะเบียน' },
      { key: 'projected_appointments', label: 'คาด นัดหมาย' },
      { key: 'projected_attendance', label: 'คาด เข้าร่วม' },
      { key: 'projected_payments', label: 'คาด ชำระ' },
      { key: 'projected_revenue_usd', label: 'คาด รายได้' },
    ],
    revenueGap: 'ช่องว่างรายได้ vs เป้า',
    aspSensitivity: 'ความไวของ ASP',
    aspSensDesc: 'ผลกระทบต่อรายได้เมื่อ ASP ลด $1',
    dailyAvgSection: 'ความเร็วเฉลี่ยต่อวันปัจจุบัน',
    dailyMetrics: {
      registrations: 'ลงทะเบียน/วัน',
      payments: 'ชำระ/วัน',
      revenue_usd: 'รายได้/วัน',
    } as Record<string, string>,
    noData: 'ไม่มีข้อมูลคาดการณ์',
    noDataDesc: 'ต้องการข้อมูล funnel และความคืบหน้าวันทำงาน',
    metric: 'ตัวชี้วัด',
    projectedValue: 'คาดการณ์',
    ahead: 'อาจเกินเป้า',
    behind: 'อาจต่ำกว่าเป้า',
  },
} as const;

type Lang = keyof typeof I18N;

const MONEY_KEYS = new Set(['projected_revenue_usd', 'revenue_usd']);

function projFmt(key: string, val: number | null | undefined): string {
  if (val == null) return '—';
  if (MONEY_KEYS.has(key) || key.includes('revenue')) return formatUSD(val);
  if (key.includes('asp')) return formatUSD(val);
  return formatValue(Math.round(val), false);
}

interface Props {
  data: Projection | null | undefined;
  bm_pct: number;
}

export function ProjectionSlide({ data, bm_pct }: Props) {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  if (!data) {
    return (
      <div className="card-base p-5 flex flex-col justify-center items-center gap-2 min-h-[280px]">
        <p className="text-sm font-medium text-secondary-token">{t.noData}</p>
        <p className="text-xs text-muted-token">{t.noDataDesc}</p>
      </div>
    );
  }

  const revGap = data.revenue_gap_to_target;
  const isAhead = (revGap ?? 0) >= 0;

  return (
    <div className="card-base p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold text-primary-token font-display">{t.title}</h3>
        <p className="text-xs text-muted-token mt-0.5">{t.subtitle}</p>
      </div>

      {/* 预测值卡片组 */}
      <div className="overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="slide-thead-row">
              <th className="slide-th slide-th-left">{t.metric}</th>
              <th className="slide-th slide-th-right">{t.projectedValue}</th>
            </tr>
          </thead>
          <tbody>
            {t.projections.map(({ key, label }, i) => {
              const val = data[key as keyof Projection] as number | null | undefined;
              const isMoney = MONEY_KEYS.has(key) || key.includes('revenue');
              return (
                <tr key={key} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                  <td className="slide-td font-medium text-primary-token">{label}</td>
                  <td
                    className={`slide-td text-right font-mono tabular-nums font-semibold ${isMoney ? 'text-accent-token' : 'text-primary-token'}`}
                  >
                    {projFmt(key, val)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 业绩缺口徽章 */}
      {revGap != null && (
        <div
          className={`flex items-center justify-between rounded-lg p-3 ${
            isAhead
              ? 'bg-success-surface border border-success-token'
              : 'bg-danger-surface border border-danger-token'
          }`}
        >
          <span className="text-xs font-semibold text-secondary-token">{t.revenueGap}</span>
          <div className="text-right">
            <span
              className={`text-sm font-bold font-mono ${isAhead ? 'text-success-token' : 'text-danger-token'}`}
            >
              {isAhead ? '+' : ''}
              {formatUSD(revGap)}
            </span>
            <p
              className={`text-[10px] mt-0.5 ${isAhead ? 'text-success-token' : 'text-danger-token'}`}
            >
              {isAhead ? t.ahead : t.behind}
            </p>
          </div>
        </div>
      )}

      {/* ASP 敏感性 */}
      {data.asp_sensitivity_per_dollar != null && (
        <div className="flex items-center justify-between pt-2 border-t border-subtle-token">
          <div>
            <p className="text-xs font-semibold text-muted-token">{t.aspSensitivity}</p>
            <p className="text-[10px] text-muted-token">{t.aspSensDesc}</p>
          </div>
          <span className="text-sm font-bold text-warning-token font-mono">
            -{formatUSD(Math.abs(data.asp_sensitivity_per_dollar))}
          </span>
        </div>
      )}

      {/* 当前日均 */}
      {data.current_daily_avg && Object.keys(data.current_daily_avg).length > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-subtle-token">
          {['registrations', 'payments', 'revenue_usd'].map((key) => {
            const val = data.current_daily_avg[key];
            return (
              <div key={key} className="text-center">
                <p className="text-[10px] text-muted-token">{t.dailyMetrics[key] ?? key}</p>
                <p className="text-xs font-bold font-mono text-primary-token">
                  {key.includes('revenue')
                    ? formatUSD(val)
                    : val != null
                      ? Math.round(val).toLocaleString()
                      : '—'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
