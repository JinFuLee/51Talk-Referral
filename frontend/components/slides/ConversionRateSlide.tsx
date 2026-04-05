'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
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
import type { FunnelResult } from '@/lib/types/funnel';
import type { SlideProps } from '@/lib/presentation/types';

const I18N = {
  zh: {
    title: '转化率 × 月达成',
    subtitle: '各环节实际转化率 vs 目标',
    section: '漏斗分析',
    loading_failed: '数据加载失败',
    check_backend: '请检查后端服务是否正常运行',
    retry: '重试',
    no_data: '暂无漏斗数据，请上传本月 Excel 数据源',
    bar_label: '实际转化率',
    insight_all_above: (n: number) => `全部 ${n} 个转化率均超目标，漏斗效率健康`,
    insight_below: (
      belowN: number,
      worstName: string,
      worstActual: number,
      worstGapStr: string,
      aboveN: number
    ) =>
      `${belowN} 个环节低于目标；最弱：${worstName} ${worstActual}%，差 ${worstGapStr}pp${aboveN ? `；${aboveN} 个超目标` : ''}`,
  },
  'zh-TW': {
    title: '轉化率 × 月達成',
    subtitle: '各環節實際轉化率 vs 目標',
    section: '漏斗分析',
    loading_failed: '資料載入失敗',
    check_backend: '請檢查後端服務是否正常運行',
    retry: '重試',
    no_data: '暫無漏斗資料，請上傳本月 Excel 資料來源',
    bar_label: '實際轉化率',
    insight_all_above: (n: number) => `全部 ${n} 個轉化率均超目標，漏斗效率健康`,
    insight_below: (
      belowN: number,
      worstName: string,
      worstActual: number,
      worstGapStr: string,
      aboveN: number
    ) =>
      `${belowN} 個環節低於目標；最弱：${worstName} ${worstActual}%，差 ${worstGapStr}pp${aboveN ? `；${aboveN} 個超目標` : ''}`,
  },
  en: {
    title: 'Conversion Rate × Monthly Achievement',
    subtitle: 'Actual conversion rate vs target for each funnel stage',
    section: 'Funnel Analysis',
    loading_failed: 'Failed to load data',
    check_backend: 'Please check if the backend service is running',
    retry: 'Retry',
    no_data: "No funnel data. Please upload this month's Excel data source",
    bar_label: 'Actual Rate',
    insight_all_above: (n: number) => `All ${n} conversion rates exceed target — funnel is healthy`,
    insight_below: (
      belowN: number,
      worstName: string,
      worstActual: number,
      worstGapStr: string,
      aboveN: number
    ) =>
      `${belowN} stage(s) below target; weakest: ${worstName} ${worstActual}%, gap ${worstGapStr}pp${aboveN ? `; ${aboveN} above target` : ''}`,
  },
  th: {
    title: 'อัตราการแปลง × การบรรลุเป้ารายเดือน',
    subtitle: 'อัตราการแปลงจริงเทียบกับเป้าหมายในแต่ละขั้นตอน',
    section: 'การวิเคราะห์ช่องทาง',
    loading_failed: 'โหลดข้อมูลล้มเหลว',
    check_backend: 'กรุณาตรวจสอบว่าบริการ Backend ทำงานปกติ',
    retry: 'ลองใหม่',
    no_data: 'ไม่มีข้อมูล Funnel กรุณาอัปโหลดข้อมูล Excel ประจำเดือน',
    bar_label: 'อัตราจริง',
    insight_all_above: (n: number) =>
      `อัตราการแปลงทั้ง ${n} รายการเกินเป้าหมาย — ช่องทางมีประสิทธิภาพ`,
    insight_below: (
      belowN: number,
      worstName: string,
      worstActual: number,
      worstGapStr: string,
      aboveN: number
    ) =>
      `${belowN} ขั้นตอนต่ำกว่าเป้าหมาย; อ่อนแอที่สุด: ${worstName} ${worstActual}%, ต่างกัน ${worstGapStr}pp${aboveN ? `; ${aboveN} รายการเกินเป้า` : ''}`,
  },
} as const;
type Locale = keyof typeof I18N;

export function ConversionRateSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const { data, isLoading, error, mutate } = useFilteredSWR<FunnelResult>('/api/funnel');
  const stages = data?.stages ?? [];

  // 只取名称含"率"的 stage（注册预约率/预约出席率/出席付费率）
  // actual = 实际转化率（0-1），target = 目标转化率（0-1），gap = actual - target
  const chartData = stages
    .filter((s) => s.name.includes('率'))
    .map((s) => ({
      name: s.name,
      actual: Number(((s.actual ?? 0) * 100).toFixed(1)),
      target: Number(((s.target ?? 0) * 100).toFixed(1)),
      gap: (s.actual ?? 0) - (s.target ?? 0),
    }));

  // 一句话结论
  const insight = (() => {
    if (!chartData.length) return undefined;
    const below = chartData.filter((d) => d.gap < 0);
    const above = chartData.filter((d) => d.gap >= 0);
    if (!below.length) return t.insight_all_above(chartData.length);
    const worst = below.reduce((a, b) => (a.gap < b.gap ? a : b));
    const worstGap = Math.abs(worst.gap * 100).toFixed(1);
    return t.insight_below(below.length, worst.name, worst.actual, worstGap, above.length);
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t.title}
      subtitle={t.subtitle}
      section={t.section}
      knowledgeChapter="chapter-8"
      insight={insight}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full px-4">
          <SkeletonChart className="h-4/5 w-full" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <p className="text-base font-semibold text-danger-token">{t.loading_failed}</p>
            <p className="text-sm text-muted-token">{t.check_backend}</p>
            <button
              onClick={() => mutate()}
              className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-default-token text-secondary-token hover:bg-subtle transition-colors"
            >
              {t.retry}
            </button>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-token">{t.no_data}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 14 }} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v: number) => `${v}%`}
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md, 10px)',
                boxShadow: 'var(--shadow-medium)',
                fontSize: '12px',
              }}
              cursor={{ stroke: 'var(--border-hover)', strokeDasharray: '4 4' }}
            />
            <Bar
              dataKey="actual"
              name={t.bar_label}
              radius={[6, 6, 0, 0]}
              animationDuration={600}
              animationEasing="ease-out"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.gap >= 0 ? 'var(--chart-4-hex)' : 'var(--chart-5-hex)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </SlideShell>
  );
}
