"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { AlertTriangle, Clock, RefreshCw, CheckCircle2 } from "lucide-react";

interface ActionItem {
  id: number;
  action: string;
  owner: string;
  deadline: string;
  impact: string;
  priority: "immediate" | "this-week" | "ongoing";
}

interface ActionPlanSlideProps {
  revealStep: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PRIORITY_CONFIG = {
  immediate: {
    label: "立即执行",
    icon: AlertTriangle,
    bg: "bg-red-50 border-red-200",
    headerBg: "bg-red-500",
    textColor: "text-red-800",
    badgeColor: "bg-red-100 text-red-700",
    step: 1,
  },
  "this-week": {
    label: "本周推进",
    icon: Clock,
    bg: "bg-amber-50 border-amber-200",
    headerBg: "bg-amber-400",
    textColor: "text-amber-800",
    badgeColor: "bg-amber-100 text-amber-700",
    step: 2,
  },
  ongoing: {
    label: "持续跟进",
    icon: RefreshCw,
    bg: "bg-emerald-50 border-emerald-200",
    headerBg: "bg-emerald-500",
    textColor: "text-emerald-800",
    badgeColor: "bg-emerald-100 text-emerald-700",
    step: 3,
  },
};

function ActionGroup({
  priority,
  items,
  revealStep,
}: {
  priority: "immediate" | "this-week" | "ongoing";
  items: ActionItem[];
  revealStep: number;
}) {
  const cfg = PRIORITY_CONFIG[priority];
  const Icon = cfg.icon;
  const visible = revealStep >= cfg.step;

  return (
    <div
      className={clsx("rounded-2xl border overflow-hidden", cfg.bg)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div className={clsx("flex items-center gap-2 px-4 py-3", cfg.headerBg)}>
        <Icon className="w-4 h-4 text-white" />
        <span className="text-sm font-bold text-white">{cfg.label}</span>
        <span className="ml-auto text-xs text-white opacity-80">{items.length} 项</span>
      </div>
      <div className="divide-y divide-white/60">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className={clsx("w-4 h-4 shrink-0 mt-0.5 opacity-40", cfg.textColor)} />
            <div className="flex-1 min-w-0">
              <div className={clsx("text-sm font-medium leading-snug", cfg.textColor)}>
                {item.action}
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className={clsx("text-xs rounded px-2 py-0.5 font-medium", cfg.badgeColor)}>
                  {item.owner}
                </span>
                <span className="text-xs text-slate-500">截止 {item.deadline}</span>
                <span className="text-xs text-slate-400 flex-1 min-w-0 truncate">
                  预期: {item.impact}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActionPlanSlide({ revealStep }: ActionPlanSlideProps) {
  const { data, isLoading, error } = useSWR("/api/analysis/action-plan", fetcher);

  const items: ActionItem[] = data?.data?.items ?? [];
  const immediate = items.filter((i) => i.priority === "immediate");
  const thisWeek = items.filter((i) => i.priority === "this-week");
  const ongoing = items.filter((i) => i.priority === "ongoing");

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
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
        className="text-center"
      >
        <h2 className="text-3xl font-extrabold text-slate-800">行动计划</h2>
        <p className="text-sm text-slate-500 mt-1">Action Plan — {items.length} 项待执行事项</p>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        <ActionGroup priority="immediate" items={immediate} revealStep={revealStep} />
        <ActionGroup priority="this-week" items={thisWeek} revealStep={revealStep} />
        <ActionGroup priority="ongoing" items={ongoing} revealStep={revealStep} />
      </div>
    </div>
  );
}
