"use client";

import React from "react";
import { clsx } from "clsx";
import { Circle, Loader2, CheckCircle2, ChevronRight } from "lucide-react";

interface TrackerItem {
  plan: string;
  doStatus: "not-started" | "in-progress" | "done";
  checkResult?: string;
  actNext?: string;
  owner: string;
  priority: "high" | "medium" | "low";
}

interface ActionItemTrackerProps {
  items: TrackerItem[];
  title?: string;
  revealStep: number;
}

const PRIORITY_CONFIG = {
  high: { label: "高", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  medium: { label: "中", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-400" },
  low: { label: "低", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
};

const STATUS_CONFIG = {
  "not-started": { label: "未开始", icon: Circle, color: "text-slate-400", bg: "bg-slate-50" },
  "in-progress": { label: "进行中", icon: Loader2, color: "text-blue-500", bg: "bg-blue-50" },
  done: { label: "已完成", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
};

function StatusCell({ status }: { status: TrackerItem["doStatus"] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <div className={clsx("flex items-center gap-1.5 px-2 py-1 rounded-lg", cfg.bg)}>
      <Icon className={clsx("w-4 h-4 flex-none", cfg.color, status === "in-progress" && "animate-spin")} />
      <span className={clsx("text-xs font-medium", cfg.color)}>{cfg.label}</span>
    </div>
  );
}

export function ActionItemTracker({ items = [], title = "PDCA 行动追踪", revealStep }: ActionItemTrackerProps) {
  return (
    <div className="flex flex-col h-full gap-4">
      {title && (
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
      )}

      {/* Table header */}
      <div
        className="grid grid-cols-12 gap-3 px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 uppercase tracking-wide"
        style={{ opacity: revealStep >= 1 ? 1 : 0, transition: "opacity 0.4s ease" }}
      >
        <div className="col-span-1">优先级</div>
        <div className="col-span-3">计划 Plan</div>
        <div className="col-span-2">执行 Do</div>
        <div className="col-span-2">检查 Check</div>
        <div className="col-span-2">改进 Act</div>
        <div className="col-span-2">负责人</div>
      </div>

      {/* Table rows */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1">
        {(items || []).map((item, i) => {
          const priority = PRIORITY_CONFIG[item.priority];
          const visible = revealStep >= i + 1;
          return (
            <div
              key={item.plan ?? i}
              className="grid grid-cols-12 gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100 items-center"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(-12px)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
              }}
            >
              {/* Priority */}
              <div className="col-span-1">
                <span className={clsx("inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full", priority.bg, priority.text)}>
                  <span className={clsx("w-1.5 h-1.5 rounded-full", priority.dot)} />
                  {priority.label}
                </span>
              </div>

              {/* Plan */}
              <div className="col-span-3">
                <p className="text-sm font-medium text-slate-800 leading-snug">{item.plan}</p>
              </div>

              {/* Do */}
              <div className="col-span-2">
                <StatusCell status={item.doStatus} />
              </div>

              {/* Check */}
              <div className="col-span-2">
                {item.checkResult ? (
                  <p className="text-xs text-slate-600 leading-snug">{item.checkResult}</p>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </div>

              {/* Act */}
              <div className="col-span-2">
                {item.actNext ? (
                  <div className="flex items-start gap-1">
                    <ChevronRight className="w-3 h-3 text-primary mt-0.5 flex-none" />
                    <p className="text-xs text-slate-600 leading-snug">{item.actNext}</p>
                  </div>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </div>

              {/* Owner */}
              <div className="col-span-2">
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {item.owner}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
