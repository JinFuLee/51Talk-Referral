'use client';

import { useLocale } from 'next-intl';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { CHART_PALETTE } from '@/lib/chart-palette';
import type { ConversionFunnelItem } from '@/lib/types/checkin-student';

// ── 内联 I18N ────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    noData: '暂无转化漏斗数据',
    freqBand: '频段：',
    regRate: '有推荐注册率：',
    payRate: '有推荐付费率：',
    avgStats: (reg: string, pay: string) => `人均注册 ${reg} | 人均付费 ${pay}`,
    studentCount: (n: string) => `该频段学员数：${n}`,
    calloutText: (band: string, mult: string) =>
      `${band} 打卡学员推荐注册率是零打卡的 ${mult}x — 打卡频次是推荐转化的强预测因子`,
    regBarName: '有推荐注册率 %',
    payBarName: '有推荐付费率 %',
  },
  'zh-TW': {
    noData: '暫無轉化漏斗資料',
    freqBand: '頻段：',
    regRate: '有推薦注冊率：',
    payRate: '有推薦付費率：',
    avgStats: (reg: string, pay: string) => `人均注冊 ${reg} | 人均付費 ${pay}`,
    studentCount: (n: string) => `該頻段學員數：${n}`,
    calloutText: (band: string, mult: string) =>
      `${band} 打卡學員推薦注冊率是零打卡的 ${mult}x — 打卡頻次是推薦轉化的強預測因子`,
    regBarName: '有推薦注冊率 %',
    payBarName: '有推薦付費率 %',
  },
  en: {
    noData: 'No conversion funnel data',
    freqBand: 'Band: ',
    regRate: 'Has Referral Reg. Rate: ',
    payRate: 'Has Referral Paid Rate: ',
    avgStats: (reg: string, pay: string) => `Avg Reg ${reg} | Avg Paid ${pay}`,
    studentCount: (n: string) => `Students in band: ${n}`,
    calloutText: (band: string, mult: string) =>
      `${band} check-in students have ${mult}x the referral reg. rate vs zero check-ins — frequency is a strong predictor of referral conversion`,
    regBarName: 'Has Referral Reg. %',
    payBarName: 'Has Referral Paid %',
  },
  th: {
    noData: 'ไม่มีข้อมูลช่องทางแปลง',
    freqBand: 'ช่วงความถี่: ',
    regRate: 'อัตราการแนะนำลงทะเบียน: ',
    payRate: 'อัตราการแนะนำชำระ: ',
    avgStats: (reg: string, pay: string) => `เฉลี่ยลงทะเบียน ${reg} | เฉลี่ยชำระ ${pay}`,
    studentCount: (n: string) => `นักเรียนในช่วงนี้: ${n}`,
    calloutText: (band: string, mult: string) =>
      `นักเรียนที่เช็คอิน ${band} มีอัตราแนะนำ ${mult}x เทียบกับผู้ที่ไม่เช็คอิน — ความถี่เป็นตัวทำนายการแปลงที่แข็งแกร่ง`,
    regBarName: 'มีอัตราลงทะเบียนแนะนำ %',
    payBarName: 'มีอัตราชำระแนะนำ %',
  },
} as const;

type Locale = keyof typeof I18N;
function useT() {
  const locale = useLocale();
  return I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
}

interface ConversionFunnelProofProps {
  /** 打卡频段×转化漏斗交叉数据，4 段（0次/1-2次/3-4次/5-6次） */
  data: ConversionFunnelItem[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CustomTooltipProps extends TooltipProps<number, string> {
  labels: Record<string, any>;
}

/** 自定义 Tooltip */
function CustomTooltip({ active, payload, label, labels }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload as ConversionFunnelItem | undefined;
  if (!item) return null;

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1 mb-1">
        {labels.freqBand}
        {label}
      </p>
      <p className="text-[var(--text-secondary)]">
        {labels.regRate}
        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)] ml-1">
          {((item.has_registration_pct ?? 0) * 100).toFixed(1)}%
        </span>
      </p>
      <p className="text-[var(--text-secondary)]">
        {labels.payRate}
        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)] ml-1">
          {((item.has_payment_pct ?? 0) * 100).toFixed(1)}%
        </span>
      </p>
      <p className="text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-1 mt-1">
        {labels.avgStats(
          (item.avg_registrations ?? 0).toFixed(2),
          (item.avg_payments ?? 0).toFixed(2)
        )}
      </p>
      <p className="text-[var(--text-muted)]">
        {labels.studentCount((item.students ?? 0).toLocaleString())}
      </p>
    </div>
  );
}

/**
 * 三级转化漏斗证明图
 *
 * 用分组柱图展示不同打卡频段学员的推荐转化率差异，
 * 证明"打卡越多 → 推荐率越高"的正相关关系。
 * 顶部 callout banner 显示倍率差异（5-6次 vs 0次）。
 *
 * 使用示例：
 * <ConversionFunnelProof data={analysis.conversion_funnel} />
 */
export function ConversionFunnelProof({ data }: ConversionFunnelProofProps) {
  const t = useT();

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-[var(--text-muted)]">
        {t.noData}
      </div>
    );
  }

  // 计算倍率：最高频段 vs 0 次频段
  const highFreqItem = data[data.length - 1];
  const zeroItem = data.find((d) => d.band === '0次') ?? data[0];
  const multiplier =
    zeroItem && zeroItem.has_registration_pct > 0 && highFreqItem
      ? highFreqItem.has_registration_pct / zeroItem.has_registration_pct
      : null;

  const chartData = data.map((item) => ({
    ...item,
    reg_pct_display: parseFloat(((item.has_registration_pct ?? 0) * 100).toFixed(1)),
    pay_pct_display: parseFloat(((item.has_payment_pct ?? 0) * 100).toFixed(1)),
  }));

  return (
    <div className="space-y-3">
      {/* Callout Banner */}
      {multiplier !== null && multiplier > 1.5 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-success-surface)] border border-[var(--color-success)] text-xs text-[var(--color-success)]">
          <span className="text-base" aria-hidden="true">
            💡
          </span>
          <span
            dangerouslySetInnerHTML={{
              __html: t.calloutText(
                `<strong>${highFreqItem.band}</strong>`,
                `<strong class="font-mono tabular-nums text-[var(--color-success)]">${multiplier.toFixed(1)}</strong>`
              ),
            }}
          />
        </div>
      )}

      {/* 分组柱图 */}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          barCategoryGap="25%"
          barGap={2}
        >
          <XAxis
            dataKey="band"
            tick={{ fontSize: 11, fill: CHART_PALETTE.axisLabel }}
            axisLine={{ stroke: CHART_PALETTE.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: CHART_PALETTE.axisTick }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
            width={40}
          />
          <Tooltip
            content={(props: TooltipProps<number, string>) => (
              <CustomTooltip {...props} labels={t as Record<string, any>} />
            )}
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            wrapperStyle={{ fontSize: 11, color: CHART_PALETTE.axisLabel }}
          />
          <Bar
            dataKey="reg_pct_display"
            name={t.regBarName}
            fill={CHART_PALETTE.c2}
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="pay_pct_display"
            name={t.payBarName}
            fill={CHART_PALETTE.c4}
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
