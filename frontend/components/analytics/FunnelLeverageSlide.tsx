'use client';

import React from 'react';
import useSWR from 'swr';
import { useLocale } from 'next-intl';
import { swrFetcher } from '@/lib/api';
import { formatRate, formatRevenue } from '@/lib/utils';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SkeletonChart } from '@/components/ui/Skeleton';
import type { FunnelLeverage, LeverageScore } from '@/lib/types/report';
import type { SlideProps } from '@/lib/presentation/types';

// ── 国际化 ───────────────────────────────────────
const I18N: Record<
  string,
  {
    title: string;
    subtitle: string;
    section: string;
    channel: string;
    stage: string;
    actual: string;
    target: string;
    gap: string;
    impact: string;
    feasibility: string;
    urgency: string;
    score: string;
    potential: string;
    bottleneck: string;
    error: string;
    errorHint: string;
    retry: string;
    empty: string;
    emptyHint: string;
    stageLabels: Record<string, string>;
  }
> = {
  zh: {
    title: '漏斗杠杆矩阵',
    subtitle: '渠道 × 阶段 × 收入杠杆分（impact × feasibility × urgency）',
    section: '杠杆分析',
    channel: '渠道',
    stage: '阶段',
    actual: '实际率',
    target: '目标率',
    gap: 'GAP',
    impact: '增量收入',
    feasibility: '可行性',
    urgency: '紧迫度',
    score: '杠杆分',
    potential: '评级',
    bottleneck: '最大瓶颈',
    error: '数据加载失败',
    errorHint: '请检查后端服务是否正常运行',
    retry: '重试',
    empty: '暂无杠杆矩阵数据',
    emptyHint: '请上传本月 Excel 数据源后自动刷新',
    stageLabels: {
      appt_rate: '预约率',
      attend_rate: '出席率',
      paid_rate: '付费率',
    },
  },
  'zh-TW': {
    title: '漏斗槓桿矩陣',
    subtitle: '渠道 × 階段 × 收入槓桿分（impact × feasibility × urgency）',
    section: '槓桿分析',
    channel: '渠道',
    stage: '階段',
    actual: '實際率',
    target: '目標率',
    gap: 'GAP',
    impact: '增量收入',
    feasibility: '可行性',
    urgency: '緊迫度',
    score: '槓桿分',
    potential: '評級',
    bottleneck: '最大瓶頸',
    error: '資料載入失敗',
    errorHint: '請檢查後端服務是否正常運行',
    retry: '重試',
    empty: '暫無槓桿矩陣資料',
    emptyHint: '請上傳本月 Excel 資料源後自動刷新',
    stageLabels: {
      appt_rate: '預約率',
      attend_rate: '出席率',
      paid_rate: '付費率',
    },
  },
  en: {
    title: 'Funnel Leverage Matrix',
    subtitle: 'Channel × Stage × Leverage Score (impact × feasibility × urgency)',
    section: 'Leverage Analysis',
    channel: 'Channel',
    stage: 'Stage',
    actual: 'Actual',
    target: 'Target',
    gap: 'GAP',
    impact: 'Rev. Impact',
    feasibility: 'Feasibility',
    urgency: 'Urgency',
    score: 'Score',
    potential: 'Potential',
    bottleneck: 'Top Bottleneck',
    error: 'Failed to load',
    errorHint: 'Please check if backend is running',
    retry: 'Retry',
    empty: 'No leverage matrix data',
    emptyHint: 'Upload monthly Excel data to refresh',
    stageLabels: {
      appt_rate: 'Appt Rate',
      attend_rate: 'Attend Rate',
      paid_rate: 'Paid Rate',
    },
  },
  th: {
    title: 'เมทริกซ์แรงงัดช่องทาง',
    subtitle: 'ช่องทาง × ขั้นตอน × คะแนนแรงงัด (impact × feasibility × urgency)',
    section: 'การวิเคราะห์แรงงัด',
    channel: 'ช่องทาง',
    stage: 'ขั้นตอน',
    actual: 'อัตราจริง',
    target: 'อัตราเป้าหมาย',
    gap: 'GAP',
    impact: 'รายได้เพิ่ม',
    feasibility: 'ความเป็นไปได้',
    urgency: 'ความเร่งด่วน',
    score: 'คะแนน',
    potential: 'ศักยภาพ',
    bottleneck: 'คอขวดหลัก',
    error: 'โหลดข้อมูลล้มเหลว',
    errorHint: 'กรุณาตรวจสอบบริการแบ็กเอนด์',
    retry: 'ลองใหม่',
    empty: 'ไม่มีข้อมูลเมทริกซ์',
    emptyHint: 'กรุณาอัปโหลดไฟล์ Excel ประจำเดือน',
    stageLabels: {
      appt_rate: 'อัตรานัดหมาย',
      attend_rate: 'อัตราเข้าร่วม',
      paid_rate: 'อัตราชำระ',
    },
  },
};

type DailyReportSlice = { blocks: { funnel_leverage: FunnelLeverage } };

