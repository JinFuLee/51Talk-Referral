import { PercentBar } from "@/components/shared/PercentBar";
import { formatRate } from "@/lib/utils";

interface OverviewStage {
  name: string;
  target: number;
  actual: number;
  achievement_rate: number;
  conversion_rate?: number;
}

interface FunnelSnapshotProps {
  stages: OverviewStage[];
}

const PAIRS = [
  { from: "注册", to: "预约" },
  { from: "预约", to: "出席" },
  { from: "出席", to: "付费" },
] as const;

export function FunnelSnapshot({ stages }: FunnelSnapshotProps) {
  const stageMap = Object.fromEntries(stages.map((s) => [s.name, s]));

  return (
    <div className="space-y-3">
      {PAIRS.map(({ from, to }) => {
        const fromStage = stageMap[from];
        const toStage = stageMap[to];
        if (!fromStage || !toStage) return null;
        const rate =
          fromStage.actual > 0 ? toStage.actual / fromStage.actual : 0;
        const colorClass =
          rate >= 0.5
            ? "bg-green-500"
            : rate >= 0.3
            ? "bg-yellow-400"
            : "bg-red-400";
        return (
          <div key={`${from}-${to}`}>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>
                {from} → {to}
              </span>
              <span className="font-medium text-slate-700">
                {formatRate(rate)}
              </span>
            </div>
            <PercentBar value={rate * 100} max={100} colorClass={colorClass} />
          </div>
        );
      })}
    </div>
  );
}
