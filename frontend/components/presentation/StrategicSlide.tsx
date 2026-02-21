"use client";

import React from "react";
import { clsx } from "clsx";
import useSWR from "swr";
import { Target } from "lucide-react";

interface StrategicSlideProps {
  revealStep: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SCQABlock {
  key: "S" | "C" | "Q" | "A";
  label: string;
  sublabel: string;
  content: string;
  bgClass: string;
  borderClass: string;
  labelClass: string;
  revealIndex: number;
}

interface ActionItem {
  text: string;
  owner: string;
}

const DEFAULT_SCQA = {
  situation: "泰国转介绍运营已进入科学运营阶段，月活学员参与率稳定在 40%+",
  complication: "本月打卡率和触达率出现双降，Leads 产出连续两周低于时间进度",
  question: "如何在月末剩余工作日内弥补 Leads 缺口，同时稳住转化率不下滑？",
  answer: "聚焦高潜 CC 个人产能提升 + 加强围场 30-60 天段学员激活 + 业务约课 SLA 压缩",
};

const DEFAULT_ACTIONS: ActionItem[] = [
  { text: "针对围场 31-60 天学员发起专项激活活动，目标触达 200 人", owner: "运营" },
  { text: "TOP 5 CC 每日 1-on-1 辅导，提升带新系数到 1.5+", owner: "运营+CC" },
  { text: "业务约课响应时间从 4h 压缩至 2h，预计提升出席率 5%", owner: "业务" },
];

function SCQACard({
  block,
  revealStep,
}: {
  block: SCQABlock;
  revealStep: number;
}) {
  const visible = revealStep >= block.revealIndex;
  return (
    <div
      className={clsx(
        "rounded-2xl border-2 p-5 flex flex-col gap-2",
        block.bgClass,
        block.borderClass
      )}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div className="flex items-center gap-2">
        <span className={clsx("text-2xl font-black", block.labelClass)}>{block.key}</span>
        <div>
          <p className={clsx("text-sm font-bold", block.labelClass)}>{block.label}</p>
          <p className="text-xs text-slate-400">{block.sublabel}</p>
        </div>
      </div>
      <p className="text-base text-slate-700 leading-relaxed">{block.content}</p>
    </div>
  );
}

export function StrategicSlide({ revealStep }: StrategicSlideProps) {
  const { data } = useSWR("/api/analysis/pyramid-report", fetcher);
  const report = data?.data ?? {};

  const scqa = {
    situation: report.situation ?? DEFAULT_SCQA.situation,
    complication: report.complication ?? DEFAULT_SCQA.complication,
    question: report.question ?? DEFAULT_SCQA.question,
    answer: report.answer ?? DEFAULT_SCQA.answer,
  };

  const actions: ActionItem[] =
    Array.isArray(report.actions) && report.actions.length > 0
      ? report.actions
      : DEFAULT_ACTIONS;

  const blocks: SCQABlock[] = [
    {
      key: "S",
      label: "背景",
      sublabel: "Situation",
      content: scqa.situation,
      bgClass: "bg-slate-50",
      borderClass: "border-slate-300",
      labelClass: "text-slate-600",
      revealIndex: 1,
    },
    {
      key: "C",
      label: "冲突",
      sublabel: "Complication",
      content: scqa.complication,
      bgClass: "bg-red-50",
      borderClass: "border-red-300",
      labelClass: "text-red-600",
      revealIndex: 2,
    },
    {
      key: "Q",
      label: "疑问",
      sublabel: "Question",
      content: scqa.question,
      bgClass: "bg-amber-50",
      borderClass: "border-amber-300",
      labelClass: "text-amber-700",
      revealIndex: 3,
    },
    {
      key: "A",
      label: "答案",
      sublabel: "Answer",
      content: scqa.answer,
      bgClass: "bg-green-50",
      borderClass: "border-green-300",
      labelClass: "text-green-700",
      revealIndex: 4,
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
          战略建议
        </p>
        <h2 className="text-3xl font-bold text-slate-800">SCQA 战略分析框架</h2>
      </div>

      {/* SCQA cards */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        {blocks.map((block) => (
          <SCQACard key={block.key} block={block} revealStep={revealStep} />
        ))}
      </div>

      {/* Action items */}
      <div
        className="rounded-xl bg-slate-50 border border-slate-200 px-5 py-4"
        style={{ opacity: revealStep >= 5 ? 1 : 0, transition: "opacity 0.5s ease" }}
      >
        <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          关键行动项
        </p>
        <div className="grid grid-cols-3 gap-3">
          {actions.slice(0, 3).map((action, i) => (
            <div key={i} className="rounded-lg bg-white border border-slate-200 p-3 shadow-sm">
              <p className="text-sm text-slate-700 leading-snug">{action.text}</p>
              <p className="text-xs text-primary font-medium mt-2">负责: {action.owner}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
