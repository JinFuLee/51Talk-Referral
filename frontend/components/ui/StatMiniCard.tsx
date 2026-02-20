"use client";

interface StatMiniCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "blue" | "green" | "yellow" | "red" | "slate";
}

const accentColor: Record<string, string> = {
  blue: "text-blue-600",
  green: "text-green-600",
  yellow: "text-yellow-600",
  red: "text-red-600",
  slate: "text-slate-700",
};

export function StatMiniCard({ label, value, sub, accent = "slate" }: StatMiniCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accentColor[accent]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
