"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { MemberProfileResponse } from "@/lib/types/member";
import { CHART_FONT_SIZE, CHART_HEIGHT } from "@/lib/utils";

interface AnomalyTimelineProps {
  anomaly: MemberProfileResponse["anomaly"];
}

const FLAG_COLORS: Record<string, string> = {
  normal: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
  rest: "#cbd5e1",
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: { flag: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const { value, payload: { flag } } = payload[0];
  const flagLabel =
    flag === "normal" ? "正常" : flag === "yellow" ? "黄旗" : flag === "red" ? "红旗" : "休息日";
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-2 text-xs">
      <p className="text-slate-500">{label}</p>
      <p className="font-semibold text-slate-800">{value} 次</p>
      <p
        style={{
          color:
            flag === "normal"
              ? "#16a34a"
              : flag === "yellow"
              ? "#d97706"
              : flag === "red"
              ? "#dc2626"
              : "#94a3b8",
        }}
      >
        {flagLabel}
      </p>
    </div>
  );
}

export function AnomalyTimeline({ anomaly }: AnomalyTimelineProps) {
  if (!anomaly?.daily_calls?.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">外呼监测线（近30天）</h3>
        <div className="flex items-center justify-center h-56 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-sm text-slate-400 text-center px-4">
            外呼数据暂无，请确认 F5 宣宣_转介绍每日外呼数据 文件已上传
          </p>
        </div>
      </div>
    );
  }

  const workdayCalls = useMemo(
    () => anomaly.daily_calls.filter((d) => d.flag !== undefined),
    [anomaly.daily_calls]
  );

  const stats = useMemo(() => {
    const workdays = workdayCalls.filter(
      (d) => d.flag !== "rest" && d.count !== undefined
    );
    const qualified = workdays.filter((d) => d.count >= 25).length;
    const redDays = workdays.filter((d) => d.flag === "red").length;
    const yellowDays = workdays.filter((d) => d.flag === "yellow").length;
    const rate =
      workdays.length > 0 ? Math.round((qualified / workdays.length) * 100) : 0;
    return { rate, redDays, yellowDays };
  }, [workdayCalls]);

  const chartData = useMemo(
    () =>
      anomaly.daily_calls.map((d) => ({
        date: d.date.slice(5), // MM-DD
        count: d.count,
        flag: d.flag,
      })),
    [anomaly.daily_calls]
  );

  const displayedRedFlags = anomaly.red_flags.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">外呼监测线（近30天）</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">
            达标率{" "}
            <span className="font-semibold text-slate-800">{stats.rate}%</span>
          </span>
          <span className="text-red-600">
            红旗{" "}
            <span className="font-semibold">{stats.redDays}</span>天
          </span>
          <span className="text-amber-600">
            黄旗{" "}
            <span className="font-semibold">{stats.yellowDays}</span>天
          </span>
        </div>
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={CHART_HEIGHT.sm}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: CHART_FONT_SIZE.sm }}
            interval={4}
          />
          <YAxis
            domain={[0, 50]}
            tick={{ fontSize: CHART_FONT_SIZE.sm }}
            tickCount={6}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={25}
            stroke="#22c55e"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: "25", position: "right", fontSize: 10, fill: "#22c55e" }}
          />
          <ReferenceLine
            y={18}
            stroke="#ef4444"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: "18", position: "right", fontSize: 10, fill: "#ef4444" }}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.flag === "normal"
                    ? FLAG_COLORS.normal
                    : entry.flag === "yellow"
                    ? FLAG_COLORS.yellow
                    : entry.flag === "red"
                    ? FLAG_COLORS.red
                    : FLAG_COLORS.rest
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Red flags list */}
      {displayedRedFlags.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">红旗详情</p>
          <ul className="space-y-1">
            {displayedRedFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                <span className="mt-0.5 text-red-400">●</span>
                {flag}
              </li>
            ))}
            {anomaly.red_flags.length > 5 && (
              <li className="text-xs text-slate-400">
                还有 {anomaly.red_flags.length - 5} 条...
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
