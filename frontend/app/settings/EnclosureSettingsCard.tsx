"use client";

import { Card } from "@/components/ui/Card";
import { PctInput } from "@/components/ui/NumInput";
import type { EnclosureTarget, MonthlyTargetV2 } from "@/lib/types";

const ENCLOSURE_KEYS = ["d0_30", "d31_60", "d61_90", "d91_180", "d181_plus"] as const;
type EnclosureKey = (typeof ENCLOSURE_KEYS)[number];

const ENCLOSURE_LABELS: Record<EnclosureKey, string> = {
  d0_30: "0-30天",
  d31_60: "31-60天",
  d61_90: "61-90天",
  d91_180: "91-180天",
  d181_plus: "181+天",
};

const ENCLOSURE_METRICS: { key: keyof EnclosureTarget; label: string }[] = [
  { key: "reach_rate", label: "触达率" },
  { key: "participation_rate", label: "参与率" },
  { key: "conversion_rate", label: "转化率" },
  { key: "checkin_rate", label: "打卡率" },
];

interface CollapseToggleProps {
  open: boolean;
  onToggle: () => void;
}

function CollapseToggle({ open, onToggle }: CollapseToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
    >
      <span>{open ? "▼ 收起" : "▶ 展开"}</span>
    </button>
  );
}

interface EnclosureSettingsCardProps {
  v2: MonthlyTargetV2;
  open: boolean;
  onToggle: () => void;
  onUpdateEnclosure: (key: string, patch: Partial<EnclosureTarget>) => void;
}

const EMPTY_ENCLOSURE: EnclosureTarget = {
  reach_rate: 0,
  participation_rate: 0,
  conversion_rate: 0,
  checkin_rate: 0,
};

export default function EnclosureSettingsCard({
  v2,
  open,
  onToggle,
  onUpdateEnclosure,
}: EnclosureSettingsCardProps) {
  const enclosures = v2.enclosures ?? {} as Record<string, EnclosureTarget>;
  return (
    <Card
      title="围场目标"
      actions={<CollapseToggle open={open} onToggle={onToggle} />}
    >
      {open ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 font-medium text-slate-500">指标</th>
                {ENCLOSURE_KEYS.map((k) => (
                  <th key={k} className="text-right py-2 font-medium text-slate-500">
                    {ENCLOSURE_LABELS[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ENCLOSURE_METRICS.map(({ key: metric, label }) => (
                <tr key={metric} className="border-b border-slate-50">
                  <td className="py-2 text-slate-700">{label}</td>
                  {ENCLOSURE_KEYS.map((k) => (
                    <td key={k} className="py-2 text-right">
                      <PctInput
                        value={(enclosures[k] ?? EMPTY_ENCLOSURE)[metric]}
                        onChange={(v) => onUpdateEnclosure(k, { [metric]: v })}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-400">点击右上角展开配置</p>
      )}
    </Card>
  );
}
