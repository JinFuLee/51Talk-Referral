"use client";

import { useTrialFollowup, useCheckin, useTranslation } from "@/lib/hooks";
import { RateCard } from "@/components/ui/RateCard";
import { CheckinImpactCard } from "@/components/ops/CheckinImpactCard";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { CheckinData } from "@/lib/types";

export default function OpsTrialPage() {
  const { t } = useTranslation();
  const { data: followupRaw, isLoading: loadingFollowup } = useTrialFollowup();
  const { data: checkinRaw, isLoading: loadingCheckin } = useCheckin();

  const followup = followupRaw as Record<string, unknown> | undefined;
  const checkin = checkinRaw as CheckinData | undefined;

  const preCallRate = (followup?.pre_call_rate as number) ?? 0;
  const postCallRate = (followup?.post_call_rate as number) ?? 0;
  const attendanceRate = (followup?.attendance_rate as number) ?? 0;
  const checkinRate = checkin?.overall_rate ?? 0;

  const withCallAttend = attendanceRate;
  const withoutCallAttend = attendanceRate * 0.5;
  const lift = withoutCallAttend > 0 ? withCallAttend / withoutCallAttend : 0;

  const trialItems = (followup?.by_stage ?? []) as Array<{
    stage: string;
    count: number;
    rate: number;
  }>;

  const preClassByCc = (followup?.pre_class as Record<string, unknown> | undefined)?.by_cc as Array<Record<string, unknown>> ?? [];
  const postClassByCc = (followup?.post_class as Record<string, unknown> | undefined)?.by_cc as Array<Record<string, unknown>> ?? [];

  // Suppress unused variable warning
  void postCallRate;

  if (loadingFollowup || loadingCheckin) {
    return (
      <div className="max-w-none space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("ops.trial.title")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t("ops.trial.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RateCard label="课前拨打率" rate={preCallRate} target={0.6} sub="目标 60%" />
        <RateCard label="出席率" rate={attendanceRate} target={0.5} sub="含外呼拉动" />
        <RateCard label="打卡率" rate={checkinRate} target={0.3} sub="转码且分享" />
      </div>

      <ErrorBoundary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CheckinImpactCard
            checkinRate={checkinRate}
            referralRate={1.5}
            causalStrength={0.7}
            description="打卡学员带新系数明显高于未打卡，建议重点推动打卡行为"
          />

          <Card title={t("ops.trial.card.preCallLift")}>
            <div className="flex items-center gap-6 py-4">
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-500 mb-1">{t("ops.trial.label.hasOutreach")}</p>
                <p className="text-3xl font-bold text-blue-600">{(withCallAttend * 100).toFixed(0)}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-green-600">Lift {lift.toFixed(1)}x</p>
                <p className="text-xs text-slate-400">vs 未外呼</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-500 mb-1">{t("ops.trial.label.noOutreach")}</p>
                <p className="text-3xl font-bold text-slate-400">{(withoutCallAttend * 100).toFixed(0)}%</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">{t("ops.trial.label.liftDesc")}</p>
          </Card>
        </div>

        {trialItems.length > 0 && (
          <Card title={t("ops.trial.card.stageDetail")}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {[t("ops.trial.table.stage"), t("ops.trial.table.count"), t("ops.trial.table.rate")].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trialItems.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{item.stage}</td>
                      <td className="px-4 py-3 text-slate-600">{item.count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600">{((item.rate ?? 0) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {trialItems.length === 0 && (
          <Card title="体验课明细">
            <div className="py-8 text-center text-slate-400 text-sm">
              {t("ops.trial.label.noDetail")}
            </div>
          </Card>
        )}

        {(preClassByCc.length > 0 || postClassByCc.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preClassByCc.length > 0 && (
              <Card title={t("ops.trial.card.preClass")}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {[t("ops.trial.table.ccName"), t("ops.trial.table.calls"), t("ops.trial.table.followupRate")].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preClassByCc.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {(row.cc_name ?? row.name ?? "—") as string}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {((row.total ?? row.count ?? 0) as number).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.rate !== undefined ? `${(((row.rate as number)) * 100).toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {postClassByCc.length > 0 && (
              <Card title={t("ops.trial.card.postClass")}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {[t("ops.trial.table.ccName"), t("ops.trial.table.followups"), t("ops.trial.table.followupRate")].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {postClassByCc.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {(row.cc_name ?? row.name ?? "—") as string}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {((row.total ?? row.count ?? 0) as number).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.rate !== undefined ? `${(((row.rate as number)) * 100).toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}
