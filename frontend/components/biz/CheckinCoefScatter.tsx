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
  Label,
} from "recharts";

interface MergedCC {
  cc_name: string;
  team?: string | null;
  checkin_24h_rate?: number | null;
  referral_coefficient_24h?: number | null;
  conversion_ratio?: number | null;
}

interface CheckinCoefScatterProps {
  data: MergedCC[];
}

interface TooltipPayload {
  payload: {
    cc_name: string;
    x: number;
    y: number;
    z: number;
    team?: string | null;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700">{d.cc_name}</p>
      {d.team && <p className="text-slate-400">{d.team}</p>}
      <p className="mt-1 text-slate-600">
        24H 打卡率: <span className="font-medium">{(d.x * 100).toFixed(1)}%</span>
      </p>
      <p className="text-slate-600">
        带新系数: <span className="font-medium">{d.y.toFixed(2)}</span>
      </p>
      <p className="text-slate-600">
        转化率: <span className="font-medium">{(d.z * 100).toFixed(1)}%</span>
      </p>
    </div>
  );
}

function getQuadrantLabel(x: number, y: number, meanX: number, meanY: number) {
  if (x >= meanX && y >= meanY) return { label: "明星", color: "#10b981" };
  if (x >= meanX && y < meanY) return { label: "待激活", color: "#f59e0b" };
  if (x < meanX && y >= meanY) return { label: "天赋型", color: "#3b82f6" };
  return { label: "需关注", color: "#ef4444" };
}

export function CheckinCoefScatter({ data }: CheckinCoefScatterProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        暂无散点图数据
      </div>
    );
  }

  const points = data.map((cc) => ({
    cc_name: cc.cc_name,
    team: cc.team,
    x: cc.checkin_24h_rate ?? 0,
    y: cc.referral_coefficient_24h ?? 0,
    z: cc.conversion_ratio ?? 0,
  }));

  const meanX = points.reduce((s, p) => s + p.x, 0) / points.length;
  const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;

  const coloredPoints = points.map((p) => ({
    ...p,
    fill: getQuadrantLabel(p.x, p.y, meanX, meanY).color,
  }));

  return (
    <div className="space-y-3">
      {/* Quadrant legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { label: "明星", color: "#10b981", desc: "高打卡 + 高系数" },
          { label: "待激活", color: "#f59e0b", desc: "高打卡 + 低系数" },
          { label: "天赋型", color: "#3b82f6", desc: "低打卡 + 高系数" },
          { label: "需关注", color: "#ef4444", desc: "低打卡 + 低系数" },
        ].map((q) => (
          <span key={q.label} className="flex items-center gap-1 text-slate-500">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: q.color }}
            />
            <span className="font-medium" style={{ color: q.color }}>
              {q.label}
            </span>
            <span className="text-slate-400">({q.desc})</span>
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 16, right: 24, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, 1]}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          >
            <Label
              value="24H 打卡率"
              position="insideBottom"
              offset={-12}
              style={{ fontSize: 11, fill: "#94a3b8" }}
            />
          </XAxis>
          <YAxis
            dataKey="y"
            type="number"
            tickFormatter={(v) => v.toFixed(1)}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          >
            <Label
              value="带新系数"
              angle={-90}
              position="insideLeft"
              offset={12}
              style={{ fontSize: 11, fill: "#94a3b8" }}
            />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          {/* Mean reference lines */}
          <ReferenceLine
            x={meanX}
            stroke="#cbd5e1"
            strokeDasharray="4 2"
            label={{ value: "均值", position: "top", fontSize: 10, fill: "#94a3b8" }}
          />
          <ReferenceLine
            y={meanY}
            stroke="#cbd5e1"
            strokeDasharray="4 2"
            label={{ value: "均值", position: "right", fontSize: 10, fill: "#94a3b8" }}
          />
          <Scatter
            data={coloredPoints}
            shape={(props: unknown) => {
              const { cx, cy, payload } = props as {
                cx: number;
                cy: number;
                payload: { fill: string; z: number };
              };
              const r = 5 + Math.min(payload.z * 20, 10);
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={payload.fill}
                  fillOpacity={0.75}
                  stroke={payload.fill}
                  strokeWidth={1}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400">
        点大小 = 转化率 · 虚线 = 全员均值
      </p>
    </div>
  );
}
