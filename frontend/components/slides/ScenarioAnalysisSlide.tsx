'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { ScenarioResult } from '@/lib/types/funnel';
import type { SlideProps } from '@/lib/presentation/types';

const I18N = {
  zh: {
    title: '漏斗场景推演',
    subtitle: '提升各环节转化率的预期影响',
    section: '漏斗分析',
    current_rate: '当前转化率',
    scenario_rate: '场景转化率',
    impact_reg: '影响注册数',
    impact_paid: '影响付费数',
    impact_revenue: '影响业绩',
    loading_failed: '数据加载失败',
    check_backend: '请检查后端服务是否正常运行',
    retry: '重试',
    no_data: '暂无场景推演数据',
    no_data_hint: '请上传本月 Excel 数据源后自动刷新',
    insight: (paid: number, rev: number, cur: string, scen: string) => {
      const parts: string[] = [];
      if (paid > 0) parts.push(`付费 +${paid}`);
      if (rev > 0) parts.push(`业绩可提升 +$${rev.toLocaleString()}`);
      return parts.length ? `优化场景：${parts.join('，')}（转化率 ${cur} → ${scen}）` : undefined;
    },
  },
  'zh-TW': {
    title: '漏斗場景推演',
    subtitle: '提升各環節轉化率的預期影響',
    section: '漏斗分析',
    current_rate: '當前轉化率',
    scenario_rate: '場景轉化率',
    impact_reg: '影響註冊數',
    impact_paid: '影響付費數',
    impact_revenue: '影響業績',
    loading_failed: '資料載入失敗',
    check_backend: '請檢查後端服務是否正常運行',
    retry: '重試',
    no_data: '暫無場景推演資料',
    no_data_hint: '請上傳本月 Excel 資料來源後自動重新整理',
    insight: (paid: number, rev: number, cur: string, scen: string) => {
      const parts: string[] = [];
      if (paid > 0) parts.push(`付費 +${paid}`);
      if (rev > 0) parts.push(`業績可提升 +$${rev.toLocaleString()}`);
      return parts.length ? `優化場景：${parts.join('，')}（轉化率 ${cur} → ${scen}）` : undefined;
    },
  },
  en: {
    title: 'Funnel Scenario Analysis',
    subtitle: 'Expected impact of improving conversion rates at each stage',
    section: 'Funnel Analysis',
    current_rate: 'Current Rate',
    scenario_rate: 'Scenario Rate',
    impact_reg: 'Impact on Registrations',
    impact_paid: 'Impact on Payments',
    impact_revenue: 'Revenue Impact',
    loading_failed: 'Failed to load data',
    check_backend: 'Please check if the backend service is running',
    retry: 'Retry',
    no_data: 'No scenario data available',
    no_data_hint: "Please upload this month's Excel data source to refresh",
    insight: (paid: number, rev: number, cur: string, scen: string) => {
      const parts: string[] = [];
      if (paid > 0) parts.push(`+${paid} payments`);
      if (rev > 0) parts.push(`+$${rev.toLocaleString()} revenue`);
      return parts.length ? `Scenario: ${parts.join(', ')} (rate ${cur} → ${scen})` : undefined;
    },
  },
  th: {
    title: 'การวิเคราะห์สถานการณ์ Funnel',
    subtitle: 'ผลกระทบที่คาดหวังจากการปรับปรุงอัตราการแปลงในแต่ละขั้นตอน',
    section: 'การวิเคราะห์ Funnel',
    current_rate: 'อัตราปัจจุบัน',
    scenario_rate: 'อัตราในสถานการณ์',
    impact_reg: 'ผลกระทบต่อการลงทะเบียน',
    impact_paid: 'ผลกระทบต่อการชำระเงิน',
    impact_revenue: 'ผลกระทบต่อรายได้',
    loading_failed: 'โหลดข้อมูลล้มเหลว',
    check_backend: 'กรุณาตรวจสอบว่าบริการ Backend ทำงานปกติ',
    retry: 'ลองใหม่',
    no_data: 'ไม่มีข้อมูลสถานการณ์',
    no_data_hint: 'กรุณาอัปโหลดข้อมูล Excel ประจำเดือนเพื่อรีเฟรช',
    insight: (paid: number, rev: number, cur: string, scen: string) => {
      const parts: string[] = [];
      if (paid > 0) parts.push(`+${paid} ชำระเงิน`);
      if (rev > 0) parts.push(`+$${rev.toLocaleString()} รายได้`);
      return parts.length ? `สถานการณ์: ${parts.join(', ')} (อัตรา ${cur} → ${scen})` : undefined;
    },
  },
} as const;
type Locale = keyof typeof I18N;

export function ScenarioAnalysisSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const { data, isLoading, error, mutate } = useFilteredSWR<ScenarioResult>('/api/funnel/scenario');

  const insight = (() => {
    if (!data) return undefined;
    return (
      t.insight(
        data.impact_payments ?? 0,
        data.impact_revenue ?? 0,
        formatRate(data.current_rate),
        formatRate(data.scenario_rate)
      ) ?? undefined
    );
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t.title}
      subtitle={t.subtitle}
      section={t.section}
      knowledgeChapter="chapter-7"
      knowledgeBook="business-bible"
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
      ) : !data ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-base font-medium">{t.no_data}</p>
          <p className="text-sm">{t.no_data_hint}</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[var(--bg-subtle)] rounded-lg p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t.current_rate}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatRate(data.current_rate)}
              </p>
            </div>
            <div className="bg-action-accent-surface rounded-lg p-4">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t.scenario_rate}</p>
              <p className="text-2xl font-bold text-action-accent">
                {formatRate(data.scenario_rate)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--bg-subtle)] rounded-lg p-3 text-center">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t.impact_reg}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                +{(data.impact_registrations ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-[var(--bg-subtle)] rounded-lg p-3 text-center">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t.impact_paid}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                +{(data.impact_payments ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-[var(--color-success-surface)] rounded-lg p-3 text-center">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t.impact_revenue}</p>
              <p className="text-lg font-bold text-[var(--color-success)]">
                +${(data.impact_revenue ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
