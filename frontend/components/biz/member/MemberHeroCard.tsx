"use client";

import { useState } from "react";
import type { MemberProfileResponse, BadgeDetail } from "@/lib/types/member";

interface BadgeConfig {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

const BADGE_CONFIGS: BadgeConfig[] = [
  {
    id: "referral_killer",
    label: "转介绍杀手",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    icon: "★",
  },
  {
    id: "call_diligence",
    label: "外呼劳模",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    icon: "◆",
  },
  {
    id: "conversion_elite",
    label: "转化尖兵",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    icon: "▲",
  },
];

interface TooltipProps {
  detail: BadgeDetail | undefined;
  triggered: boolean;
}

function BadgeTooltip({ detail, triggered }: TooltipProps) {
  if (!detail) return null;
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-xs rounded-lg p-2 shadow-lg pointer-events-none">
      <p className="font-semibold mb-1">{detail.label}</p>
      <p className="text-slate-300">{detail.threshold}</p>
      {triggered ? (
        <p className="text-green-400 mt-1">当前值: {detail.trigger_value}</p>
      ) : (
        <p className="text-slate-400 mt-1">未触发 — 当前值: {detail.trigger_value}</p>
      )}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
    </div>
  );
}

interface BadgeItemProps {
  config: BadgeConfig;
  detail: BadgeDetail | undefined;
  isNewbie: boolean;
}

function BadgeItem({ config, detail, isNewbie }: BadgeItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const triggered = !isNewbie && (detail?.triggered ?? false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
          triggered
            ? `${config.bgColor} ${config.borderColor} ${config.color}`
            : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
        }`}
      >
        <span>{config.icon}</span>
        {config.label}
      </div>
      {showTooltip && (
        <BadgeTooltip detail={detail} triggered={triggered} />
      )}
    </div>
  );
}

interface MemberHeroCardProps {
  identity: MemberProfileResponse["identity"];
}

export function MemberHeroCard({ identity }: MemberHeroCardProps) {
  const isNewbie = identity.hire_days < 7;

  if (!identity.name) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center text-slate-400 text-sm">
        该 CC 无数据，请确认姓名拼写
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-start gap-4">
        {/* Avatar placeholder */}
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold flex-shrink-0">
          {identity.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-800">{identity.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{identity.team || "—"}</p>
          {isNewbie && (
            <span className="inline-block mt-1 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
              新人（入职 {identity.hire_days} 天）
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="mt-4 flex flex-wrap gap-2">
        {BADGE_CONFIGS.map((cfg) => {
          const detail = identity.badge_details.find((d) => d.id === cfg.id);
          return (
            <BadgeItem
              key={cfg.id}
              config={cfg}
              detail={detail}
              isNewbie={isNewbie}
            />
          );
        })}
      </div>
    </div>
  );
}
