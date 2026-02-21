"use client";

import { AnomalyItem } from "@/lib/types";

interface AnomalyAlertProps {
  anomalies: AnomalyItem[];
  lang?: "zh" | "th";
}

const SEVERITY_CONFIG = {
  high: {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    label_zh: "高",
    label_th: "สูง",
    icon: "🔴",
  },
  medium: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700",
    label_zh: "中",
    label_th: "กลาง",
    icon: "🟡",
  },
  low: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    badge: "bg-gray-100 text-gray-600",
    label_zh: "低",
    label_th: "ต่ำ",
    icon: "🟢",
  },
};

export function AnomalyAlert({ anomalies, lang = "zh" }: AnomalyAlertProps) {
  if (anomalies.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        {lang === "zh" ? "无异常检测结果" : "ไม่พบความผิดปกติ"}
      </p>
    );
  }

  const grouped = {
    high: anomalies.filter((a) => a.severity === "high"),
    medium: anomalies.filter((a) => a.severity === "medium"),
    low: anomalies.filter((a) => a.severity === "low"),
  };

  return (
    <div className="space-y-3">
      {(["high", "medium", "low"] as const).map((severity) => {
        const items = grouped[severity];
        if (items.length === 0) return null;
        const cfg = SEVERITY_CONFIG[severity];

        return (
          <div key={severity}>
            <div className="flex items-center gap-2 mb-2">
              <span>{cfg.icon}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                {lang === "zh" ? cfg.label_zh : cfg.label_th} ({items.length})
              </span>
            </div>
            <div className="space-y-2">
              {items.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 shadow-flash hover:shadow-flash-lg hover:-translate-y-1 transition-all duration-500 ${cfg.bg} ${cfg.border}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.metric}</p>
                      {a.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">{a.value}</p>
                      {a.expected !== undefined && (
                        <p className="text-xs text-gray-400">
                          {lang === "zh" ? "预期" : "คาดหวัง"}: {a.expected}
                        </p>
                      )}
                    </div>
                  </div>
                  {a.date && (
                    <p className="text-xs text-gray-400 mt-1">{a.date}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
