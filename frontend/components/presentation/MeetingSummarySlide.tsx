"use client";

import React from "react";
import { clsx } from "clsx";
import { CheckCircle2, MessageSquare, ArrowRight } from "lucide-react";

interface MeetingSummarySlideProps {
  revealStep: number;
}

interface SummaryItem {
  text: string;
}

interface ColumnConfig {
  label: string;
  sublabel: string;
  items: SummaryItem[];
  icon: React.ReactNode;
  bgClass: string;
  headerClass: string;
  bulletClass: string;
  revealIndex: number;
}

function SummaryColumn({
  label,
  sublabel,
  items,
  icon,
  bgClass,
  headerClass,
  bulletClass,
  revealIndex,
  revealStep,
}: ColumnConfig & { revealStep: number }) {
  const visible = revealStep >= revealIndex;

  return (
    <div
      className={clsx("rounded-2xl border-2 flex flex-col overflow-hidden", bgClass)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div className={clsx("px-5 py-4 flex items-center gap-3", headerClass)}>
        {icon}
        <div>
          <p className="text-base font-bold text-white">{label}</p>
          <p className="text-xs text-white/70">{sublabel}</p>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg bg-white/80 border border-slate-100 p-3 shadow-sm">
            <span className={clsx("mt-0.5 text-lg flex-none", bulletClass)}>•</span>
            <p className="text-sm text-slate-700 leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const CONSENSUS_ITEMS: SummaryItem[] = [
  { text: "本月转化率目标维持 30%，双方共同追踪" },
  { text: "Leads 交接 SLA：运营发出后业务 2h 内首联" },
  { text: "每周三下午同步数据，对齐进度" },
];

const DISPUTE_ITEMS: SummaryItem[] = [
  { text: "打卡活动是否计入运营 KPI（待 GM 裁定）" },
  { text: "续费转介绍归属（CC vs 业务团队）" },
];

const FOLLOWUP_ITEMS: SummaryItem[] = [
  { text: "运营: 补齐本周打卡率到 65%（周五前）" },
  { text: "业务: 提交约课响应 SLA 改进方案" },
  { text: "双方: 确认下月目标分摊比例" },
];

export function MeetingSummarySlide({ revealStep }: MeetingSummarySlideProps) {
  const nextMeetingDate = new Date();
  nextMeetingDate.setDate(nextMeetingDate.getDate() + 7);
  const dateStr = nextMeetingDate.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const columns: ColumnConfig[] = [
    {
      label: "共识事项",
      sublabel: "Agreed Items",
      items: CONSENSUS_ITEMS,
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      bgClass: "border-purple-200 bg-purple-50/40",
      headerClass: "bg-purple-600",
      bulletClass: "text-purple-500",
      revealIndex: 1,
    },
    {
      label: "分歧待议",
      sublabel: "Open Issues",
      items: DISPUTE_ITEMS,
      icon: <MessageSquare className="w-5 h-5 text-white" />,
      bgClass: "border-slate-300 bg-slate-50",
      headerClass: "bg-slate-500",
      bulletClass: "text-slate-400",
      revealIndex: 2,
    },
    {
      label: "下次跟进",
      sublabel: "Next Steps",
      items: FOLLOWUP_ITEMS,
      icon: <ArrowRight className="w-5 h-5 text-white" />,
      bgClass: "border-blue-200 bg-blue-50/40",
      headerClass: "bg-blue-600",
      bulletClass: "text-blue-500",
      revealIndex: 3,
    },
  ];

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Title */}
      <div
        className="text-center"
        style={{ opacity: revealStep >= 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
          会议总结
        </p>
        <h2 className="text-3xl font-bold text-slate-800">本次会议摘要</h2>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-3 gap-5 flex-1">
        {columns.map((col) => (
          <SummaryColumn key={col.label} {...col} revealStep={revealStep} />
        ))}
      </div>

      {/* Next meeting footer */}
      <div
        className="rounded-xl bg-slate-50 border border-slate-200 px-6 py-4 flex items-center justify-between"
        style={{ opacity: revealStep >= 3 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">下次会议</p>
          <p className="text-lg font-bold text-slate-800">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase tracking-wide">核心议题</p>
          <p className="text-base font-semibold text-slate-700">月末复盘 · 数据对齐 · 目标确认</p>
        </div>
      </div>
    </div>
  );
}
