"use client";

import React from "react";
import { clsx } from "clsx";
import { Users, DollarSign, Wrench } from "lucide-react";
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
  badgeClass: (p: string) => string;
  cards: ResourceCard[];
  revealIndex: number;
}

const PRIORITY_BADGE: Record<string, string> = {
  P0: "bg-red-100 text-red-700",
  P1: "bg-amber-100 text-amber-700",
  P2: "bg-slate-100 text-slate-600",
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
        {cat.cards.map((card, i) => (
          <div key={i} className="rounded-xl bg-white border border-slate-100 p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{card.title}</p>
              <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", PRIORITY_BADGE[card.priority])}>
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

const CATEGORIES: ResourceCategory[] = [
  {
    label: "人力",
    sublabel: "Headcount",
    icon: <Users className="w-5 h-5 text-white" />,
    bgClass: "bg-blue-50/40",
    borderClass: "border-blue-200",
    headerClass: "bg-blue-600",
    badgeClass: () => "",
    cards: [
      {
        title: "新增运营专员 ×1",
        description: "专项负责围场 31-60 天段学员激活，每周外呼 200 人次",
        expectedRoi: "预计增注册 50/月 → +$1,500/月",
        priority: "P0",
      },
      {
        title: "CC 培训辅导员 ×1",
        description: "针对 TOP-5 CC 每日 1-on-1，提升带新系数",
        expectedRoi: "带新系数 +0.3 → +$800/月",
        priority: "P1",
      },
    ],
    revealIndex: 1,
  },
  {
    label: "预算",
    sublabel: "Budget",
    icon: <DollarSign className="w-5 h-5 text-white" />,
    bgClass: "bg-green-50/40",
    borderClass: "border-green-200",
    headerClass: "bg-green-600",
    badgeClass: () => "",
    cards: [
      {
        title: "激励奖池扩充 $500/月",
        description: "加大打卡/参与双达标学员奖励力度，提升打卡率至 70%",
        expectedRoi: "打卡率 +5% → +$750/月",
        priority: "P0",
      },
      {
        title: "社群活动预算 $200/月",
        description: "线上直播活动 + 社群礼品，激活沉默学员",
        expectedRoi: "参与率 +3% → +$450/月",
        priority: "P1",
      },
    ],
    revealIndex: 2,
  },
  {
    label: "工具/系统",
    sublabel: "Tools & Systems",
    icon: <Wrench className="w-5 h-5 text-white" />,
    bgClass: "bg-purple-50/40",
    borderClass: "border-purple-200",
    headerClass: "bg-purple-600",
    badgeClass: () => "",
    cards: [
      {
        title: "自动预警推送系统",
        description: "打卡率/触达率低于阈值时自动推送 LINE 告警，响应时间从 24h 缩至 2h",
        expectedRoi: "预警响应提速 → 减少 $500/月损失",
        priority: "P0",
      },
      {
        title: "CC 效能看板升级",
        description: "个人级实时 KPI 看板，CC 可自查进度，减少人工汇报成本",
        expectedRoi: "CC 主动性 +20% → +$300/月",
        priority: "P2",
      },
    ],
    revealIndex: 3,
  },
];

export function ResourceSlide({ revealStep }: ResourceSlideProps) {
  const totalEstimatedGain = 1500 + 800 + 750 + 450 + 500 + 300;

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

      {/* Three columns */}
      <div className="grid grid-cols-3 gap-5 flex-1">
        {CATEGORIES.map((cat) => (
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
            <p className="text-sm text-slate-600">6 项资源 · 人力 + 预算 + 系统三位一体</p>
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
