"use client";

const FILTERS = [
  { label: "全部", value: "" },
  { label: "0~30天", value: "0-30" },
  { label: "31~60天", value: "31-60" },
  { label: "61~90天", value: "61-90" },
  { label: "91~180天", value: "91-180" },
  { label: "181天+", value: "181+" },
];

interface EnclosureFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function EnclosureFilter({ value, onChange }: EnclosureFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="围场分段筛选">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === f.value
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          aria-pressed={value === f.value}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
