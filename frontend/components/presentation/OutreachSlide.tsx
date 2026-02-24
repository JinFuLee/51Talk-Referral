"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { Phone, PhoneCall, PhoneIncoming } from "lucide-react";
import { swrFetcher } from "@/lib/api";

interface OutreachSummary {
  total_calls: number;
  total_connects: number;
  total_effective: number;
  effective_rate: number;
  connect_rate: number;
  avg_daily: number;
  top_cc: string;
}

interface HeatmapCell {
  cc_name: string;
  date: string;
  calls: number;
  connects: number;
  effective: number;
  effective_rate: number;
}

interface HeatmapData {
  dates: string[];
  cc_names: string[];
  data: HeatmapCell[];
  summary: OutreachSummary;
}

interface OutreachTeamEntry {
  team: string;
  calls: number;
  connects: number;
  effective: number;
}

interface OutreachSlideProps {
  revealStep: number;
}

function BigStatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  visible,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  visible: boolean;
}) {
  return (
    <div
      className={clsx("rounded-2xl border p-8 flex flex-col items-center gap-2 text-center", color)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <Icon className="w-8 h-8 mb-1 opacity-70" />
      <div className="text-5xl font-extrabold leading-none">{value}</div>
      <div className="text-sm font-semibold">{label}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </div>
  );
}

// Simplified 7-day heatmap (days × time slots aggregated by intensity)
function MiniHeatmap({
  data,
  dates,
  visible,
}: {
  data: HeatmapCell[];
  dates: string[];
  visible: boolean;
}) {
  if (!data.length || !dates.length) {
    return (
      <div
        className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex items-center justify-center text-slate-400 text-sm"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        暂无外呼热力数据
      </div>
    );
  }

  const last7 = dates.slice(-7);

  // Aggregate calls per date across all CC
  const dayTotals = last7.map((date) => {
    const cells = data.filter((c) => c.date === date);
    const total = cells.reduce((s, c) => s + c.calls, 0);
    return { date, total };
  });

  const maxCalls = Math.max(...dayTotals.map((d) => d.total), 1);

  const intensityClass = (n: number) => {
    const ratio = n / maxCalls;
    if (ratio === 0) return "bg-slate-100";
    if (ratio < 0.25) return "bg-blue-100";
    if (ratio < 0.5) return "bg-blue-300";
    if (ratio < 0.75) return "bg-blue-500";
    return "bg-blue-700";
  };

  const shortDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-6"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}
    >
      <div className="text-sm font-semibold text-slate-600 mb-4">近 7 日外呼量热力图</div>
      <div className="flex gap-3 items-end">
        {dayTotals.map(({ date, total }) => (
          <div key={date} className="flex flex-col items-center gap-1 flex-1">
            <div className="text-xs text-slate-500">{total.toLocaleString()}</div>
            <div
              className={clsx("w-full rounded-md", intensityClass(total))}
              style={{ height: `${Math.max(8, (total / maxCalls) * 80)}px` }}
            />
            <div className="text-xs text-slate-400">{shortDate(date)}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
        <span>低</span>
        {["bg-blue-100", "bg-blue-300", "bg-blue-500", "bg-blue-700"].map((c) => (
          <span key={c} className={clsx("w-5 h-3 rounded", c)} />
        ))}
        <span>高</span>
      </div>
    </div>
  );
}

export function OutreachSlide({ revealStep }: OutreachSlideProps) {
  const { data, error } = useSWR<HeatmapData>("/api/analysis/outreach-heatmap", swrFetcher);
  const { data: outreachData } = useSWR<{ by_team: OutreachTeamEntry[] }>(
    "/api/analysis/outreach-gap",
    swrFetcher
  );

  const summary = data?.summary ?? {
    total_calls: 0,
    total_connects: 0,
    total_effective: 0,
    effective_rate: 0,
    connect_rate: 0,
    avg_daily: 0,
    top_cc: "",
  };

  const byTeam = outreachData?.by_team ?? [];

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-lg">
        外呼数据加载失败
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
        <h2 className="text-3xl font-extrabold text-slate-800">外呼执行总览</h2>
        <p className="text-sm text-slate-500 mt-1">Outreach Execution — 本月累计</p>
      </div>

      {/* Big Numbers */}
      <div className="grid grid-cols-3 gap-4">
        <BigStatCard
          icon={Phone}
          label="外呼总量"
          value={summary.total_calls.toLocaleString()}
          sub={`日均 ${summary.avg_daily.toLocaleString()}`}
          color="border-blue-200 bg-blue-50 text-blue-800"
          visible={revealStep >= 1}
        />
        <BigStatCard
          icon={PhoneCall}
          label="接通量"
          value={summary.total_connects.toLocaleString()}
          sub={`接通率 ${summary.connect_rate != null ? (summary.connect_rate * 100).toFixed(1) : 0}%`}
          color="border-indigo-200 bg-indigo-50 text-indigo-800"
          visible={revealStep >= 1}
        />
        <BigStatCard
          icon={PhoneIncoming}
          label="有效接通(≥120s)"
          value={summary.total_effective.toLocaleString()}
          sub={`有效率 ${summary.effective_rate != null ? (summary.effective_rate * 100).toFixed(1) : 0}%`}
          color="border-emerald-200 bg-emerald-50 text-emerald-800"
          visible={revealStep >= 1}
        />
      </div>

      {/* Heatmap */}
      <div className="flex-1">
        <MiniHeatmap
          data={data?.data ?? []}
          dates={data?.dates ?? []}
          visible={revealStep >= 2}
        />
      </div>

      {/* Team Comparison */}
      {byTeam.length > 0 && (
        <div
          className="rounded-xl border border-slate-200 bg-white p-4"
          style={{
            opacity: revealStep >= 3 ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        >
          <div className="text-sm font-semibold text-slate-600 mb-3">团队对比</div>
          <div className="flex gap-4">
            {byTeam.slice(0, 4).map((team) => (
              <div key={team.team} className="flex-1 text-center">
                <div className="text-lg font-bold text-slate-800">
                  {team.calls.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">{team.team}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
