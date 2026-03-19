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
import type { EnclosureCCMetrics } from "@/lib/types/enclosure";

interface MetricRadarProps {
  metrics: EnclosureCCMetrics;
}

export function MetricRadar({ metrics }: MetricRadarProps) {
  const data = [
    { subject: "参与率", value: Math.round(metrics.participation_rate * 100), fullMark: 100 },
    { subject: "带新系数", value: Math.min(Math.round(metrics.new_coefficient * 50), 100), fullMark: 100 },
    { subject: "带货比", value: Math.round(metrics.cargo_ratio * 100), fullMark: 100 },
    { subject: "打卡率", value: Math.round(metrics.checkin_rate * 100), fullMark: 100 },
    { subject: "触达率", value: Math.round(metrics.cc_reach_rate * 100), fullMark: 100 },
  ];

  return (
    <div className="w-full">
      <p className="text-xs text-slate-400 mb-2 text-center">{metrics.cc_name} — 指标雷达图</p>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            tickCount={4}
          />
          <Radar
            name={metrics.cc_name}
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value}%`, name]}
            contentStyle={{ fontSize: 12 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
