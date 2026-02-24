"use client";

import { useRootCause, useStageEvaluation, usePyramidReport, useTranslation } from "@/lib/hooks";
import { SCQACard } from "@/components/biz/SCQACard";
import { FiveWhyTree } from "@/components/biz/FiveWhyTree";
import { StageBadge } from "@/components/biz/StageBadge";
import { SixStepSummary } from "@/components/biz/SixStepSummary";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { TypewriterText } from "@/components/ui/TypewriterText";
import { formatRevenue } from "@/lib/utils";
import type { PyramidPillar } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { BIZ_PAGE } from "@/lib/layout";

function PillarCard({ pillar }: { pillar: PyramidPillar }) {
  const gapPct = pillar.target > 0
    ? (((pillar.current - pillar.target) / pillar.target) * 100).toFixed(1)
    : "0.0";
  const progressPct = pillar.target > 0
    ? Math.min((pillar.current / pillar.target) * 100, 100)
    : 0;

  return (
    <div className="rounded-lg border border-slate-200 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{pillar.title}</h3>
        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 shrink-0">
          P{pillar.priority}
        </span>
      </div>

      {/* progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>当前 {(pillar.current * 100).toFixed(1)}%</span>
          <span>目标 {(pillar.target * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              progressPct >= 100
                ? "bg-green-500"
                : progressPct >= 80
                ? "bg-amber-400"
                : "bg-red-400"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">缺口 {gapPct}%</p>
      </div>

      {/* data points */}
      {pillar.data_points.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pillar.data_points.map((dp) => (
            <span
              key={dp.label}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-slate-600"
            >
              {dp.label}: <span className="font-medium">{dp.value}</span>
            </span>
          ))}
        </div>
      )}

      {/* expected revenue lift */}
      <div>
        <span className="text-xs text-slate-500">预期收益提升</span>
        <p className="text-sm font-semibold text-green-700">
          {formatRevenue(pillar.expected_revenue_lift_usd)}
        </p>
      </div>

      {/* actions */}
      {pillar.actions.length > 0 && (
        <ul className="space-y-1">
          {pillar.actions.map((a) => (
            <li key={a} className="text-xs text-slate-600 flex gap-1.5">
              <span className="text-indigo-400 shrink-0">→</span>
              {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const { t } = useTranslation();
  const { data: rootCause, isLoading: rcLoading, error: rcError } = useRootCause();
  const { data: stage, isLoading: stLoading, error: stError } = useStageEvaluation();
  const { data: pyramid, isLoading: pyLoading, error: pyError } = usePyramidReport();

  const isLoading = rcLoading || stLoading || pyLoading;
  const hasError = rcError || stError || pyError;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28" />
        <Skeleton className="h-20" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (hasError && !pyramid && !rootCause && !stage) {
    return (
      <div className="p-6 text-sm text-slate-500">
        {t("biz.insights.label.loadError")}
      </div>
    );
  }

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t("biz.insights.title")} subtitle={t("biz.insights.subtitle")} />

      <ErrorBoundary>

      {/* 核心结论 + SCQA */}
      {pyramid && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 rounded-l-xl" />
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span className="text-brand-500">✨</span> {t("biz.insights.label.coreConclusion")}
            </h2>
            <p className="text-base font-medium text-slate-700 leading-relaxed min-h-[3rem]">
              <TypewriterText text={pyramid.conclusion} speed={15} />
            </p>
          </div>
          <SCQACard scqa={pyramid.scqa} />
        </>
      )}

      {/* 阶段评估 */}
      {stage && <StageBadge data={stage} />}

      {/* 重点行动支柱 */}
      {pyramid?.pillars && pyramid.pillars.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4">{t("biz.insights.label.pillars")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {pyramid.pillars.map((p) => (
              <PillarCard key={p.title} pillar={p} />
            ))}
          </div>
        </div>
      )}

      {/* 5-Why 根因分析 */}
      {rootCause && rootCause.analyses.length > 0 && (
        <FiveWhyTree data={rootCause} />
      )}

      {/* 六步法摘要 */}
      {pyramid?.six_steps && <SixStepSummary data={pyramid.six_steps} />}
      </ErrorBoundary>
    </div>
  );
}
