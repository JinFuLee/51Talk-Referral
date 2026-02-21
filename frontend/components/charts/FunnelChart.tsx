"use client";

import { CHART_HEIGHT } from "@/lib/utils";

export interface FunnelStage {
  name: string;
  value: number;
  rate?: string; // conversion rate label e.g. "62%"
}

interface FunnelChartProps {
  /** Structured stage array (preferred) */
  stages?: FunnelStage[];
  /** Raw API funnel data (FunnelData from backend) — auto-converted */
  data?: Record<string, unknown>;
  title?: string;
}

const FUNNEL_COLORS = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-amber))",
  "#a855f7",
  "#c026d3",
];

/** Convert raw FunnelData API object into FunnelStage[] */
function funnelDataToStages(data: Record<string, unknown>): FunnelStage[] {
  const stages: FunnelStage[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === "object") {
      const channel = val as Record<string, unknown>;
      const reg = typeof channel.registrations === "number" ? channel.registrations : 0;
      const paid = typeof channel.payments === "number" ? channel.payments : 0;
      stages.push({ name: `${key} 注册`, value: reg });
      if (paid > 0) stages.push({ name: `${key} 付费`, value: paid });
    }
  }
  return stages;
}

/** SVG trapezoid funnel — true graduated shape */
function TrapezoidFunnel({ stages }: { stages: FunnelStage[] }) {
  if (stages.length === 0) return null;

  const svgWidth = 320;
  const stageHeight = 44;
  const gap = 4;
  const svgHeight = stages.length * (stageHeight + gap);
  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  // Widths: top stage = 100%, each subsequent stage proportional
  const minWidthRatio = 0.18;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      aria-label="漏斗图"
      role="img"
      style={{ maxHeight: CHART_HEIGHT.lg }}
    >
      {stages.map((stage, i) => {
        const ratio = Math.max(stage.value / maxValue, minWidthRatio);
        const topW = i === 0 ? svgWidth : Math.max((stages[i - 1].value / maxValue) * svgWidth, minWidthRatio * svgWidth);
        const botW = Math.max(ratio * svgWidth, minWidthRatio * svgWidth);
        const topOffset = (svgWidth - topW) / 2;
        const botOffset = (svgWidth - botW) / 2;
        const y = i * (stageHeight + gap);
        const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];

        // Trapezoid path: top-left → top-right → bottom-right → bottom-left
        const path = [
          `M ${topOffset} ${y}`,
          `L ${topOffset + topW} ${y}`,
          `L ${botOffset + botW} ${y + stageHeight}`,
          `L ${botOffset} ${y + stageHeight}`,
          "Z",
        ].join(" ");

        return (
          <g key={stage.name}>
            <path d={path} fill={color} fillOpacity={0.85} />
            <text
              x={svgWidth / 2}
              y={y + stageHeight / 2 - 5}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="white"
            >
              {stage.name}
            </text>
            <text
              x={svgWidth / 2}
              y={y + stageHeight / 2 + 10}
              textAnchor="middle"
              fontSize={10}
              fill="rgba(255,255,255,0.9)"
            >
              {stage.value.toLocaleString()}
              {stage.rate ? ` (${stage.rate})` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function FunnelChart({ stages: stagesProp, data, title }: FunnelChartProps) {
  const stages: FunnelStage[] = stagesProp ?? (data ? funnelDataToStages(data) : []);

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        暂无漏斗数据
      </div>
    );
  }

  return (
    <div>
      {title && <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>}
      <TrapezoidFunnel stages={stages} />
    </div>
  );
}
