"use client";

import { useMemo } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MemberProfileResponse } from "@/lib/types/member";

interface CompetenceRadarProps {
  radar: MemberProfileResponse["radar"];
  hiredays?: number;
}

const DIMENSION_ORDER = [
  "触达穿透",
  "邀约手腕",
  "出勤保障",
  "临门一脚",
  "服务覆盖",
  "价值单产",
];

export function CompetenceRadar({ radar, hiredays = 30 }: CompetenceRadarProps) {
  const isNewbie = hiredays < 7;

  const missingCount = useMemo(
    () => (radar?.personal ?? []).filter((v) => v === 0).length,
    [radar?.personal]
  );

  const allMissing = useMemo(
    () => (radar?.personal ?? []).every((v) => v === 0),
    [radar?.personal]
  );

  if (isNewbie) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">转化心智六边形雷达</h3>
        <div className="flex items-center justify-center h-56 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-sm text-slate-400 text-center px-4">
            数据积累中，入职满 7 天后启用
          </p>
        </div>
      </div>
    );
  }

  if (allMissing || !radar?.personal?.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">转化心智六边形雷达</h3>
        <div className="flex items-center justify-center h-56 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-sm text-slate-400 text-center px-4">
            F1/F7/F8/E7/E8 数据源未加载，请先运行数据分析
          </p>
        </div>
      </div>
    );
  }

  // Map dimensions to chart data
  const dimensions = radar.dimensions.length > 0 ? radar.dimensions : DIMENSION_ORDER;
  const chartData = dimensions.map((dim, i) => ({
    dimension: dim,
    personal: radar.personal[i] ?? 0,
    benchmark: radar.benchmark[i] ?? 50,
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">转化心智六边形雷达</h3>
      <p className="text-xs text-slate-400 mb-4">
        维度：触达穿透 / 邀约手腕 / 出勤保障 / 临门一脚 / 服务覆盖 / 价值单产
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tickCount={5}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            axisLine={false}
          />
          <Radar
            name="团队基准"
            dataKey="benchmark"
            stroke="#94a3b8"
            fill="transparent"
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
          <Radar
            name="个人"
            dataKey="personal"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.18}
            strokeWidth={2}
          />
          <Legend
            iconSize={10}
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value) => (
              <span className="text-slate-600">{value}</span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>

      {missingCount > 0 && missingCount < dimensions.length && (
        <p className="text-xs text-amber-600 mt-2 text-center">
          {missingCount} 个维度因数据缺失显示为 0，结果仅供参考
        </p>
      )}
    </div>
  );
}
