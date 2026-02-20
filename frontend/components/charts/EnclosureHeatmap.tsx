"use client";

import { cn } from "@/lib/utils";
import type { EnclosureSegment } from "@/lib/types/analysis";

interface EnclosureHeatmapProps {
  segments: EnclosureSegment[];
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

const MOCK_SEGMENTS: EnclosureSegment[] = [
  { segment: "0-30", students: 450, conversion_rate: 0.25, followup_rate: 0.80, roi_index: 1.5, recommendation: "加大投入" },
  { segment: "31-60", students: 380, conversion_rate: 0.18, followup_rate: 0.65, roi_index: 1.2, recommendation: "维持" },
  { segment: "61-90", students: 290, conversion_rate: 0.12, followup_rate: 0.50, roi_index: 0.8, recommendation: "精选跟进" },
  { segment: "91-180", students: 220, conversion_rate: 0.08, followup_rate: 0.35, roi_index: 0.5, recommendation: "降低频次" },
  { segment: "181+", students: 150, conversion_rate: 0.04, followup_rate: 0.15, roi_index: 0.3, recommendation: "暂缓" },
];

const MOCK_ALLOC: Record<string, number> = {
  "0-30": 0.35, "31-60": 0.25, "61-90": 0.20, "91-180": 0.15, "181+": 0.05,
};

export function EnclosureHeatmap({
  segments = MOCK_SEGMENTS,
  allocation = MOCK_ALLOC,
}: EnclosureHeatmapProps) {
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
              "rounded-xl border-2 p-4 flex flex-col gap-2 text-center",
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
