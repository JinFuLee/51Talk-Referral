"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/hooks";
import { ZeroFollowupAlert } from "@/components/ops/ZeroFollowupAlert";
import { PrePostCompareChart } from "@/components/ops/PrePostCompareChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { PageHeader } from "@/components/layout/PageHeader";
import { OPS_PAGE } from "@/lib/layout";

interface ZeroStudent {
  student_id?: string;
  cc_name?: string;
  team?: string;
  first_paid_date?: string;
  enclosure_segment: string;
  days_since_paid?: number | null;
  monthly_called?: number;
  monthly_connected?: number;
  monthly_effective?: number;
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

interface CCRecord {
  channel?: string;
  team?: string;
  cc_name?: string;
  trial_classes?: number;
  attended?: number;
  pre_call_rate?: number;
  pre_connect_rate?: number;
  pre_effective_rate?: number;
  post_call_rate?: number;
  post_connect_rate?: number;
  post_effective_rate?: number;
  pre_called?: number;
  pre_connected?: number;
  post_called?: number;
  post_connected?: number;
}

interface ChannelSummary {
  pre_call_rate?: number;
  pre_connect_rate?: number;
  pre_effective_rate?: number;
  post_call_rate?: number;
  post_connect_rate?: number;
  post_effective_rate?: number;
}

interface CompareData {
  by_cc: CCRecord[];
  by_team: CCRecord[];
  by_channel: Record<string, ChannelSummary>;
  summary: ChannelSummary;
}

export default function FollowupAlertPage() {
  const { t } = useTranslation();
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [alertLoading, setAlertLoading] = useState(true);
  const [alertError, setAlertError] = useState<string | null>(null);

  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [compareLoading, setCompareLoading] = useState(true);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/analysis/paid-followup-alert`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: AlertData) => {
        setAlertData(d);
        setAlertError(null);
      })
      .catch((e: Error) => setAlertError(e.message))
      .finally(() => setAlertLoading(false));

    fetch(`/api/analysis/trial-class-compare`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: CompareData) => {
        setCompareData(d);
        setCompareError(null);
      })
      .catch((e: Error) => setCompareError(e.message))
      .finally(() => setCompareLoading(false));
  }, []);

  const isLoading = alertLoading || compareLoading;
  const isError = alertError || compareError;

  return (
    <div className={OPS_PAGE}>
      <PageHeader title={t("ops.followup-alert.title")} subtitle={t("ops.followup-alert.subtitle")} />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      ) : isError && !alertData && !compareData ? (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
          数据加载失败，请刷新重试
        </div>
      ) : (
        <ErrorBoundary>
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              {t("ops.followup-alert.section.zeroAlert")}
            </h2>
            <ZeroFollowupAlert
              data={alertData}
              isLoading={alertLoading}
              error={alertError}
            />
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              {t("ops.followup-alert.section.prePost")}
            </h2>
            <PrePostCompareChart
              data={compareData}
              isLoading={compareLoading}
              error={compareError}
            />
          </section>
        </ErrorBoundary>
      )}
    </div>
  );
}
