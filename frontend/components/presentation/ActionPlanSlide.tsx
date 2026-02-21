"use client";

import React from "react";
import { clsx } from "clsx";
import { AlertTriangle, Clock, RefreshCw, CheckCircle2 } from "lucide-react";

interface ActionItem {
  id: number;
  action: string;
  owner: string;
  deadline: string;
  impact: string;
  priority: "immediate" | "this-week" | "ongoing";
}

const ACTION_ITEMS: ActionItem[] = [
  // Immediate
  {
    id: 1,
    action: "整理零跟进学员名单下发各 CC，今日内完成首次外呼",
    owner: "CC 组长",
    deadline: "今日",
    impact: "修复 30% 零跟进率，挽回高危流失风险",
    priority: "immediate",
  },
  {
    id: 2,
    action: "外呼缺口 Top 3 CC 当面复盘，找出阻碍原因",
    owner: "运营总监",
    deadline: "今日",
    impact: "识别系统性障碍，防止缺口扩大",
    priority: "immediate",
  },
  {
    id: 3,
    action: "Bottom 5 打卡 CC 排期辅导，制定个人打卡提升计划",
    owner: "CC 主管",
    deadline: "明日",
    impact: "提升团队整体打卡率 5–10%",
    priority: "immediate",
  },
  // This Week
  {
    id: 4,
    action: "优化课后跟进 SOP，设置课后 2H 内跟进提醒",
    owner: "运营团队",
    deadline: "本周五",
    impact: "课后跟进率预计提升 15%，带动付费转化",
    priority: "this-week",
  },
  {
    id: 5,
    action: "转介绍渠道激励政策复盘，评估渠道占比调整空间",
    owner: "市场+运营",
    deadline: "本周",
    impact: "渠道结构优化，提升高价值转介绍占比",
    priority: "this-week",
  },
  {
    id: 6,
    action: "外呼热力图复盘：识别低效时段，重新分配外呼时间窗口",
    owner: "CC 组长",
    deadline: "本周",
    impact: "同等拨打量提升有效接通率 5–8%",
    priority: "this-week",
  },
  // Ongoing
  {
    id: 7,
    action: "每日晨会同步打卡率 + 外呼量，当天落后当天补",
    owner: "各 CC 组长",
    deadline: "持续",
    impact: "月末不出现大额缺口，保持时间进度同步",
    priority: "ongoing",
  },
  {
    id: 8,
    action: "围场 0–30 天新学员每周触达率抽查，确保 100% 首触",
    owner: "质检",
    deadline: "每周",
    impact: "防止新学员流失，提升 30 天留存率",
    priority: "ongoing",
  },
];

interface ActionPlanSlideProps {
  revealStep: number;
}

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
  const immediate = ACTION_ITEMS.filter((i) => i.priority === "immediate");
  const thisWeek = ACTION_ITEMS.filter((i) => i.priority === "this-week");
  const ongoing = ACTION_ITEMS.filter((i) => i.priority === "ongoing");

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Title */}
      <div
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
        className="text-center"
      >
        <h2 className="text-3xl font-extrabold text-slate-800">行动计划</h2>
        <p className="text-sm text-slate-500 mt-1">Action Plan — {ACTION_ITEMS.length} 项待执行事项</p>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        <ActionGroup priority="immediate" items={immediate} revealStep={revealStep} />
        <ActionGroup priority="this-week" items={thisWeek} revealStep={revealStep} />
        <ActionGroup priority="ongoing" items={ongoing} revealStep={revealStep} />
      </div>
    </div>
  );
}
