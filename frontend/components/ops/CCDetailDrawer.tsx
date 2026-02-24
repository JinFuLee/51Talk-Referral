"use client";

import { useEffect } from "react";
import { X, Trophy, TrendingUp, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";

export interface CCDetailProps {
  isOpen: boolean;
  onClose: () => void;
  ccName: string;
}

interface FollowupEntry {
  date: string;
  type: string;
  count: number;
  connects?: number;
  effective?: number;
}

interface MonthlyTrendEntry {
  month: string;
  registrations: number;
  payments: number;
  revenue_usd: number;
}

interface RadarScores {
  process: number;
  result: number;
  efficiency: number;
}

interface CCDetailData {
  cc_name: string;
  rank?: number;
  composite_score?: number;
  team?: string;
  registrations?: number;
  payments?: number;
  revenue_usd?: number;
  checkin_rate?: number;
  conversion_rate?: number;
  followup_history: FollowupEntry[];
  monthly_trend: MonthlyTrendEntry[];
  radar_scores: RadarScores;
}

function pct(v?: number | null) {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export function CCDetailDrawer({ isOpen, onClose, ccName }: CCDetailProps) {
  const encodedName = encodeURIComponent(ccName);
  const { data, isLoading, error } = useSWR<CCDetailData>(
    isOpen && ccName ? `/api/analysis/cc-detail/${encodedName}` : null,
    swrFetcher
  );

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const rankLabel = data?.rank != null
    ? `第 ${data.rank} 名 / 共 ${data?.composite_score != null ? `综合分 ${data.composite_score.toFixed(1)}` : ""}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-[480px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-slate-800">{ccName || "CC 姓名"}</h2>
            {data?.rank != null && data.rank <= 3 && (
              <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold">
                <Trophy className="w-3 h-3" />
                <span>Top {data.rank}</span>
              </div>
            )}
          </div>
          {isLoading && (
            <p className="text-sm text-slate-400">加载中…</p>
          )}
          {error && (
            <p className="text-sm text-rose-500">数据加载失败：{String(error?.message ?? error)}</p>
          )}
          {data && !isLoading && (
            <p className="text-sm text-slate-500">
              {rankLabel}
              {data.conversion_rate != null && ` | 本月转化率 ${pct(data.conversion_rate)}`}
              {data.checkin_rate != null && ` | 打卡率 ${pct(data.checkin_rate)}`}
            </p>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Key Metrics */}
          {data && (
            <section className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg px-3 py-3 text-center">
                <p className="text-xs text-slate-400 mb-1">注册数</p>
                <p className="text-lg font-bold text-slate-800">{data.registrations ?? "—"}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-3 text-center">
                <p className="text-xs text-slate-400 mb-1">付费数</p>
                <p className="text-lg font-bold text-slate-800">{data.payments ?? "—"}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-3 text-center">
                <p className="text-xs text-slate-400 mb-1">业绩(USD)</p>
                <p className="text-lg font-bold text-slate-800">
                  {data.revenue_usd != null ? `$${data.revenue_usd.toLocaleString()}` : "—"}
                </p>
              </div>
            </section>
          )}

          {/* Radar Scores */}
          {data?.radar_scores && (
            <section>
              <h3 className="text-sm font-bold text-slate-800 mb-3">三维得分</h3>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["过程", data.radar_scores.process],
                  ["结果", data.radar_scores.result],
                  ["效率", data.radar_scores.efficiency],
                ] as [string, number][]).map(([label, score]) => (
                  <div key={label} className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-blue-400 mb-1">{label}</p>
                    <p className="text-base font-bold text-blue-700">{score.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Followup History */}
          {data && data.followup_history.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-slate-400" />
                外呼跟进记录（近期）
              </h3>
              <div className="relative border-l-2 border-slate-100 ml-2 space-y-4">
                {data.followup_history.slice(0, 6).map((item) => (
                  <div key={item.date} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white bg-blue-400" />
                    <p className="text-xs text-slate-400 mb-0.5">{item.date}</p>
                    <p className="text-sm text-slate-700">
                      外呼 {item.count} 次
                      {item.connects != null && `，接通 ${item.connects} 次`}
                      {item.effective != null && `，有效 ${item.effective} 次`}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Monthly Trend */}
          {data && data.monthly_trend.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                月度趋势（注册 / 付费）
              </h3>
              <div className="h-48 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthly_trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Line type="monotone" dataKey="registrations" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} name="注册" />
                    <Line type="monotone" dataKey="payments" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} name="付费" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* No data / loading states */}
          {isLoading && (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
              加载中…
            </div>
          )}
          {!isLoading && error && (
            <div className="flex items-center justify-center h-40 text-rose-400 text-sm">
              无法加载 {ccName} 的详情数据
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
