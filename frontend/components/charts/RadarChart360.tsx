"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface RadarDataPoint {
  subject: string;
  value: number;  // 0~100 normalized
  fullMark?: number;
}

interface RadarChart360Props {
  data: RadarDataPoint[];
  name?: string;
  color?: string;
}

export function RadarChart360({ data, name = "综合指标", color = "#3b82f6" }: RadarChart360Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        选择一名成员查看 360° 指标
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart cx="50%" cy="50%" outerRadius={80} data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#64748b" }} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickCount={4}
        />
        <Radar
          name={name}
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.25}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
        />
        <Tooltip formatter={(v: number) => [`${v.toFixed(1)}`, name]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
