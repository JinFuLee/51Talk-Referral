"use client";

export interface NumInputProps {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  className?: string;
}

export function NumInput({
  value,
  onChange,
  suffix,
  step = 1,
  min = 0,
  className = "",
}: NumInputProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      />
      {suffix && <span className="text-xs text-[var(--text-muted)]">{suffix}</span>}
    </div>
  );
}

export interface PctInputProps {
  value: number;
  onChange: (v: number) => void;
}

export function PctInput({ value, onChange }: PctInputProps) {
  return (
    <NumInput
      value={Math.round(value * 10000) / 100}
      onChange={(v) => onChange(v / 100)}
      suffix="%"
      step={0.1}
    />
  );
}
