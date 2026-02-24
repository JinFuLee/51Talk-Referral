"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { Users, DollarSign, Settings } from "lucide-react";
import { formatRevenue } from "@/lib/utils";

interface ResourceSlideProps {
  revealStep: number;
}

interface ResourceCard {
  title: string;
  description: string;
  expectedRoi: string;
  priority: "P0" | "P1" | "P2";
}

interface ResourceCategory {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  bgClass: string;
  borderClass: string;
  headerClass: string;
  cards: ResourceCard[];
  revealIndex: number;
}

import { swrFetcher } from "@/lib/api";

const PRIORITY_BADGE: Record<string, string> = {
  P0: "bg-red-100 text-red-700",
  P1: "bg-amber-100 text-amber-700",
  P2: "bg-slate-100 text-slate-600",
};

const ICON_MAP: Record<string, React.ReactNode> = {
  人力: <Users className="w-5 h-5 text-white" />,
  预算: <DollarSign className="w-5 h-5 text-white" />,
  "工具/系统": <Settings className="w-5 h-5 text-white" />,
};

const STYLE_MAP: Record<string, { bgClass: string; borderClass: string; headerClass: string }> = {
  人力: { bgClass: "bg-blue-50/40", borderClass: "border-blue-200", headerClass: "bg-blue-600" },
  预算: { bgClass: "bg-green-50/40", borderClass: "border-green-200", headerClass: "bg-green-600" },
  "工具/系统": { bgClass: "bg-purple-50/40", borderClass: "border-purple-200", headerClass: "bg-purple-600" },
};

function ResourceCategoryColumn({
  cat,
  revealStep,
}: {
  cat: ResourceCategory;
  revealStep: number;
}) {
  const visible = revealStep >= cat.revealIndex;
  return (
    <div
      className={clsx("rounded-2xl border-2 flex flex-col overflow-hidden", cat.bgClass, cat.borderClass)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {/* Header */}
      <div className={clsx("px-5 py-4 flex items-center gap-3", cat.headerClass)}>
        {cat.icon}
        <div>
          <p className="text-base font-bold text-white">{cat.label}</p>
          <p className="text-xs text-white/70">{cat.sublabel}</p>
        </div>
      </div>

      {/* Cards */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {cat.cards.map((card) => (
          <div key={card.title} className="rounded-xl bg-white border border-slate-100 p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{card.title}</p>
              <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", PRIORITY_BADGE[card.priority] ?? "bg-slate-100 text-slate-600")}>
                {card.priority}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-green-600 font-medium">
              <span>预期 ROI:</span>
              <span>{card.expectedRoi}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResourceSlide({ revealStep }: ResourceSlideProps) {
  const { data, isLoading, error } = useSWR("/api/analysis/resource-request", swrFetcher);

  const rawCategories: Array<{ label: string; sublabel?: string; cards: ResourceCard[]; revealIndex?: number }> =
    data?.data?.categories ?? [];
  const totalEstimatedGain: number = data?.data?.total_estimated_gain_usd ?? 0;

  // Map raw categories to ResourceCategory with icons and styles
  const categories: ResourceCategory[] = rawCategories.map((cat, index) => {
    const style = STYLE_MAP[cat.label] ?? {
      bgClass: "bg-slate-50/40",
      borderClass: "border-slate-200",
      headerClass: "bg-slate-600",
    };
    return {
      label: cat.label,
      sublabel: cat.sublabel ?? cat.label,
      icon: ICON_MAP[cat.label] ?? <Settings className="w-5 h-5 text-white" />,
      ...style,
      cards: cat.cards ?? [],
      revealIndex: cat.revealIndex ?? index + 1,
    };
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-lg">
        数据加载失败，请稍后重试
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Title */}
      <div
        className="text-center"
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
          资源申请
        </p>
        <h2 className="text-3xl font-bold text-slate-800">所需资源 & 预期效益</h2>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-3 gap-5 flex-1">
        {categories.map((cat) => (
          <ResourceCategoryColumn key={cat.label} cat={cat} revealStep={revealStep} />
        ))}
      </div>

      {/* Bottom: projected outcome */}
      <div
        className="rounded-xl bg-gradient-to-r from-blue-50 via-green-50 to-purple-50 border-2 border-slate-200 px-6 py-4"
        style={{ opacity: revealStep >= 3 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">如果全部获批</p>
            <p className="text-sm text-slate-600">{categories.length} 项资源 · 人力 + 预算 + 系统三位一体</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">预期月增收（估算）</p>
            <p className="text-3xl font-bold text-green-700">{formatRevenue(totalEstimatedGain)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
