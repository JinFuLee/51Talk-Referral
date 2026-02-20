"use client";

import { RiskAlert as RiskAlertType } from "@/lib/types";

interface RiskAlertProps {
  alerts: RiskAlertType[];
  lang?: "zh" | "th";
}

const LEVEL_CONFIG = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-800",
    badge: "bg-red-100 text-red-700",
    icon: "🔴",
    label_zh: "严重",
    label_th: "วิกฤต",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-800",
    badge: "bg-yellow-100 text-yellow-700",
    icon: "🟡",
    label_zh: "预警",
    label_th: "เตือน",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    badge: "bg-blue-100 text-blue-700",
    icon: "🟢",
    label_zh: "信息",
    label_th: "ข้อมูล",
  },
};

export function RiskAlert({ alerts, lang = "zh" }: RiskAlertProps) {
  if (alerts.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        {lang === "zh" ? "无风险预警" : "ไม่มีการแจ้งเตือนความเสี่ยง"}
      </p>
    );
  }

  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.level] - order[b.level];
  });

  return (
    <div className="space-y-2">
      {sorted.map((alert, i) => {
        const cfg = LEVEL_CONFIG[alert.level];
        return (
          <div
            key={i}
            className={`rounded-lg border p-3 ${cfg.bg} ${cfg.border}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-base leading-5 shrink-0">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-semibold ${cfg.text}`}>
                    {alert.metric}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                    {lang === "zh" ? cfg.label_zh : cfg.label_th}
                  </span>
                </div>
                <p className={`text-xs ${cfg.text} opacity-80`}>{alert.message}</p>
                {(alert.value !== undefined || alert.threshold !== undefined) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {alert.value !== undefined && `实际: ${alert.value}`}
                    {alert.threshold !== undefined && ` / 阈值: ${alert.threshold}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
