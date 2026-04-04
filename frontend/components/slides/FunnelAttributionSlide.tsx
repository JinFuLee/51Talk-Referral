'use client';

import { useLocale } from 'next-intl';
import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr';
import { formatRate } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { SlideProps } from '@/lib/presentation/types';

interface FunnelStage {
  name: string;
  target: number | null;
  actual: number | null;
  gap: number | null;
  achievement_rate: number | null;
  conversion_rate: number | null;
}

interface FunnelResponse {
  stages: FunnelStage[];
}

const I18N = {
  zh: {
    title: '全漏斗转化链',
    subtitle: '注册 → 预约 → 出席 → 付费，逐环节达成 & 转化率',
    section: '漏斗分析',
    col_stage: '环节',
    col_actual: '实际',
    col_target: '目标',
    col_gap: '差距',
    col_achievement: '达成率',
    col_step_rate: '环节转化率',
    loading_failed: '数据加载失败',
    check_backend: '请检查后端服务是否正常运行',
    retry: '重试',
    no_data: '暂无漏斗数据，请上传本月 Excel 数据源',
    insight: (name: string, rate: number) => {
      const label = rate < 80 ? ' ⚠ 需重点关注' : rate >= 100 ? ' ✓ 超额' : '';
      return `关键漏斗：${name} 达成率 ${rate}%${label}`;
    },
    // 过滤含"率"的 stage
    rateKeyword: '率',
  },
  'zh-TW': {
    title: '全漏斗轉化鏈',
    subtitle: '註冊 → 預約 → 出席 → 付費，逐環節達成 & 轉化率',
    section: '漏斗分析',
    col_stage: '環節',
    col_actual: '實際',
    col_target: '目標',
    col_gap: '差距',
    col_achievement: '達成率',
    col_step_rate: '環節轉化率',
    loading_failed: '資料載入失敗',
    check_backend: '請檢查後端服務是否正常運行',
    retry: '重試',
    no_data: '暫無漏斗資料，請上傳本月 Excel 資料來源',
    insight: (name: string, rate: number) => {
      const label = rate < 80 ? ' ⚠ 需重點關注' : rate >= 100 ? ' ✓ 超額' : '';
      return `關鍵漏斗：${name} 達成率 ${rate}%${label}`;
    },
    rateKeyword: '率',
  },
  en: {
    title: 'Full Funnel Conversion Chain',
    subtitle: 'Reg → Appt → Attend → Paid — achievement & conversion rate per stage',
    section: 'Funnel Analysis',
    col_stage: 'Stage',
    col_actual: 'Actual',
    col_target: 'Target',
    col_gap: 'Gap',
    col_achievement: 'Achievement',
    col_step_rate: 'Step Rate',
    loading_failed: 'Failed to load data',
    check_backend: 'Please check if the backend service is running',
    retry: 'Retry',
    no_data: "No funnel data available — please upload this month's Excel data source",
    insight: (name: string, rate: number) => {
      const label = rate < 80 ? ' ⚠ needs attention' : rate >= 100 ? ' ✓ exceeded' : '';
      return `Key funnel: ${name} achievement ${rate}%${label}`;
    },
    rateKeyword: 'Rate',
  },
  th: {
    title: 'ห่วงโซ่การแปลง Funnel เต็มรูปแบบ',
    subtitle: 'ลงทะเบียน → นัด → เข้าร่วม → ชำระเงิน — ผลและอัตราการแปลงแต่ละขั้น',
    section: 'การวิเคราะห์ Funnel',
    col_stage: 'ขั้นตอน',
    col_actual: 'จริง',
    col_target: 'เป้าหมาย',
    col_gap: 'ช่องว่าง',
    col_achievement: 'บรรลุเป้าหมาย',
    col_step_rate: 'อัตราขั้นตอน',
    loading_failed: 'โหลดข้อมูลล้มเหลว',
    check_backend: 'กรุณาตรวจสอบว่าบริการ Backend ทำงานปกติ',
    retry: 'ลองใหม่',
    no_data: 'ไม่มีข้อมูล Funnel — กรุณาอัปโหลดข้อมูล Excel ประจำเดือน',
    insight: (name: string, rate: number) => {
      const label = rate < 80 ? ' ⚠ ต้องให้ความสนใจ' : rate >= 100 ? ' ✓ เกินเป้าหมาย' : '';
      return `Funnel สำคัญ: ${name} บรรลุ ${rate}%${label}`;
    },
    rateKeyword: 'อัตรา',
  },
} as const;
type Locale = keyof typeof I18N;

