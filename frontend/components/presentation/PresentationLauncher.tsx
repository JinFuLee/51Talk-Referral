"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, Handshake, Play, Clock } from "lucide-react";
import { usePresentationStore } from "@/lib/stores/presentation-store";
import type { Audience, Timeframe } from "@/lib/presentation/types";

interface SceneConfig {
  id: Audience;
  icon: React.ReactNode;
  title: string;
  description: string;
  allowedTimeframes: Timeframe[];
}

interface TimeframeConfig {
  id: Timeframe;
  label: string;
  sublabel: string;
}

const SCENES: SceneConfig[] = [
  {
    id: "gm",
    icon: <TrendingUp className="w-8 h-8" />,
    title: "GM 汇报",
    description: "面向总经理的战略级汇报，聚焦核心 KPI 与业务趋势",
    allowedTimeframes: ["daily", "weekly", "monthly", "quarterly", "yearly"],
  },
  {
    id: "ops-director",
    icon: <Users className="w-8 h-8" />,
    title: "运营总监汇报",
    description: "运营层面深度分析，含漏斗拆解、CC 排名与行动追踪",
    allowedTimeframes: ["daily", "weekly", "monthly"],
  },
  {
    id: "crosscheck",
    icon: <Handshake className="w-8 h-8" />,
    title: "对等会议",
    description: "运营与业务双方对等协商，承诺追踪与联合行动",
    allowedTimeframes: ["weekly", "monthly", "quarterly"],
  },
];

const TIMEFRAMES: TimeframeConfig[] = [
  { id: "daily", label: "日报", sublabel: "T-1 数据" },
  { id: "weekly", label: "周报", sublabel: "WoW 对比" },
  { id: "monthly", label: "月报", sublabel: "MoM 对比" },
  { id: "quarterly", label: "季报", sublabel: "QoQ 对比" },
  { id: "yearly", label: "年报", sublabel: "YoY 对比" },
];

export function PresentationLauncher() {
  const router = useRouter();
  const { togglePresentationMode } = usePresentationStore();

  const [selectedScene, setSelectedScene] = useState<Audience | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe | null>(null);

  const activeScene = SCENES.find((s) => s.id === selectedScene);
  const allowedTimeframes = activeScene?.allowedTimeframes ?? [];

  function handleStart() {
    if (!selectedScene || !selectedTimeframe) return;
    togglePresentationMode();
    router.push(`/present/${selectedScene}/${selectedTimeframe}`);
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto py-8">
      {/* Scene selection */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-4">
          选择汇报场景
        </p>
        <div className="grid grid-cols-3 gap-4">
          {SCENES.map((scene) => {
            const isSelected = selectedScene === scene.id;
            return (
              <button
                key={scene.id}
                onClick={() => {
                  setSelectedScene(scene.id);
                  setSelectedTimeframe(null);
                }}
                className={clsx(
                  "flex flex-col items-start gap-3 rounded-[var(--radius-xl)] border-2 p-6 text-left transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-slate-200 bg-[var(--bg-surface)] hover:border-slate-300 hover:shadow-sm"
                )}
              >
                <div
                  className={clsx(
                    "rounded-xl p-3",
                    isSelected ? "bg-primary text-white" : "bg-slate-100 text-[var(--text-secondary)]"
                  )}
                >
                  {scene.icon}
                </div>
                <div>
                  <p className={clsx("text-lg font-bold", isSelected ? "text-primary" : "text-[var(--text-primary)]")}>
                    {scene.title}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 leading-snug">{scene.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeframe selection (only shown after scene selected) */}
      {selectedScene && (
        <div
          style={{ animation: "fadeInUp 0.3s ease forwards" }}
        >
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <p className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            选择时间维度
          </p>
          <div className="flex gap-3">
            {TIMEFRAMES.map((tf) => {
              const allowed = allowedTimeframes.includes(tf.id);
              const isSelected = selectedTimeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  onClick={() => allowed && setSelectedTimeframe(tf.id)}
                  disabled={!allowed}
                  className={clsx(
                    "flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-2 transition-all duration-200",
                    !allowed && "opacity-30 cursor-not-allowed",
                    isSelected
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 bg-[var(--bg-surface)] hover:border-slate-300 text-[var(--text-primary)]"
                  )}
                >
                  <span className="text-base font-bold">{tf.label}</span>
                  <span className="text-xs text-[var(--text-muted)]">{tf.sublabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Start button */}
      <div className="flex justify-end">
        <button
          onClick={handleStart}
          disabled={!selectedScene || !selectedTimeframe}
          className={clsx(
            "flex items-center gap-3 px-8 py-4 rounded-[var(--radius-xl)] text-lg font-bold transition-all duration-200",
            selectedScene && selectedTimeframe
              ? "bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              : "bg-slate-100 text-[var(--text-muted)] cursor-not-allowed"
          )}
        >
          <Play className="w-5 h-5" />
          开始汇报
        </button>
      </div>
    </div>
  );
}