function ScoreBar({ score }: { score: number }) {
  // score 通常在 0-1 之间（impact × feasibility × urgency 归一化后）
  const pct = Math.min(100, score * 100);
  const color = score >= 0.5 ? 'bg-emerald-500' : score >= 0.25 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[var(--bg-subtle)] rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)] w-8 text-right">
        {score.toFixed(2)}
      </span>
    </div>
  );
}

function PotentialBadge({ label }: { label: string }) {
  const isGood = label.includes('高潜力') || label.includes('High');
  const isPending = label.includes('待改善') || label.includes('Improve');
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${
        isGood
          ? 'bg-emerald-50 text-emerald-700'
          : isPending
            ? 'bg-amber-50 text-amber-700'
            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
      }`}
    >
      {label}
    </span>
  );
}

export function FunnelLeverageSlide({ slideNumber, totalSlides }: SlideProps) {
  const locale = useLocale();
  const t = I18N[locale] ?? I18N['zh'];

  const { data, isLoading, error, mutate } = useSWR<FunnelLeverage>(
    '/api/report/daily',
    (url: string) =>
      (swrFetcher(url) as Promise<DailyReportSlice>).then((d) => d?.blocks?.funnel_leverage)
  );
  const scores: LeverageScore[] = data?.scores ?? [];
  const topBottleneck = data?.top_bottleneck;

  const insight = (() => {
    if (!topBottleneck) return undefined;
    const stageLabel = t.stageLabels[topBottleneck.stage] ?? topBottleneck.stage;
    return `最大瓶颈：${topBottleneck.channel} ${stageLabel}（杠杆分 ${(topBottleneck.leverage_score ?? 0).toFixed(2)}，增量收入 ${formatRevenue(topBottleneck.revenue_impact)}）`;
  })();

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title={t.title}
      subtitle={t.subtitle}
      section={t.section}
      insight={insight}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full px-4">
          <SkeletonChart className="h-4/5 w-full" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <p className="text-base font-semibold text-red-600">{t.error}</p>
            <p className="text-sm text-[var(--text-muted)]">{t.errorHint}</p>
            <button
              onClick={() => mutate()}
              className="mt-1 px-4 py-1.5 rounded-lg text-sm border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              {t.retry}
            </button>
          </div>
        </div>
      ) : scores.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-full gap-3 text-[var(--text-muted)]">
          <p className="text-base font-medium">{t.empty}</p>
          <p className="text-sm">{t.emptyHint}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 h-full">
          {/* 最大瓶颈高亮卡片 */}
          {topBottleneck && (
            <div className="flex-shrink-0 px-4 py-3 rounded-xl border-2 border-[var(--brand-p1)] bg-[var(--color-warning-surface)] flex items-center gap-4">
              <div className="flex-shrink-0 w-2 h-8 rounded-full bg-[var(--brand-p1)]" />
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">{t.bottleneck}</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {topBottleneck.channel} ·{' '}
                  {t.stageLabels[topBottleneck.stage] ?? topBottleneck.stage}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-[var(--text-muted)]">{t.impact}</p>
                <p className="text-sm font-bold text-[var(--color-warning)]">
                  +{formatRevenue(topBottleneck.revenue_impact)}
                </p>
              </div>
            </div>
          )}

          {/* 杠杆矩阵表 */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="slide-thead-row">
                  <th className="slide-th slide-th-left">{t.channel}</th>
                  <th className="slide-th slide-th-left">{t.stage}</th>
                  <th className="slide-th slide-th-right">{t.actual}</th>
                  <th className="slide-th slide-th-right">{t.target}</th>
                  <th className="slide-th slide-th-right">{t.gap}</th>
                  <th className="slide-th slide-th-right">{t.impact}</th>
                  <th className="slide-th" style={{ width: '120px' }}>
                    {t.score}
                  </th>
                  <th className="slide-th slide-th-center">{t.potential}</th>
                </tr>
              </thead>
              <tbody>
                {scores
                  .sort((a, b) => b.leverage_score - a.leverage_score)
                  .map((row, i) => (
                    <tr
                      key={`${row.channel}-${row.stage}`}
                      className={`${i % 2 === 0 ? 'slide-row-even' : 'slide-row-odd'} ${row.is_bottleneck ? 'ring-1 ring-inset ring-amber-300' : ''}`}
                    >
                      <td className="px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]">
                        {row.channel}
                        {row.is_bottleneck && (
                          <span className="ml-1 text-amber-500 text-xs">★</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                        {t.stageLabels[row.stage] ?? row.stage}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {formatRate(row.actual_rate)}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                        {formatRate(row.target_rate)}
                      </td>
                      <td
                        className={`px-2 py-1.5 text-xs text-right font-mono tabular-nums font-semibold ${row.gap >= 0 ? 'text-emerald-700' : 'text-red-600'}`}
                      >
                        {row.gap > 0 ? '+' : ''}
                        {formatRate(row.gap)}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-right font-mono tabular-nums text-[var(--color-warning)] font-semibold">
                        +{formatRevenue(row.revenue_impact)}
                      </td>
                      <td className="px-3 py-1.5">
                        <ScoreBar score={row.leverage_score} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <PotentialBadge label={row.potential_label} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SlideShell>
  );
}
