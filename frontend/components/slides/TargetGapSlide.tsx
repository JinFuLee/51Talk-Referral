'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { SlideProps } from '@/lib/presentation/types';

// 对齐 /api/funnel 真实返回
interface FunnelResponse {
  date: string | null;
  stages: {
    name: string;
    target: number | null;
    actual: number | null;
    gap: number | null;
    achievement_rate: number | null;
    conversion_rate: number | null;
  }[];
  target_revenue: number | null;
  actual_revenue: number | null;
  revenue_gap: number | null;
  revenue_achievement: number | null;
}

const I18N = {
  zh: {
    title: '目标差距总览',
    subtitle: '各环节目标 vs 实际达成',
    section: '漏斗分析',
    loading_failed: '数据加载失败',
    check_backend: '请检查后端服务是否正常运行',
    retry: '重试',
    no_data: '暂无漏斗数据，请上传本月 Excel 数据源',
    target_label: (v: number) => `目标 ${v.toLocaleString()}`,
    insight_single: (name: string, rate: number) =>
      `${name} 达成率 ${rate}%${rate >= 100 ? '，超额完成' : rate >= 80 ? '，接近达标' : '，需重点关注'}`,
    insight_dual: (worstName: string, worstRate: number, bestName: string, bestRate: number) =>
      `最弱环节：${worstName} ${worstRate}%${worstRate < 80 ? ' ⚠' : ''}，最强：${bestName} ${bestRate}%`,
  },
  'zh-TW': {
    title: '目標差距總覽',
    subtitle: '各環節目標 vs 實際達成',
    section: '漏斗分析',
    loading_failed: '資料載入失敗',
    check_backend: '請檢查後端服務是否正常運行',
    retry: '重試',
    no_data: '暫無漏斗資料，請上傳本月 Excel 資料來源',
    target_label: (v: number) => `目標 ${v.toLocaleString()}`,
    insight_single: (name: string, rate: number) =>
      `${name} 達成率 ${rate}%${rate >= 100 ? '，超額完成' : rate >= 80 ? '，接近達標' : '，需重點關注'}`,
    insight_dual: (worstName: string, worstRate: number, bestName: string, bestRate: number) =>
      `最弱環節：${worstName} ${worstRate}%${worstRate < 80 ? ' ⚠' : ''}，最強：${bestName} ${bestRate}%`,
  },
  en: {
    title: 'Target Gap Overview',
    subtitle: 'Target vs Actual Achievement by Stage',
    section: 'Funnel Analysis',
    loading_failed: 'Failed to load data',
    check_backend: 'Please check if the backend service is running',
    retry: 'Retry',
    no_data: "No funnel data available — please upload this month's Excel data source",
    target_label: (v: number) => `Target ${v.toLocaleString()}`,
    insight_single: (name: string, rate: number) =>
      `${name} achievement ${rate}%${rate >= 100 ? ' — exceeded target' : rate >= 80 ? ' — near target' : ' — needs attention'}`,
    insight_dual: (worstName: string, worstRate: number, bestName: string, bestRate: number) =>
      `Weakest: ${worstName} ${worstRate}%${worstRate < 80 ? ' ⚠' : ''}, Strongest: ${bestName} ${bestRate}%`,
  },
  th: {
    title: 'ภาพรวมช่องว่างเป้าหมาย',
    subtitle: 'เป้าหมาย vs ผลจริงในแต่ละขั้นตอน',
    section: 'การวิเคราะห์ Funnel',
    loading_failed: 'โหลดข้อมูลล้มเหลว',
    check_backend: 'กรุณาตรวจสอบว่าบริการ Backend ทำงานปกติ',
    retry: 'ลองใหม่',
    no_data: 'ไม่มีข้อมูล Funnel — กรุณาอัปโหลดข้อมูล Excel ประจำเดือน',
    target_label: (v: number) => `เป้าหมาย ${v.toLocaleString()}`,
    insight_single: (name: string, rate: number) =>
      `${name} บรรลุ ${rate}%${rate >= 100 ? ' — เกินเป้าหมาย' : rate >= 80 ? ' — ใกล้เป้าหมาย' : ' — ต้องให้ความสนใจ'}`,
    insight_dual: (worstName: string, worstRate: number, bestName: string, bestRate: number) =>
      `อ่อนที่สุด: ${worstName} ${worstRate}%${worstRate < 80 ? ' ⚠' : ''}, แข็งแกร่งที่สุด: ${bestName} ${bestRate}%`,
  },
} as const;
type Locale = keyof typeof I18N;