export function FunnelAttributionSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const { data, isLoading, error, mutate } = useFilteredSWR<FunnelResponse>('/api/funnel');
  const allStages = data?.stages ?? [];

  // 只保留计数型 stage（过滤掉名称含率关键词的率值 stage）
  const countStages = allStages.filter((s) => !s.name.includes('率'));

  // 相邻环节计算转化率
  const rows = countStages.map((s, i) => {
    const prev = i > 0 ? (countStages[i - 1].actual ?? 0) : 0;
    const curr = s.actual ?? 0;
    const stepRate = prev > 0 ? curr / prev : null;
    return { ...s, stepRate };
  });

  // 一句话结论：找达成率最低的环节
  const insight = (() => {
    const withTarget = rows.filter((r) => (r.target ?? 0) > 0 && r.achievement_rate !== null);
    if (!withTarget.length) return undefined;
    const worst = withTarget.reduce((a, b) =>
      (a.achievement_rate ?? 0) < (b.achievement_rate ?? 0) ? a : b
    );
    const rate = Math.round((worst.achievement_rate ?? 0) * 100);
    return t.insight(worst.name, rate);
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t.title}
      subtitle={t.subtitle}
      section={t.section}
      knowledgeChapter="chapter-2"
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
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-muted)]">{t.no_data}</p>
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="slide-thead-row">
                <th className="slide-th slide-th-left">{t.col_stage}</th>
                <th className="slide-th slide-th-right">{t.col_actual}</th>
                <th className="slide-th slide-th-right">{t.col_target}</th>
                <th className="slide-th slide-th-right">{t.col_gap}</th>
                <th className="slide-th slide-th-right">{t.col_achievement}</th>
                <th className="slide-th slide-th-right">{t.col_step_rate}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const actual = r.actual ?? 0;
                const target = r.target ?? 0;
                const gap = r.gap ?? 0;
                const rate = r.achievement_rate ?? 0;
                const isGood = gap >= 0;
                return (
                  <tr key={r.name} className={i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'}>
                    <td className="px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                      {r.name}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-mono tabular-nums font-bold text-[var(--text-primary)]">
                      {actual.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      {target > 0 ? target.toLocaleString() : '-'}
                    </td>
                    <td
                      className={`px-3 py-2 text-sm text-right font-mono tabular-nums font-bold ${isGood ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
                    >
                      {target > 0 ? `${isGood ? '+' : ''}${gap.toLocaleString()}` : '-'}
                    </td>
                    <td
                      className={`px-3 py-2 text-sm text-right font-semibold ${rate >= 1 ? 'text-[var(--color-success)]' : rate >= 0.8 ? 'text-[var(--color-warning)]' : rate > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--text-muted)]'}`}
                    >
                      {rate > 0 ? formatRate(rate) : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      {r.stepRate != null ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            r.stepRate >= 0.8
                              ? 'text-[var(--color-success)] bg-[var(--color-success-surface)]'
                              : r.stepRate >= 0.5
                                ? 'text-[var(--color-warning)] bg-[var(--color-warning-surface)]'
                                : 'text-[var(--color-danger)] bg-[var(--color-danger-surface)]'
                          }`}
                        >
                          {formatRate(r.stepRate)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
