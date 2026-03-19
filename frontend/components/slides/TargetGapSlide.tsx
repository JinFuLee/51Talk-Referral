"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { formatRate } from "@/lib/utils";
import { SlideShell } from "@/components/presentation/SlideShell";
import { Spinner } from "@/components/ui/Spinner";

interface Stage {
  name: string;
  target: number;
  actual: number;
  gap: number;
  achievement_rate: number;
}

interface OverviewData {
  funnel_stages: Stage[];
}

interface TargetGapSlideProps {
  slideNumber: number;
  totalSlides: number;
}

export function TargetGapSlide({ slideNumber, totalSlides }: TargetGapSlideProps) {
  const { data, isLoading } = useSWR<OverviewData>("/api/overview", swrFetcher);
  const stages = data?.funnel_stages ?? [];

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="目标差距总览"
      subtitle="各环节目标 vs 实际达成"
      section="漏斗分析"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 h-full content-center">
          {stages.map((s) => (
            <div key={s.name} className="flex flex-col gap-2 bg-slate-50 rounded-2xl p-6">
              <p className="text-sm font-medium text-slate-500">{s.name}</p>
              <div className="text-3xl font-bold text-slate-900">{s.actual.toLocaleString()}</div>
              <p className="text-sm text-slate-400">目标 {s.target.toLocaleString()}</p>
              <div className={`text-lg font-bold ${s.gap >= 0 ? "text-green-600" : "text-red-500"}`}>
                {s.gap >= 0 ? "+" : ""}{s.gap.toLocaleString()}
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${s.achievement_rate >= 1 ? "bg-green-500" : s.achievement_rate >= 0.8 ? "bg-yellow-400" : "bg-red-400"}`}
                  style={{ width: `${Math.min(100, s.achievement_rate * 100)}%` }}
                />
              </div>
              <p className={`text-sm font-semibold ${s.achievement_rate >= 1 ? "text-green-600" : "text-red-500"}`}>
                {formatRate(s.achievement_rate)}
              </p>
            </div>
          ))}
        </div>
      )}
    </SlideShell>
  );
}
