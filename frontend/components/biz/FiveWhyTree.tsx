"use client";

import { useState, useMemo } from "react";
import { formatRevenue } from "@/lib/utils";
import type { RootCauseData, RootCauseAnalysis, WhyLevel } from "@/lib/types";

interface FiveWhyTreeProps {
  data: RootCauseData;
}

const SEVERITY_STYLES = {
  red: {
    border: "border-l-4 border-red-400",
    badge: "bg-red-100 text-red-700",
    label: "严重",
    dot: "bg-red-500",
  },
  yellow: {
    border: "border-l-4 border-amber-400",
    badge: "bg-amber-100 text-amber-700",
    label: "注意",
    dot: "bg-amber-500",
  },
  green: {
    border: "border-l-4 border-green-400",
    badge: "bg-green-100 text-green-700",
    label: "正常",
    dot: "bg-green-500",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  total:      "总量指标",
  channel:    "渠道拆解",
  enclosure:  "围场效率",
  efficiency: "运营人效",
};

const CATEGORY_ORDER = ["total", "channel", "enclosure", "efficiency"];

function DataSupportBadge({
  ds,
}: {
  ds: NonNullable<WhyLevel["data_support"]>;
}) {
  const { metric, actual, target } = ds;
  if (actual == null || target == null) return null;
  const gap = actual - target;
  const gapStr = gap > 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1);
  const gapColor = gap < 0 ? "text-red-600" : "text-green-600";

  return (
    <span className="inline-flex items-center gap-1 text-xs bg-slate-100 border border-slate-200 rounded px-2 py-0.5 mt-1">
      {metric && <span className="text-slate-500">{metric}:</span>}
      <span className="font-medium">{actual}</span>
      <span className="text-slate-400">→ 目标</span>
      <span className="font-medium">{target}</span>
      <span className={`font-semibold ${gapColor}`}>[{gapStr}]</span>
    </span>
  );
}

function WhyChain({ chain }: { chain: WhyLevel[] }) {
  return (
    <div className="space-y-3 mt-3">
      {chain.map((level) => {
        const indentClass = `ml-${Math.min((level.level - 1) * 6, 24)}`;
        return (
          <div key={level.level} className={indentClass}>
            <div className="relative pl-4 border-l-2 border-slate-200">
              <div className="flex items-start gap-2">
                <div className="mt-1 shrink-0">
                  {level.is_root ? (
                    <span
                      className="inline-flex items-center text-xs font-bold bg-indigo-600 text-white rounded px-1.5 py-0.5"
                      title="根因"
                    >
                      根因
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                      Why {level.level}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">
                    {level.question}
                  </p>
                  <p className="text-sm text-slate-600 mt-0.5">{level.answer}</p>
                  {level.data_support && (
                    <DataSupportBadge ds={level.data_support} />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: RootCauseAnalysis }) {
  const sev = SEVERITY_STYLES[analysis.severity] ?? SEVERITY_STYLES.yellow;
  return (
    <div className={`rounded-lg border bg-white p-5 ${sev.border}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-base font-semibold text-slate-800">
            {analysis.trigger}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{analysis.trigger_metric}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${sev.badge}`}>
          {sev.label}
        </span>
      </div>

      <WhyChain chain={analysis.why_chain} />

      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-500">行动方案</span>
          <p className="text-sm text-slate-700 mt-0.5">{analysis.action}</p>
        </div>
        <div className="shrink-0">
          <span className="text-xs text-slate-500">预期影响</span>
          <p className="text-sm font-semibold text-indigo-700">
            {formatRevenue(analysis.expected_impact_usd)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FiveWhyTree({ data }: FiveWhyTreeProps) {
  const analyses = data.analyses ?? [];

  // 按 category 分组
  const grouped = useMemo(() => {
    const map: Record<string, RootCauseAnalysis[]> = {};
    for (const a of analyses) {
      const cat = a.category ?? "total";
      (map[cat] ??= []).push(a);
    }
    return map;
  }, [analyses]);

  // 只保留有数据的 category，按固定顺序排列
  const activeCats = CATEGORY_ORDER.filter((c) => (grouped[c]?.length ?? 0) > 0);

  const [activeCat, setActiveCat] = useState<string>(() => activeCats[0] ?? "total");
  const [activeIdx, setActiveIdx] = useState(0);

  // 切换分类时重置子 tab
  function handleCatChange(cat: string) {
    setActiveCat(cat);
    setActiveIdx(0);
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-2">根因分析</h2>
        <p className="text-sm text-slate-400">暂无根因分析数据</p>
      </div>
    );
  }

  const currentGroup = grouped[activeCat] ?? [];
  const safeIdx = Math.min(activeIdx, currentGroup.length - 1);
  const currentAnalysis = currentGroup[safeIdx];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold mb-1">根因分析 (5-Why)</h2>

      {/* 总结文本 */}
      {data.summary_text && (
        <p className="text-sm text-slate-500 mb-4 bg-slate-50 rounded px-3 py-2 border border-slate-100">
          {data.summary_text}
        </p>
      )}

      {/* 第一层：分类 Tab */}
      {activeCats.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4 border-b border-slate-100 pb-3">
          {activeCats.map((cat) => {
            const count = grouped[cat]?.length ?? 0;
            return (
              <button
                key={cat}
                onClick={() => handleCatChange(cat)}
                className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
                  activeCat === cat
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
                {count > 1 && (
                  <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                    activeCat === cat ? "bg-indigo-500 text-indigo-100" : "bg-slate-100 text-slate-500"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 第二层：同分类下多个分析切换 */}
      {currentGroup.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {currentGroup.map((a, i) => {
            const sev = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.yellow;
            return (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  safeIdx === i
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
                {a.trigger_label ?? a.trigger_metric}
              </button>
            );
          })}
        </div>
      )}

      {currentAnalysis && <AnalysisPanel analysis={currentAnalysis} />}

      <p className="text-xs text-slate-400 mt-3 text-right">
        生成于 {data.generated_at}
      </p>
    </div>
  );
}
