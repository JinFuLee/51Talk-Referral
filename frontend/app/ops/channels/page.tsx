"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/hooks";
import { ChannelMoMStreamChart } from "@/components/ops/ChannelMoMStreamChart";
import type { ChannelMomData } from "@/components/ops/ChannelMoMStreamChart";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

interface ChannelEntry {
  channel: string;
  metrics: Array<{
    month: string;
    registrations: number | null;
    mom_reg_pct: number | null;
    reg_paid_rate: number | null;
    unit_price_usd: number | null;
    attend_paid_rate: number | null;
  }>;
}

function formatMonth(yyyyMM: string): string {
  if (!yyyyMM || yyyyMM.length < 6) return yyyyMM;
  const y = yyyyMM.slice(0, 4);
  const m = yyyyMM.slice(4, 6);
  return `${y.slice(2)}年${parseInt(m)}月`;
}

function ChannelDetailTable({
  byChannel,
  months,
}: {
  byChannel: ChannelEntry[];
  months: string[];
}) {
  const { t } = useTranslation();
  const lastMonth = months[months.length - 1] ?? "";

  if (!byChannel.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-2 px-3 text-slate-500 font-medium">{t("ops.channels.table.channel")}</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium">{t("ops.channels.table.registrations")}</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium">{t("ops.channels.table.mom")}</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium">{t("ops.channels.table.regPaidRate")}</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium">{t("ops.channels.table.unitPrice")}</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium">{t("ops.channels.table.attendPaidRate")}</th>
          </tr>
        </thead>
        <tbody>
          {byChannel
            .map((ch) => {
              const m = ch.metrics.find((mm) => mm.month === lastMonth);
              return { ch, m };
            })
            .filter(({ m }) => m !== undefined)
            .sort((a, b) => (b.m!.registrations ?? 0) - (a.m!.registrations ?? 0))
            .map(({ ch, m }) => {
              const mom = m!.mom_reg_pct;
              return (
                <tr
                  key={ch.channel}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-2 px-3 text-slate-700 font-medium">{ch.channel}</td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    {m!.registrations !== null ? m!.registrations!.toFixed(0) : "—"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {mom !== null ? (
                      <span className={`font-medium ${mom >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {mom >= 0 ? "+" : ""}{mom.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    {m!.reg_paid_rate !== null ? `${(m!.reg_paid_rate! * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    {m!.unit_price_usd !== null ? `$${m!.unit_price_usd!.toFixed(0)}` : "—"}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    {m!.attend_paid_rate !== null ? `${(m!.attend_paid_rate! * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      {lastMonth && (
        <p className="text-xs text-slate-400 mt-2 px-1">
          数据月份：{formatMonth(lastMonth)} | 环比对比上一自然月
        </p>
      )}
    </div>
  );
}

export default function OpsChannelsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ChannelMomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/analysis/channel-mom")
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body) => {
            throw new Error(body?.detail ?? `HTTP ${res.status}`);
          });
        }
        return res.json();
      })
      .then((json: ChannelMomData) => {
        setData(json);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-none space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const hasData = data && data.by_channel && data.by_channel.length > 0;
  const months = data?.months ?? [];
  const byChannel = (data?.by_channel ?? []) as ChannelEntry[];

  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t("ops.channels.title")}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t("ops.channels.subtitle")}</p>
      </div>

      {error && !hasData && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
          {t("ops.channels.label.dataError")} {error}
        </div>
      )}

      {hasData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-400">{t("ops.channels.card.channelCount")}</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{data!.by_channel.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-400">{t("ops.channels.card.monthsCovered")}</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{months.length}</p>
          </div>
          {data!.summary.length > 0 && (
            <>
              <div className="bg-white rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-400">{t("ops.channels.card.latestTotal")}</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">
                  {data!.summary[data!.summary.length - 1]?.total_registrations?.toLocaleString() ?? "—"}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-400">{t("ops.channels.card.latestMonth")}</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {formatMonth(months[months.length - 1] ?? "")}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <ErrorBoundary>
        <Card title={t("ops.channels.card.streamChart")}>
          {data ? (
            <ChannelMoMStreamChart data={data} />
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-slate-400">
              {t("ops.channels.label.noData")}
            </div>
          )}
        </Card>

        {hasData && months.length > 0 && (
          <Card title={`渠道明细（最新月：${formatMonth(months[months.length - 1] ?? "")}）`}>
            <ChannelDetailTable byChannel={byChannel} months={months} />
          </Card>
        )}
      </ErrorBoundary>
    </div>
  );
}
