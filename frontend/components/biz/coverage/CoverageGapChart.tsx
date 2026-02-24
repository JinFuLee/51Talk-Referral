"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { formatRevenue } from "@/lib/utils";

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function coverageColor(rate: number): string {
  if (rate >= 0.8) return "hsl(var(--success))";
  if (rate >= 0.6) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

interface FunnelStage {
  stage: string;
  count: number;
  rate: number;
  estimated_revenue_loss: number | null;
}

interface TooltipPayloadItem {
  payload: FunnelStage;
}

interface FunnelTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function FunnelTooltip({ active, payload }: FunnelTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash p-3 text-xs max-w-xs">
      <p className="font-semibold text-slate-700 mb-1">{item.stage}</p>
      <p className="text-slate-600">
        人数: <span className="font-medium">{item.count.toLocaleString()}</span>
      </p>
      <p className="text-slate-600">
        覆盖率: <span className="font-medium">{pct(item.rate)}</span>
      </p>
      {item.estimated_revenue_loss != null && (
        <p className="text-destructive mt-1">
          覆盖缺口对应损失:{" "}
          <span className="font-medium">{formatRevenue(item.estimated_revenue_loss)}</span>
        </p>
      )}
    </div>
  );
}

interface CoverageGapChartProps {
  funnel: FunnelStage[];
}

export default function CoverageGapChart({ funnel }: CoverageGapChartProps) {
  const funnelChartData = funnel.map((s) => ({
    ...s,
    fill: coverageColor(s.rate),
  }));

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">课前外呼漏斗</h3>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 400 }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              layout="vertical"
              data={funnelChartData}
              margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3"
                horizontal={false}
                stroke="hsl(var(--border))" />
              <XAxis type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v.toLocaleString()}
              />
              <YAxis type="category"
                dataKey="stage"
                width={72}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false} />
              <Tooltip content={<FunnelTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="rate"
                  position="right"
                  formatter={(v: number) => pct(v)}
                  style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                {funnelChartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
