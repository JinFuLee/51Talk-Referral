"use client";

import { useFollowup } from "@/lib/hooks";
import { GlossaryBanner } from "@/components/ui/GlossaryBanner";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { OutreachHeatmap } from "@/components/charts/OutreachHeatmap";
import { CCOutreachTable } from "@/components/ops/CCOutreachTable";
import { StatMiniCard } from "@/components/ui/StatMiniCard";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function OpsOutreachPage() {
  // /followup endpoint calls _adapt_outreach internally, returning flattened fields
  const { data: outreachRaw, isLoading } = useFollowup();

  const outreach = outreachRaw as Record<string, unknown> | undefined;

  // Extract summary numbers (with safe defaults)
  const totalCalls = (outreach?.total_calls as number) ?? 0;
  const totalConnects = (outreach?.total_connects as number) ?? 0;
  const totalEffective = (outreach?.total_effective as number) ?? 0;
  const contactRate = (outreach?.contact_rate as number) ?? 0;
  const effectiveRate = (outreach?.effective_rate as number) ?? 0;
  const avgDuration = (outreach?.avg_duration_min as number) ?? (outreach?.avg_duration_s as number) ?? 0;

  const dailyTrend = (outreach?.daily_trend as Array<Record<string, unknown>>) ?? [];
  const ccBreakdownRaw = (outreach?.cc_breakdown as Array<Record<string, unknown>>) ?? [];

  // Normalize cc_breakdown: API adapter returns name field; also handle cc_name alias
  const ccBreakdown = ccBreakdownRaw.map((row) => ({
    name: (row.name ?? row.cc_name ?? "—") as string,
    calls: (row.calls ?? row.total_calls ?? 0) as number,
    contact_rate: (row.contact_rate ?? 0) as number,
    effective_rate: (row.effective_rate ?? 0) as number,
    avg_duration_s: (row.avg_duration_s ?? 0) as number,
    achieved: (row.achieved ?? false) as boolean,
  }));

  // Build heatmap data from daily_trend
  const heatmapData = dailyTrend.map((d) => ({
    date: d.date as string,
    calls: (d.calls as number) ?? 0,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">外呼监控</h1>
        <p className="text-xs text-slate-400 mt-0.5">日历热力图 · CC 达标率 · 时段分布</p>
      </div>

      <GlossaryBanner terms={[
        { term: "有效接通", definition: "通话≥120秒" },
        { term: "均时", definition: "平均通话时长" },
        { term: "接通率", definition: "接通呼叫/总拨打量" },
      ]} />

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatMiniCard label="总拨打量" value={totalCalls.toLocaleString()} accent="blue" />
        <StatMiniCard label="接通率" value={`${(contactRate * 100).toFixed(1)}%`} accent="green" />
        <StatMiniCard label="有效通话率" value={`${(effectiveRate * 100).toFixed(1)}%`} accent="yellow" />
        <StatMiniCard label="平均通话(s)" value={`${avgDuration.toFixed(0)}s`} accent="slate" />
      </div>

      {/* Heatmap */}
      <Card title="外呼日历热力图">
        <OutreachHeatmap data={heatmapData} />
      </Card>

      {/* CC table + Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="CC 姓名 外呼达标明细">
          <CCOutreachTable data={ccBreakdown} />
        </Card>
        <Card title="外呼趋势">
          <TrendLineChart
            data={dailyTrend}
            xKey="date"
            lineKeys={["contacted", "effective_calls"]}
            barKeys={["calls"]}
          />
        </Card>
      </div>
    </div>
  );
}
