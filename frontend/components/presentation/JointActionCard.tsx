"use client";

import React from "react";
import { clsx } from "clsx";
import { Circle, Loader2, CheckCircle2, Calendar, User, Target } from "lucide-react";

interface ActionItem {
  text: string;
  owner: string;
  deadline: string;
  status: "pending" | "in-progress" | "done";
  kpiTarget?: string;
}

interface JointActionCardProps {
  opsActions: ActionItem[];
  bizActions: ActionItem[];
  sharedActions: ActionItem[];
  revealStep: number;
}

interface ColumnConfig {
  label: string;
  sublabel: string;
  items: ActionItem[];
  bgClass: string;
  headerClass: string;
  badgeClass: string;
  revealIndex: number;
}

function StatusIcon({ status }: { status: ActionItem["status"] }) {
  if (status === "done")
    return <CheckCircle2 className="w-5 h-5 text-green-600 flex-none" />;
  if (status === "in-progress")
    return <Loader2 className="w-5 h-5 text-blue-500 flex-none animate-spin" />;
  return <Circle className="w-5 h-5 text-slate-400 flex-none" />;
}

function ActionColumn({ label, sublabel, items, bgClass, headerClass, badgeClass, revealIndex, revealStep }: ColumnConfig & { revealStep: number }) {
  return (
    <div
      className={clsx("rounded-2xl border-2 flex flex-col overflow-hidden", bgClass)}
      style={{
        opacity: revealStep >= revealIndex ? 1 : 0,
        transform: revealStep >= revealIndex ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {/* Column header */}
      <div className={clsx("px-5 py-4 flex-none", headerClass)}>
        <p className="text-lg font-bold text-white">{label}</p>
        <p className="text-xs text-white/70 mt-0.5">{sublabel}</p>
      </div>

      {/* Action items */}
      <div className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto">
        {items.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">暂无行动项</p>
        )}
        {items.map((item) => (
          <div
            key={item.text}
            className="rounded-xl bg-white border border-slate-100 p-4 flex flex-col gap-2 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <StatusIcon status={item.status} />
              <p className="text-base text-slate-800 leading-snug flex-1">{item.text}</p>
            </div>

            {item.kpiTarget && (
              <div className="flex items-center gap-1 text-xs text-primary ml-8">
                <Target className="w-3 h-3" />
                <span>{item.kpiTarget}</span>
              </div>
            )}

            <div className="flex items-center gap-4 ml-8 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{item.owner}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{item.deadline}</span>
              </div>
              <span
                className={clsx(
                  "ml-auto px-2 py-0.5 rounded-full text-xs font-medium",
                  badgeClass,
                  item.status === "done" ? "bg-green-100 text-green-700" :
                  item.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100 text-slate-500"
                )}
              >
                {item.status === "done" ? "已完成" : item.status === "in-progress" ? "进行中" : "待开始"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function JointActionCard({
  opsActions = [],
  bizActions = [],
  sharedActions = [],
  revealStep,
}: JointActionCardProps) {
  const columns: ColumnConfig[] = [
    {
      label: "运营承诺",
      sublabel: "Ops Commitments",
      items: opsActions,
      bgClass: "border-blue-200 bg-blue-50/30",
      headerClass: "bg-blue-600",
      badgeClass: "",
      revealIndex: 1,
    },
    {
      label: "共同承诺",
      sublabel: "Shared Commitments",
      items: sharedActions,
      bgClass: "border-purple-200 bg-purple-50/30",
      headerClass: "bg-purple-600",
      badgeClass: "",
      revealIndex: 2,
    },
    {
      label: "业务承诺",
      sublabel: "Biz Commitments",
      items: bizActions,
      bgClass: "border-orange-200 bg-orange-50/30",
      headerClass: "bg-orange-500",
      badgeClass: "",
      revealIndex: 3,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-5 h-full">
      {columns.map((col) => (
        <ActionColumn key={col.label} {...col} revealStep={revealStep} />
      ))}
    </div>
  );
}
