"use client";

import useSWR from "swr";
import { useTranslation } from "@/lib/hooks";
import { formatRate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatMiniCard } from "@/components/ui/StatMiniCard";
import { CCCheckinRanking } from "@/components/ops/CCCheckinRanking";
import { CheckinCoefScatter } from "@/components/biz/CheckinCoefScatter";
import { CheckinMultiplierCard } from "@/components/biz/CheckinMultiplierCard";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { swrFetcher } from "@/lib/api";
import { useConfigStore } from "@/lib/stores/config-store";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

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
  const { t } = useTranslation();
  const focusCC = useConfigStore((s) => s.focusCC);
  const nsParams = new URLSearchParams();
  if (focusCC) nsParams.set("cc_name", focusCC);
  const nsKey = `/api/analysis/north-star${nsParams.toString() ? "?" + nsParams.toString() : ""}`;

  const { data: northStar, isLoading: loadingNS } = useSWR<NorthStarData>(
    [nsKey, focusCC],
    () => swrFetcher(nsKey)
  );
  const { data: checkinAB, isLoading: loadingAB } = useSWR<CheckinABData>(
    `/api/analysis/checkin-ab`,
    swrFetcher
  );

  const isLoading = loadingNS || loadingAB;

  if (isLoading) {
    return (
      <div className="max-w-none space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
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
    <div className={OPS_PAGE}>
      <PageHeader title={t("ops.kpi-north-star.title")} subtitle={t("ops.kpi-north-star.subtitle")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatMiniCard
          label={t("ops.kpi-north-star.card.teamAchievement")}
          value={`${achievedPct}%`}
          sub={`${achievedCount}/${totalCC} 人达标`}
          accent={achievedPct >= 80 ? "green" : achievedPct >= 60 ? "yellow" : "red"}
        />
        <StatMiniCard
          label={t("ops.kpi-north-star.card.teamAvg")}
          value={formatRate(avgRate)}
          sub="24H 打卡率"
          accent="blue"
        />
        <StatMiniCard
          label={t("ops.kpi-north-star.card.target")}
          value={target > 0 ? `${(target * 100).toFixed(0)}%` : "—"}
          sub="当月目标"
          accent="slate"
        />
        <StatMiniCard
          label={t("ops.kpi-north-star.card.d5Monthly")}
          value={
            d5Summary.avg_referral_participation != null
              ? d5Summary.avg_referral_participation.toFixed(1)
              : "—"
          }
          sub="人均带新参与次数"
          accent="slate"
        />
      </div>

      <ErrorBoundary>
        <Card title={t("ops.kpi-north-star.card.ranking")}>
          <CCCheckinRanking
            byCC={byCC}
            achievedCount={achievedCount}
            totalCC={totalCC}
            target={target}
          />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title={t("ops.kpi-north-star.card.scatter")}>
            <CheckinCoefScatter data={merged} />
          </Card>
          <Card title={t("ops.kpi-north-star.card.multiplier")}>
            <CheckinMultiplierCard
              data={merged}
              d5Summary={d5Summary}
              totalCC={totalCC}
              achievedCount={achievedCount}
            />
          </Card>
        </div>
      </ErrorBoundary>
    </div>
  );
}
