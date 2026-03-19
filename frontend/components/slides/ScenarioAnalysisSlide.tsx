"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import { formatRate } from "@/lib/utils";
import { SlideShell } from "@/components/presentation/SlideShell";
import { Spinner } from "@/components/ui/Spinner";
import type { ScenarioResult } from "@/lib/types/funnel";

interface ScenarioAnalysisSlideProps {
  slideNumber: number;
  totalSlides: number;
}

export function ScenarioAnalysisSlide({ slideNumber, totalSlides }: ScenarioAnalysisSlideProps) {
  const { data, isLoading } = useSWR<ScenarioResult[]>("/api/funnel/scenario", swrFetcher);
  const scenarios = data ?? [];

  return (
    <SlideShell
      slideNumber={slideNumber}
      totalSlides={totalSlides}
      title="漏斗场景推演"
      subtitle="提升各环节转化率的预期影响"
      section="漏斗分析"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="overflow-auto h-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
                <th className="py-1.5 px-2 text-left">环节</th>
                <th className="py-1.5 px-2 text-right">当前转化率</th>
                <th className="py-1.5 px-2 text-right">场景转化率</th>
                <th className="py-1.5 px-2 text-right">影响注册数</th>
                <th className="py-1.5 px-2 text-right">影响付费数</th>
                <th className="py-1.5 px-2 text-right">影响业绩</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.stage} className="border-b border-slate-100">
                  <td className="py-1 px-2 text-xs font-semibold">{s.stage}</td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">{formatRate(s.current_rate)}</td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-blue-600 font-bold">{formatRate(s.scenario_rate)}</td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">+{s.impact_registrations.toLocaleString()}</td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums">+{s.impact_payments.toLocaleString()}</td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-green-600 font-bold">+${s.impact_revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SlideShell>
  );
}
