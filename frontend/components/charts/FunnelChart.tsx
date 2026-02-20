"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

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

const FUNNEL_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c026d3"];

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

export function FunnelChart({ stages: stagesProp, data, title }: FunnelChartProps) {
  const stages: FunnelStage[] = stagesProp ?? (data ? funnelDataToStages(data) : []);

  return (
    <div>
      {title && <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          layout="vertical"
          data={stages}
          margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
          <Tooltip formatter={(value) => [value, "人数"]} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {stages.map((_, i) => (
              <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
