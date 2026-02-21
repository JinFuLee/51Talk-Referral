"use client";

import { Card } from "@/components/ui/Card";
import { NumInput, PctInput } from "@/components/ui/NumInput";
import type { SOPTargets, MonthlyTargetV2 } from "@/lib/types";

function CollapseToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
    >
      <span>{open ? "▼ 收起" : "▶ 展开"}</span>
    </button>
  );
}

interface SOPSettingsCardProps {
  v2: MonthlyTargetV2;
  open: boolean;
  onToggle: () => void;
  onUpdateSOP: (patch: Partial<SOPTargets>) => void;
}

export default function SOPSettingsCard({
  v2,
  open,
  onToggle,
  onUpdateSOP,
}: SOPSettingsCardProps) {
  return (
    <Card
      title="SOP 过程指标"
      actions={<CollapseToggle open={open} onToggle={onToggle} />}
    >
      {open ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">24H打卡率</label>
            <PctInput
              value={v2.sop.checkin_rate}
              onChange={(v) => onUpdateSOP({ checkin_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">触达率</label>
            <PctInput
              value={v2.sop.reach_rate}
              onChange={(v) => onUpdateSOP({ reach_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">参与率</label>
            <PctInput
              value={v2.sop.participation_rate}
              onChange={(v) => onUpdateSOP({ participation_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">约课率</label>
            <PctInput
              value={v2.sop.reserve_rate}
              onChange={(v) => onUpdateSOP({ reserve_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">出席率</label>
            <PctInput
              value={v2.sop.attend_rate}
              onChange={(v) => onUpdateSOP({ attend_rate: v })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">日外呼目标</label>
            <NumInput
              value={v2.sop.outreach_calls_per_day}
              onChange={(v) => onUpdateSOP({ outreach_calls_per_day: v })}
              suffix="次/天"
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">点击右上角展开配置</p>
      )}
    </Card>
  );
}
