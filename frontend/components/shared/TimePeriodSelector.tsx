"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfigStore } from "@/lib/stores/config-store";
import { analysisAPI } from "@/lib/api";

const PERIOD_OPTIONS = [
  { value: "this_week", label: "本周T-1" },
  { value: "this_month", label: "本月T-1" },
  { value: "last_7_days", label: "近7日" },
  { value: "last_30_days", label: "近30日" },
  { value: "last_month", label: "上个月" },
  { value: "this_quarter", label: "本季度" },
  { value: "last_quarter", label: "上季度" },
  { value: "this_year", label: "本年" },
  { value: "last_year", label: "上年" },
  { value: "custom", label: "自定义范围" },
] as const;

export function TimePeriodSelector() {
  const period = useConfigStore((s) => s.period);
  const customStart = useConfigStore((s) => s.customStart);
  const customEnd = useConfigStore((s) => s.customEnd);
  const setPeriod = useConfigStore((s) => s.setPeriod);
  const [loading, setLoading] = useState(false);

  async function handlePeriodChange(value: string) {
    if (value === "custom") {
      setPeriod(value, customStart, customEnd);
      return;
    }
    setPeriod(value);
    setLoading(true);
    try {
      await analysisAPI.run({ period: value });
    } catch {
      // non-blocking — SWR will refetch with updated period key
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomDateChange(
    field: "start" | "end",
    dateValue: string
  ) {
    const newStart = field === "start" ? dateValue : customStart;
    const newEnd = field === "end" ? dateValue : customEnd;
    setPeriod("custom", newStart, newEnd);
    if (newStart && newEnd) {
      setLoading(true);
      try {
        await analysisAPI.run({
          period: "custom",
          custom_start: newStart,
          custom_end: newEnd,
        });
      } catch {
        // non-blocking
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="h-8 w-[120px] rounded-full border border-slate-200 bg-slate-50 px-3 py-0 text-xs font-semibold text-slate-600 shadow-none focus:ring-1 focus:ring-slate-300">
          <SelectValue placeholder="选择时段" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "custom" && (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={customStart ?? ""}
            onChange={(e) => handleCustomDateChange("start", e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
          <span className="text-xs text-slate-400">—</span>
          <input
            type="date"
            value={customEnd ?? ""}
            onChange={(e) => handleCustomDateChange("end", e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>
      )}

      {loading && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
      )}
    </div>
  );
}
