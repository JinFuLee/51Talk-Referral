"use client";

import { useState } from "react";
import { useLeadsOverview, useTranslation } from "@/lib/hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { PageTabs } from "@/components/ui/PageTabs";
import { BIZ_PAGE } from "@/lib/layout";
import { formatRevenue } from "@/lib/utils";
import type {
  LeadsFunnelMetrics,
  LeadsMonthlyRow,
  TeamChannelRow,
  EnclosureBaselineRow,
} from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtNum(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("en-US").format(v);
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function fmtGapPct(v: number | null | undefined): string {
  if (v == null) return "—";
  const pct = (v * 100).toFixed(2);
  return v >= 0 ? `+${pct}%` : `${pct}%`;
}

function fmtGapNum(v: number | null | undefined): string {
  if (v == null) return "—";
  const n = new Intl.NumberFormat("en-US").format(Math.abs(v));
  return v >= 0 ? `+${n}` : `-${n}`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded" />
      <div className="h-6 w-96 bg-slate-100 rounded" />
      <div className="h-48 bg-slate-100 rounded-2xl" />
      <div className="h-32 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 bg-slate-100 rounded-2xl" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    </div>
  );
}

// ── Area ①: Monthly Funnel Table ──────────────────────────────────────────────

function MonthlyFunnelTable({
  rows,
  momGap,
}: {
  rows: LeadsMonthlyRow[];
  momGap: LeadsFunnelMetrics;
}) {
  const cols: { key: keyof LeadsFunnelMetrics; label: string }[] = [
    { key: "register", label: "注册 Register" },
    { key: "appointment", label: "预约 Appt." },
    { key: "showup", label: "出席 Show up" },
    { key: "paid", label: "付费 Paid" },
    { key: "revenue_usd", label: "美金金额 USD" },
    { key: "leads_to_pay_rate", label: "注册付费率%" },
  ];

  const lastMonthIdx = rows.length - 1;

  function renderCell(key: keyof LeadsFunnelMetrics, value: number): string {
    if (key === "revenue_usd") return formatRevenue(value);
    if (key === "leads_to_pay_rate") return fmtPct(value);
    return fmtNum(value);
  }

  function renderGapCell(key: keyof LeadsFunnelMetrics, value: number): string {
    if (key === "revenue_usd") return fmtGapNum(value);
    if (key === "leads_to_pay_rate") return fmtGapPct(value);
    return fmtGapNum(value);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left px-3 py-2 font-semibold text-slate-600 border border-slate-200">
              月份
            </th>
            {cols.map((c) => (
              <th
                key={c.key}
                className="text-right px-3 py-2 font-semibold text-slate-600 border border-slate-200 whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.month}
              className={idx === lastMonthIdx ? "font-bold bg-blue-50" : "hover:bg-slate-50"}
            >
              <td className="px-3 py-2 border border-slate-200 whitespace-nowrap">
                {row.month}
              </td>
              {cols.map((c) => (
                <td key={c.key} className="px-3 py-2 text-right border border-slate-200">
                  {renderCell(c.key, row[c.key])}
                </td>
              ))}
            </tr>
          ))}
          {/* MoM GAP row */}
          <tr className="bg-green-50 text-slate-700">
            <td className="px-3 py-2 border border-slate-200 font-semibold whitespace-nowrap">
              环比GAP
            </td>
            {cols.map((c) => {
              const v = momGap[c.key];
              const isNeg = v < 0;
              return (
                <td
                  key={c.key}
                  className={`px-3 py-2 text-right border border-slate-200 font-medium ${
                    isNeg ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {renderGapCell(c.key, v)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Area ②: Progress Banner ───────────────────────────────────────────────────

function ProgressBanner({
  timeProgress,
  targets,
  achievement,
  progressBm,
  targetGap,
}: {
  timeProgress: number;
  targets: LeadsFunnelMetrics;
  achievement: LeadsFunnelMetrics;
  progressBm: LeadsFunnelMetrics;
  targetGap: LeadsFunnelMetrics;
}) {
  const cols: { key: keyof LeadsFunnelMetrics; label: string }[] = [
    { key: "register", label: "注册 Register" },
    { key: "appointment", label: "预约 Appt." },
    { key: "showup", label: "出席 Show up" },
    { key: "paid", label: "付费 Paid" },
    { key: "revenue_usd", label: "美金金额 USD" },
    { key: "leads_to_pay_rate", label: "注册付费率%" },
  ];

  function renderVal(key: keyof LeadsFunnelMetrics, value: number): string {
    if (key === "revenue_usd") return formatRevenue(value);
    if (key === "leads_to_pay_rate") return fmtPct(value);
    return fmtNum(value);
  }

  const rows: { label: string; data: LeadsFunnelMetrics; isGap?: boolean }[] = [
    { label: "月目标 Target", data: targets },
    { label: "月完成 Achievement", data: achievement },
    { label: "月效率进度 BM", data: progressBm, isGap: false },
    { label: "目标 GAP", data: targetGap, isGap: true },
  ];

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-full font-medium">
          Today BM: {(timeProgress * 100).toFixed(1)}%
        </span>
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left px-3 py-2 font-semibold text-slate-600 border border-slate-200">
              指标
            </th>
            {cols.map((c) => (
              <th
                key={c.key}
                className="text-right px-3 py-2 font-semibold text-slate-600 border border-slate-200 whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="px-3 py-2 border border-slate-200 font-medium whitespace-nowrap">
                {row.label}
              </td>
              {cols.map((c) => {
                const v = row.data[c.key];
                let cellClass = "px-3 py-2 text-right border border-slate-200";
                let display: string;

                if (row.isGap) {
                  const isNeg = v < 0;
                  cellClass += isNeg
                    ? " bg-red-50 text-red-700 font-medium"
                    : " bg-green-50 text-green-700 font-medium";
                  display =
                    c.key === "leads_to_pay_rate" ? fmtGapPct(v) : fmtGapNum(v);
                } else if (row.label.includes("BM")) {
                  display = fmtPct(v);
                } else {
                  display = renderVal(c.key, v);
                }

                return (
                  <td key={c.key} className={cellClass}>
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Area ③: Target Decomposition ─────────────────────────────────────────────

function TargetPanel({
  decomp,
}: {
  decomp: {
    revenue_target: number;
    unit_price: number;
    unit_target: number;
    conversion_target: number;
    leads_target: number;
    leads_by_channel: { cc_narrow: number; ss_narrow: number; lp_narrow: number; wide: number };
  };
}) {
  const items = [
    { label: "1月总标", value: fmtNum(decomp.revenue_target) },
    { label: "1月客单价", value: fmtNum(decomp.unit_price) },
    { label: "单量目标", value: fmtNum(decomp.unit_target) },
    { label: "转率目标", value: fmtPct(decomp.conversion_target) },
    { label: "例子目标", value: fmtNum(decomp.leads_target) },
    { label: "CC窄口", value: fmtNum(decomp.leads_by_channel.cc_narrow) },
    { label: "SS窄口", value: fmtNum(decomp.leads_by_channel.ss_narrow) },
    { label: "LP窄口", value: fmtNum(decomp.leads_by_channel.lp_narrow) },
    { label: "宽口55%", value: fmtNum(decomp.leads_by_channel.wide) },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
        >
          <span className="text-xs text-slate-600">{item.label}</span>
          <span className="text-xs font-semibold text-slate-800">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Area ④: Gap Panel ─────────────────────────────────────────────────────────

function GapPanel({
  gap,
}: {
  gap: {
    performance_gap: number;
    unit_price_gap: number;
    bill_gap: number;
    showup_gap: number;
    appointment_gap: number;
    lead_gap: number;
    cc_lead_gap: number;
    ss_lead_gap: number;
    lp_lead_gap: number;
    wide_lead_gap: number;
  };
}) {
  const items = [
    { label: "业绩缺口 Performance gap", value: gap.performance_gap },
    { label: "客单价缺口 Unit price Gap", value: gap.unit_price_gap },
    { label: "单量缺口 Bill Gap", value: gap.bill_gap },
    { label: "出席缺口 Show up Gap", value: gap.showup_gap },
    { label: "预约缺口 Apps. Gap", value: gap.appointment_gap },
    { label: "例子缺口 Lead Gap", value: gap.lead_gap },
    { label: "CC窄口缺口 CC Lead Gap", value: gap.cc_lead_gap },
    { label: "SS窄口缺口 SS Lead Gap", value: gap.ss_lead_gap },
    { label: "LP窄口缺口 LP Lead Gap", value: gap.lp_lead_gap },
    { label: "宽口缺口 User Lead Gap", value: gap.wide_lead_gap },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isNeg = item.value < 0;
        return (
          <div
            key={item.label}
            className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100"
          >
            <span className="text-xs text-slate-600">{item.label}</span>
            <span
              className={`text-xs font-semibold flex items-center gap-1 ${
                isNeg ? "text-red-600" : "text-green-600"
              }`}
            >
              <span>{isNeg ? "↓" : "↑"}</span>
              <span>{fmtGapNum(item.value)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Area ⑤: Team × Channel Matrix ─────────────────────────────────────────────

function TeamChannelMatrix({ rows }: { rows: TeamChannelRow[] }) {
  const channels = ["cc_narrow", "ss_narrow", "lp_narrow", "wide"];
  const channelLabels: Record<string, string> = {
    cc_narrow: "CC窄",
    ss_narrow: "SS窄",
    lp_narrow: "LP窄",
    wide: "宽",
  };

  // Compute global avg conversion for color coding
  const allConversions: number[] = [];
  for (const row of rows) {
    for (const ch of channels) {
      const cell = row[ch];
      if (cell && typeof cell === "object" && "conversion" in cell && typeof cell.conversion === "number") {
        allConversions.push(cell.conversion);
      }
    }
  }
  const globalAvg =
    allConversions.length > 0
      ? allConversions.reduce((a, b) => a + b, 0) / allConversions.length
      : 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left px-3 py-2 font-semibold text-slate-600 border border-slate-200">
              团队
            </th>
            {channels.map((ch) => (
              <th
                key={ch}
                className="text-center px-3 py-2 font-semibold text-slate-600 border border-slate-200"
              >
                {channelLabels[ch]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team} className="hover:bg-slate-50">
              <td className="px-3 py-2 border border-slate-200 font-medium whitespace-nowrap">
                {row.team}
              </td>
              {channels.map((ch) => {
                const cell = row[ch];
                const conv =
                  cell && typeof cell === "object" && "conversion" in cell
                    ? (cell.conversion as number | undefined)
                    : undefined;
                const cargo =
                  cell && typeof cell === "object" && "cargo_ratio" in cell
                    ? (cell.cargo_ratio as number | undefined)
                    : undefined;

                const isAbove = conv != null && conv > globalAvg;
                const isBelow = conv != null && conv < globalAvg;

                return (
                  <td
                    key={ch}
                    className={`px-3 py-2 text-center border border-slate-200 ${
                      isAbove
                        ? "bg-green-50 text-green-700"
                        : isBelow
                        ? "bg-red-50 text-red-700"
                        : ""
                    }`}
                  >
                    {conv != null ? (
                      <div className="space-y-0.5">
                        <div className="font-medium">{fmtPct(conv)}</div>
                        {cargo != null && (
                          <div className="text-[10px] text-slate-500">
                            带货 {fmtPct(cargo)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Area ⑥: Enclosure Baseline Table ─────────────────────────────────────────

function EnclosureBaselineTable({ rows }: { rows: EnclosureBaselineRow[] }) {
  const metrics: {
    key: "cargo_ratio" | "participation" | "conversion";
    label: string;
  }[] = [
    { key: "cargo_ratio", label: "带货比" },
    { key: "participation", label: "参与率" },
    { key: "conversion", label: "围场转率" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left px-3 py-2 font-semibold text-slate-600 border border-slate-200">
              围场段
            </th>
            {metrics.map((m) => (
              <th
                key={m.key}
                className="text-center px-3 py-2 font-semibold text-slate-600 border border-slate-200"
              >
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.enclosure} className="hover:bg-slate-50">
              <td className="px-3 py-2 border border-slate-200 font-medium whitespace-nowrap">
                {row.enclosure}
              </td>
              {metrics.map((m) => {
                const cur = row.current[m.key];
                const base = row.baseline_avg[m.key];
                const dev = row.deviation[m.key];
                const isWarning = Math.abs(dev) > 0.1;

                return (
                  <td
                    key={m.key}
                    className={`px-3 py-2 text-center border border-slate-200 ${
                      isWarning ? "bg-red-50" : ""
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className={`font-medium ${isWarning ? "text-red-700" : "text-slate-800"}`}>
                        {fmtPct(cur)}
                      </div>
                      <div className="text-[10px] text-slate-500">均 {fmtPct(base)}</div>
                      <div
                        className={`text-[10px] font-medium ${
                          dev < 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {fmtGapPct(dev)}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const SCOPE_TABS = [
  { id: "total", label: "总计" },
  { id: "cc_narrow", label: "CC窄口径" },
  { id: "ss_narrow", label: "SS窄口径" },
  { id: "lp_narrow", label: "LP窄口径" },
  { id: "wide", label: "宽口" },
];

export default function LeadsOverviewPage() {
  const { t } = useTranslation();
  const [scope, setScope] = useState<string>("total");
  const { data, isLoading, error } = useLeadsOverview(scope);

  return (
    <div className={BIZ_PAGE}>
      <PageHeader
        title={t("biz.leads-overview.title")}
        subtitle={t("biz.leads-overview.subtitle")}
      />

      <p className="text-xs text-slate-400 -mt-4">
        {t("biz.leads-overview.glossary")}
      </p>

      <PageTabs tabs={SCOPE_TABS} activeId={scope} onChange={setScope} />

      {isLoading && <LoadingSkeleton />}

      {!isLoading && error && (
        <Card>
          <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
            <span className="text-2xl">!</span>
            <p className="text-sm font-medium">{t("biz.leads-overview.error")}</p>
            <p className="text-xs text-slate-400">{String(error)}</p>
          </div>
        </Card>
      )}

      {!isLoading && !error && !data && (
        <Card>
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <p className="text-sm">{t("biz.leads-overview.empty")}</p>
          </div>
        </Card>
      )}

      {!isLoading && !error && data && (
        <>
          {/* Area ①: Monthly Funnel Table */}
          <Card title={t("biz.leads-overview.section.monthly_trend")}>
            {data.monthly_trend.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {t("biz.leads-overview.empty")}
              </p>
            ) : (
              <MonthlyFunnelTable rows={data.monthly_trend} momGap={data.mom_gap} />
            )}
          </Card>

          <hr className="border-slate-200" />

          {/* Area ②: Progress Banner */}
          <Card title={t("biz.leads-overview.section.progress")}>
            <ProgressBanner
              timeProgress={data.time_progress}
              targets={data.targets}
              achievement={data.achievement}
              progressBm={data.progress_bm}
              targetGap={data.target_gap}
            />
          </Card>

          {/* Area ③④: Grid 2-col — Target Decomposition + Gap Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title={t("biz.leads-overview.section.target_decomposition")}>
              <TargetPanel decomp={data.target_decomposition} />
            </Card>

            <Card title={t("biz.leads-overview.section.gap_panel")}>
              <GapPanel gap={data.gap_analysis} />
            </Card>
          </div>

          {/* Area ⑤: Team × Channel Matrix */}
          <Card title={t("biz.leads-overview.section.team_matrix")}>
            {data.team_channel_matrix.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {t("biz.leads-overview.empty")}
              </p>
            ) : (
              <TeamChannelMatrix rows={data.team_channel_matrix} />
            )}
          </Card>

          {/* Area ⑥: Enclosure Baseline Table */}
          <Card title={t("biz.leads-overview.section.enclosure_baseline")}>
            {data.enclosure_baseline.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {t("biz.leads-overview.empty")}
              </p>
            ) : (
              <EnclosureBaselineTable rows={data.enclosure_baseline} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
