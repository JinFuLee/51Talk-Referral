"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  ZAxis,
} from "recharts";
import useSWR from "swr";
import { Spinner } from "@/components/ui/Spinner";
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

interface SectionRow {
  cc_name: string;
  contact_rate: number;
  reserve_rate: number;
  attend_rate: number;
  paid_rate: number;
}

interface SectionEfficiencyResponse {
  sections: SectionRow[];
}

const MOCK: SectionRow[] = [
  { cc_name: "CC-A", contact_rate: 0.78, reserve_rate: 0.55, attend_rate: 0.50, paid_rate: 0.45 },
  { cc_name: "CC-B", contact_rate: 0.82, reserve_rate: 0.48, attend_rate: 0.40, paid_rate: 0.28 },
  { cc_name: "CC-C", contact_rate: 0.45, reserve_rate: 0.60, attend_rate: 0.55, paid_rate: 0.50 },
  { cc_name: "CC-D", contact_rate: 0.40, reserve_rate: 0.35, attend_rate: 0.28, paid_rate: 0.20 },
  { cc_name: "CC-E", contact_rate: 0.70, reserve_rate: 0.65, attend_rate: 0.60, paid_rate: 0.55 },
];

// 四象限颜色：高触达高转化=绿, 高触达低转化=黄, 低触达高转化=蓝, 低触达低转化=红
function quadrantColor(contactRate: number, paidRate: number, midX: number, midY: number): string {
  const highContact = contactRate >= midX;
  const highPaid = paidRate >= midY;
  if (highContact && highPaid) return "hsl(var(--success))"; // 绿
  if (highContact && !highPaid) return "hsl(var(--chart-amber))"; // 黄
  if (!highContact && highPaid) return "hsl(var(--chart-4))"; // 蓝
  return "hsl(var(--chart-rose))"; // 红
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: SectionRow;
  color?: string;
}

function CustomDot({ cx = 0, cy = 0, payload, color }: CustomDotProps) {
  if (!payload) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.8} />
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fontSize={10}
        fill="hsl(var(--foreground))"
      >
        {payload.cc_name}
      </text>
    </g>
  );
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function SectionEfficiencyQuadrant() {
  const { data, isLoading, error } = useSWR<SectionEfficiencyResponse>(
    "section-efficiency",
    () => fetch("/api/analysis/section-efficiency").then((r) => r.json())
  );

  const rows: SectionRow[] =
    data?.sections && data.sections.length > 0 ? data.sections : MOCK;

  // 计算中点（用于四象限分割线）
  const midX =
    rows.reduce((s, r) => s + r.contact_rate, 0) / (rows.length || 1);
  const midY =
    rows.reduce((s, r) => s + r.paid_rate, 0) / (rows.length || 1);

  const colored = rows.map((r) => ({
    ...r,
    color: quadrantColor(r.contact_rate, r.paid_rate, midX, midY),
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        数据加载失败，显示示例数据
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        X轴：触达率 · Y轴：付费转化率 · 四象限颜色：
        <span className="text-emerald-500 ml-1">绿=高触达高转化</span>
        <span className="text-amber-500 ml-1">黄=高触达低转化</span>
        <span className="text-indigo-500 ml-1">蓝=低触达高转化</span>
        <span className="text-rose-500 ml-1">红=低触达低转化</span>
      </p>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT.lg} aria-label="效率四象限散点图">
        <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            dataKey="contact_rate"
            name="触达率"
            tickFormatter={pct}
            tick={{ fontSize: CHART_FONT_SIZE.md }}
            domain={[0, 1]}
            label={{ value: "触达率", position: "insideBottomRight", offset: -4, fontSize: CHART_FONT_SIZE.md }}
          />
          <YAxis
            type="number"
            dataKey="paid_rate"
            name="付费率"
            tickFormatter={pct}
            tick={{ fontSize: CHART_FONT_SIZE.md }}
            domain={[0, 1]}
            label={{ value: "付费率", angle: -90, position: "insideLeft", fontSize: CHART_FONT_SIZE.md }}
          />
          <ZAxis range={[60, 60]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value: number) => pct(value)}
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const d = payload[0]?.payload as SectionRow;
              return (
              <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-xl shadow-flash p-2 text-xs">
                  <p className="font-semibold text-slate-700">{d.cc_name}</p>
                  <p>触达率：{pct(d.contact_rate)}</p>
                  <p>预约率：{pct(d.reserve_rate)}</p>
                  <p>出席率：{pct(d.attend_rate)}</p>
                  <p>付费率：{pct(d.paid_rate)}</p>
                </div>
              );
            }}
          />
          <ReferenceLine
            x={midX}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            label={{ value: "均值", fontSize: CHART_FONT_SIZE.sm, fill: "hsl(var(--muted-foreground))" }}
          />
          <ReferenceLine
            y={midY}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            label={{ value: "均值", fontSize: CHART_FONT_SIZE.sm, fill: "hsl(var(--muted-foreground))" }}
          />
          <Scatter
            data={colored}
            shape={(props: CustomDotProps & { payload?: SectionRow & { color?: string } }) => (
              <CustomDot
                cx={props.cx}
                cy={props.cy}
                payload={props.payload}
                color={props.payload?.color ?? "hsl(var(--chart-4))"}
              />
            )}
          >
            {colored.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