export function TargetGapSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const { data, isLoading, error, mutate } = useFilteredSWR<FunnelResponse>('/api/funnel');
  const stages = data?.stages ?? [];

  // 生成一句话结论
  const insight = (() => {
    if (!stages.length) return undefined;
    const withTarget = stages.filter((s) => (s.target ?? 0) > 0 && s.achievement_rate !== null);
    if (!withTarget.length) return undefined;
    const worst = withTarget.reduce((a, b) =>
      (a.achievement_rate ?? 0) < (b.achievement_rate ?? 0) ? a : b
    );
    const best = withTarget.reduce((a, b) =>
      (a.achievement_rate ?? 0) > (b.achievement_rate ?? 0) ? a : b
    );
    const worstRate = Math.round((worst.achievement_rate ?? 0) * 100);
    const bestRate = Math.round((best.achievement_rate ?? 0) * 100);
    if (worst.name === best.name) {
      return t.insight_single(worst.name, worstRate);
    }
    return t.insight_dual(worst.name, worstRate, best.name, bestRate);
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t.title}
      subtitle={t.subtitle}
      section={t.section}
      knowledgeChapter="chapter-4"
      insight={insight}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full px-4">
          <SkeletonChart className="h-4/5 w-full" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <p className="text-base font-semibold text-[var(--color-danger)]">{t.loading_failed}</p>
            <p className="text-sm text-[var(--text-muted)]">{t.check_backend}</p>
            <button
              onClick={() => mutate()}
              className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              {t.retry}
            </button>
          </div>
        </div>
      ) : stages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-muted)]">{t.no_data}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 h-full content-center">
          {stages.map((s) => {
            const actual = s.actual ?? 0;
            const target = s.target ?? 0;
            const gap = s.gap ?? 0;
            const rate = s.achievement_rate ?? 0;
            const isAtRisk = target > 0 && rate < 0.8;
            return (
              <div
                key={s.name}
                className={`flex flex-col gap-2 rounded-[var(--radius-xl)] p-6 ${
                  isAtRisk
                    ? 'bg-[var(--color-danger-surface)] border-2 border-[var(--color-danger)]'
                    : 'bg-[var(--bg-subtle)]'
                }`}
              >
                <p className="text-sm font-medium text-[var(--text-secondary)]">{s.name}</p>
                <div
                  className={`text-3xl font-bold ${
                    isAtRisk ? 'text-[var(--color-danger)]' : 'text-[var(--text-primary)]'
                  }`}
                  style={isAtRisk ? undefined : { color: 'var(--brand-p1, var(--text-primary))' }}
                >
                  {actual.toLocaleString()}
                </div>
                {target > 0 && (
                  <p className="text-sm text-[var(--text-muted)]">{t.target_label(target)}</p>
                )}
                {target > 0 && (
                  <>
                    <div
                      className={`text-lg font-bold ${gap >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
                    >
                      {gap >= 0 ? '+' : ''}
                      {gap.toLocaleString()}
                    </div>
                    <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${rate >= 1 ? 'bg-[var(--color-success)]' : rate >= 0.8 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-danger)]'}`}
                        style={{ width: `${Math.min(100, rate * 100)}%` }}
                      />
                    </div>
                    <p
                      className={`text-sm font-semibold ${rate >= 1 ? 'text-[var(--color-success)]' : rate >= 0.8 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}
                    >
                      {formatRate(rate)}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SlideShell>
  );
}
