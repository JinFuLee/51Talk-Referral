"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { AlertTriangle, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { swrFetcher } from "@/lib/api";

interface ZeroStudent {
  student_id?: string;
  cc_name?: string;
  team?: string;
  first_paid_date?: string;
  enclosure_segment: string;
  days_since_paid?: number | null;
}

interface CCEntry {
  team?: string | null;
  count: number;
}

interface AlertData {
  zero_followup_students: ZeroStudent[];
  total_zero: number;
  total_students: number;
  zero_rate: number;
  by_enclosure: Record<string, number>;
  by_cc: Record<string, CCEntry>;
}

interface FollowupAlertSlideProps {
  revealStep: number;
}

const ENCLOSURE_LABELS: Record<string, string> = {
  "0-30": "0–30天",
  "31-60": "31–60天",
  "61-90": "61–90天",
  "91-180": "91–180天",
  "181+": "181天+",
};

const ENCLOSURE_DANGER: Record<string, string> = {
  "0-30": "bg-red-500",
  "31-60": "bg-orange-400",
  "61-90": "bg-amber-400",
  "91-180": "bg-yellow-300",
  "181+": "bg-slate-300",
};

export function FollowupAlertSlide({ revealStep }: FollowupAlertSlideProps) {
  const { data, error } = useSWR<AlertData>("/api/analysis/paid-followup-alert", swrFetcher);

  const totalZero = data?.total_zero ?? 0;
  const totalStudents = data?.total_students ?? 0;
  const zeroRate = data?.zero_rate ?? 0;
  const byCC = Object.entries(data?.by_cc ?? {})
    .map(([name, entry]) => ({ name, count: entry.count, team: entry.team }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const enclosureData = Object.entries(data?.by_enclosure ?? {})
    .map(([seg, count]) => ({
      name: ENCLOSURE_LABELS[seg] ?? seg,
      count,
      color: ENCLOSURE_DANGER[seg] ?? "bg-slate-400",
    }))
    .sort((a, b) => {
      const order = ["0–30天", "31–60天", "61–90天", "91–180天", "181天+"];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-lg">
        跟进预警数据加载失败
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Title */}
      <div
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
        className="text-center"
      >
        <h2 className="text-3xl font-extrabold text-slate-800">零跟进预警</h2>
        <p className="text-sm text-slate-500 mt-1">Followup Alert — 本月未被任何 CC 外呼的付费学员</p>
      </div>

      {/* Alert Numbers */}
      <div
        className="grid grid-cols-3 gap-4"
        style={{ opacity: revealStep >= 1 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-6 text-center">
          <AlertTriangle className="w-7 h-7 text-red-500 mx-auto mb-2" />
          <div className="text-5xl font-extrabold text-red-700">{totalZero.toLocaleString()}</div>
          <div className="text-sm text-red-600 mt-1">零跟进学员</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <Users className="w-7 h-7 text-slate-400 mx-auto mb-2" />
          <div className="text-5xl font-extrabold text-slate-700">{totalStudents.toLocaleString()}</div>
          <div className="text-sm text-slate-500 mt-1">有效学员总数</div>
        </div>
        <div
          className={clsx(
            "rounded-2xl border-2 p-6 text-center",
            zeroRate > 0.3 ? "border-red-300 bg-red-50" : zeroRate > 0.15 ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"
          )}
        >
          <div
            className={clsx(
              "text-5xl font-extrabold",
              zeroRate > 0.3 ? "text-red-700" : zeroRate > 0.15 ? "text-amber-700" : "text-green-700"
            )}
          >
            {(zeroRate * 100).toFixed(1)}%
          </div>
          <div
            className={clsx(
              "text-sm mt-1",
              zeroRate > 0.3 ? "text-red-600" : zeroRate > 0.15 ? "text-amber-600" : "text-green-600"
            )}
          >
            零跟进率
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6">
        {/* CC List */}
        <div
          className="flex-1 rounded-xl border border-slate-200 bg-white p-4 overflow-hidden"
          style={{ opacity: revealStep >= 2 ? 1 : 0, transition: "opacity 0.5s ease" }}
        >
          <div className="text-sm font-semibold text-slate-600 mb-3">CC 零跟进名单 (Top 10)</div>
          <div className="space-y-2">
            {byCC.length === 0 && (
              <div className="text-slate-400 text-sm text-center py-4">暂无数据</div>
            )}
            {byCC.map((cc, i) => (
              <div
                key={cc.name}
                className={clsx(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                  i < 3 ? "bg-red-50 border border-red-100" : "bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white",
                      i < 3 ? "bg-red-500" : "bg-slate-400"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={clsx("font-medium", i < 3 ? "text-red-800" : "text-slate-700")}>
                    {cc.name}
                  </span>
                </div>
                <span className={clsx("font-bold", i < 3 ? "text-red-700" : "text-slate-600")}>
                  {cc.count} 人
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Enclosure Distribution */}
        <div
          className="flex-1 rounded-xl border border-slate-200 bg-white p-4"
          style={{ opacity: revealStep >= 3 ? 1 : 0, transition: "opacity 0.5s ease" }}
        >
          <div className="text-sm font-semibold text-slate-600 mb-3">围场分布（付费起算天数）</div>
          {enclosureData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={enclosureData} barCategoryGap="30%">
                <XAxis tickLine={false} axisLine={false} dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), "人数"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {enclosureData.map((entry, i) => {
                    const hexColors: Record<string, string> = {
                      "bg-red-500": "#ef4444",
                      "bg-orange-400": "#fb923c",
                      "bg-amber-400": "#fbbf24",
                      "bg-yellow-300": "#fcd34d",
                      "bg-slate-300": "#cbd5e1",
                      "bg-slate-400": "#94a3b8",
                    };
                    return <Cell key={`cell-${i}`} fill={hexColors[entry.color] ?? "#6366f1"} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              暂无围场数据
            </div>
          )}
          <div className="mt-2 text-xs text-slate-400 text-center">
            红色=高危（0–30天新用户未被跟进）
          </div>
        </div>
      </div>
    </div>
  );
}
