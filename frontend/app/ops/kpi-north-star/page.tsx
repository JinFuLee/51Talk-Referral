"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { StatMiniCard } from "@/components/ui/StatMiniCard";
import { CCCheckinRanking } from "@/components/ops/CCCheckinRanking";
import { CheckinCoefScatter } from "@/components/biz/CheckinCoefScatter";
import { CheckinMultiplierCard } from "@/components/biz/CheckinMultiplierCard";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface NorthStarCC {
  cc_name: string;
  team?: string | null;
  checkin_24h_rate?: number | null;
  checkin_24h_target?: number | null;
  achievement_rate?: number | null;
  referral_coefficient?: number | null;
}

interface NorthStarSummary {
  avg_checkin_24h_rate?: number | null;
  target?: number | null;
  total_achievement?: number | null;
}

interface NorthStarData {
  by_cc: NorthStarCC[];
  by_team: unknown[];
  summary: NorthStarSummary;
  achieved_count: number;
  total_cc: number;
}

interface MergedCC {
  cc_name: string;
  team?: string | null;
  checkin_24h_rate?: number | null;
  checkin_monthly_rate?: number | null;
  referral_coefficient_24h?: number | null;
  referral_participation?: number | null;
  achievement_rate?: number | null;
  referral_participation_total?: number | null;
  referral_participation_checked?: number | null;
  referral_participation_unchecked?: number | null;
  checkin_multiplier?: number | null;
  referral_coefficient_monthly?: number | null;
  conversion_ratio?: number | null;
}

interface D5Summary {
  avg_checkin_rate?: number | null;
  avg_referral_participation?: number | null;
  avg_conversion_ratio?: number | null;
}

interface CheckinABData {
  merged: MergedCC[];
  d1_summary: NorthStarSummary;
  d5_summary: D5Summary;
}

export default function KPINorthStarPage() {
  const { data: northStar, isLoading: loadingNS } = useSWR<NorthStarData>(
    `${BASE}/api/analysis/north-star`,
    fetcher
  );
  const { data: checkinAB, isLoading: loadingAB } = useSWR<CheckinABData>(
    `${BASE}/api/analysis/checkin-ab`,
    fetcher
  );

  const isLoading = loadingNS || loadingAB;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const byCC = northStar?.by_cc ?? [];
  const summary = northStar?.summary ?? {};
  const achievedCount = northStar?.achieved_count ?? 0;
  const totalCC = northStar?.total_cc ?? 0;
  const target = summary.target ?? 0;
  const avgRate = summary.avg_checkin_24h_rate ?? 0;

  const merged = checkinAB?.merged ?? [];
  const d5Summary = checkinAB?.d5_summary ?? {};

  const achievedPct = totalCC > 0 ? Math.round((achievedCount / totalCC) * 100) : 0;

  return (
    <div className="max-w-none space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">北极星 · 24H 打卡率</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          D1 打卡率排名 · D5 月度打卡系数 · D1×D5 散点分析
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatMiniCard
          label="团队达标率"
          value={`${achievedPct}%`}
          sub={`${achievedCount}/${totalCC} 人达标`}
          accent={achievedPct >= 80 ? "green" : achievedPct >= 60 ? "yellow" : "red"}
        />
        <StatMiniCard
          label="团队均值"
          value={`${(avgRate * 100).toFixed(1)}%`}
          sub="24H 打卡率"
          accent="blue"
        />
        <StatMiniCard
          label="目标打卡率"
          value={target > 0 ? `${(target * 100).toFixed(0)}%` : "—"}
          sub="当月目标"
          accent="slate"
        />
        <StatMiniCard
          label="D5 月均参与"
          value={
            d5Summary.avg_referral_participation != null
              ? d5Summary.avg_referral_participation.toFixed(1)
              : "—"
          }
          sub="人均带新参与次数"
          accent="slate"
        />
      </div>

      {/* CC Ranking */}
      <Card title="CC 24H 打卡率排名">
        <CCCheckinRanking
          byCC={byCC}
          achievedCount={achievedCount}
          totalCC={totalCC}
          target={target}
        />
      </Card>

      {/* Scatter + Multiplier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="打卡率 × 带新系数 散点图">
          <CheckinCoefScatter data={merged} />
        </Card>
        <Card title="打卡倍率分析">
          <CheckinMultiplierCard
            data={merged}
            d5Summary={d5Summary}
            totalCC={totalCC}
            achievedCount={achievedCount}
          />
        </Card>
      </div>
    </div>
  );
}
