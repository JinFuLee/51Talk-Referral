"use client";

import useSWR from "swr";
import { cn } from "@/lib/utils";
import type { EnclosureSegment } from "@/lib/types/analysis";
import { swrFetcher } from "@/lib/api";

interface EnclosureHeatmapProps {
  segments?: EnclosureSegment[];
  allocation?: Record<string, number>;
}

const SEGMENTS = ["0-30", "31-60", "61-90", "91-180", "181+"];

function roiColor(roi: number): string {
  if (roi >= 1.2) return "bg-emerald-100 border-emerald-300 text-emerald-800";
  if (roi >= 0.8) return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-rose-50 border-rose-200 text-rose-700";
}

function roiStatus(roi: number): string {
  if (roi >= 1.2) return "🟢";
  if (roi >= 0.8) return "🟡";
  return "🔴";
}

export function EnclosureHeatmap({
  segments: propSegments,
  allocation: propAllocation,
}: EnclosureHeatmapProps) {
  const { data, isLoading, error } = useSWR(
    propSegments ? null : "/api/analysis/enclosure-health",
    swrFetcher
  );

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-red-50 border border-red-200 text-red-500 text-sm">
        围场数据加载失败，请稍后重试
      </div>
    );
  }

  const segments: EnclosureSegment[] = propSegments ?? data?.data?.segments ?? [];

  // Derive allocation from segments if not provided
  const totalStudents = segments.reduce((s, seg) => s + (seg.students ?? 0), 0);
  const derivedAllocation: Record<string, number> = {};
  for (const seg of segments) {
    derivedAllocation[seg.segment] = totalStudents > 0 ? (seg.students ?? 0) / totalStudents : 0;
  }
  const allocation = propAllocation ?? data?.data?.allocation ?? derivedAllocation;

  const segMap: Record<string, EnclosureSegment> = {};
  for (const s of segments) segMap[s.segment] = s;

  return (
    <div className="grid grid-cols-5 gap-3">
      {SEGMENTS.map((seg) => {
        const s = segMap[seg];
        const alloc = allocation[seg] ?? 0;
        if (!s) return null;
        return (
          <div
            key={seg}
            className={cn(
              "rounded-2xl border p-4 flex flex-col gap-2 text-center shadow-flash hover:shadow-flash-lg hover:-translate-y-1 transition-all duration-500 border-border/40",
              roiColor(s.roi_index ?? 0)
            )}
          >
            <div className="text-sm font-bold">{seg} 天</div>
            <div className="text-xs opacity-70">{roiStatus(s.roi_index ?? 0)}</div>
            <div className="text-2xl font-bold">{(s.roi_index ?? 0).toFixed(1)}</div>
            <div className="text-xs opacity-60">ROI 指数</div>
            <div className="h-px bg-current opacity-20 my-1" />
            <div className="text-xs">
              <div className="font-semibold">{(alloc * 100).toFixed(0)}%</div>
              <div className="opacity-60">建议投入</div>
            </div>
            <div className="text-xs opacity-70 font-medium mt-1">{s.recommendation}</div>
          </div>
        );
      })}
    </div>
  );
}
