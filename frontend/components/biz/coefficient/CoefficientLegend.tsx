"use client";

interface CoefficientLine {
  cohort: string;
}

const PALETTE = [
  "hsl(var(--chart-4))",
  "hsl(var(--success))",
  "hsl(var(--chart-amber))",
  "hsl(var(--chart-rose))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-pink))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-lime))",
  "hsl(var(--chart-orange))",
];

interface CoefficientLegendProps {
  lines: CoefficientLine[];
  visibleCohorts: Set<string>;
  viewMode: "month" | "team";
  goldenMonth: number | null;
  goldenValue: number;
  onToggle: (cohort: string) => void;
}

export default function CoefficientLegend({
  lines,
  visibleCohorts,
  viewMode,
  goldenMonth,
  goldenValue,
  onToggle,
}: CoefficientLegendProps) {
  return (
    <div className="space-y-3">
      {goldenMonth !== null && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30">
          <span className="text-warning font-bold text-sm">黄金窗口</span>
          <span className="text-warning text-sm font-semibold">M{goldenMonth}</span>
          <span className="text-warning/80 text-xs">
            均值带新系数 {goldenValue.toFixed(2)} — 建议在此月龄集中运营资源
          </span>
        </div>
      )}

      {lines.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500 font-medium">
            {viewMode === "month" ? "入组月:" : "小组:"}
          </span>
          {lines.map((l, idx) => {
            const active = visibleCohorts.has(l.cohort);
            const color = PALETTE[idx % PALETTE.length];
            return (
              <button
                key={l.cohort}
                onClick={() => onToggle(l.cohort)}
                className={`px-2 py-0.5 rounded text-xs border transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none ${
                  active ? "opacity-100" : "opacity-40"
                }`}
                style={{
                  borderColor: color,
                  color: active ? color : "hsl(var(--muted-foreground))",
                  backgroundColor: active ? `${color}18` : "transparent",
                }}
              >
                {l.cohort}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
