"use client";

interface CoefficientLine {
  cohort: string;
  series: { month: number; value: number }[];
}

interface CoefficientSummaryCardsProps {
  lines: CoefficientLine[];
  goldenMonth: number | null;
  goldenValue: number;
  viewMode: "month" | "team";
}

export default function CoefficientSummaryCards({
  lines,
  goldenMonth,
  goldenValue,
  viewMode,
}: CoefficientSummaryCardsProps) {
  if (lines.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-2 py-1.5 text-slate-500 font-medium">
              {viewMode === "month" ? "入组月" : "小组"}
            </th>
            {Array.from({ length: 12 }, (_, i) => (
              <th
                key={i}
                className={`px-2 py-1.5 text-center font-medium ${
                  goldenMonth === i + 1
                    ? "text-warning bg-warning/10"
                    : "text-slate-500"
                }`}
              >
                M{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.cohort} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="px-2 py-1.5 font-medium text-slate-700">{l.cohort}</td>
              {Array.from({ length: 12 }, (_, i) => {
                const pt = l.series.find((p) => p.month === i + 1);
                return (
                  <td
                    key={i}
                    className={`px-2 py-1.5 text-center ${
                      goldenMonth === i + 1
                        ? "bg-warning/10 font-semibold text-warning"
                        : "text-slate-600"
                    }`}
                  >
                    {pt !== undefined ? pt.value.toFixed(2) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {goldenMonth !== null && (
        <p className="text-xs text-warning mt-2">
          黄金窗口 M{goldenMonth}：均值带新系数 {goldenValue.toFixed(2)}
        </p>
      )}
    </div>
  );
}
