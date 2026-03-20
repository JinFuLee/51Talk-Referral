import type { ChannelMetrics } from "@/lib/types/channel";
import { formatRate } from "@/lib/utils";

interface ChannelFunnelTableProps {
  channels: ChannelMetrics[];
}

const STAGES = ["registrations", "appointments", "attendance", "payments"] as const;
const STAGE_LABELS: Record<(typeof STAGES)[number], string> = {
  registrations: "注册",
  appointments: "预约",
  attendance: "出席",
  payments: "付费",
};

export function ChannelFunnelTable({ channels }: ChannelFunnelTableProps) {
  if (channels.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)] text-center py-6">暂无渠道漏斗数据</p>
    );
  }

  // Compute totals row (null-safe)
  const totals = STAGES.reduce(
    (acc, key) => {
      acc[key] = channels.reduce((sum, c) => sum + (c[key] ?? 0), 0);
      return acc;
    },
    {} as Record<(typeof STAGES)[number], number>
  );

  function convRate(numerator: number | null | undefined, denominator: number | null | undefined) {
    const n = numerator ?? 0;
    const d = denominator ?? 0;
    if (d === 0) return "—";
    return formatRate(n / d);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--n-800)] text-white text-xs font-medium">
            <th className="py-1.5 px-2 border-0 text-left">渠道</th>
            {STAGES.map((s) => (
              <th key={s} className="py-1.5 px-2 border-0 text-right">
                {STAGE_LABELS[s]}
              </th>
            ))}
            <th className="py-1.5 px-2 border-0 text-right">注→预</th>
            <th className="py-1.5 px-2 border-0 text-right">预→出</th>
            <th className="py-1.5 px-2 border-0 text-right">出→付</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((c) => (
            <tr
              key={c.channel}
              className="even:bg-[var(--bg-subtle)]"
            >
              <td className="py-1 px-2 text-xs font-medium text-[var(--text-primary)]">
                {c.channel}
              </td>
              {STAGES.map((s) => (
                <td key={s} className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-primary)]">
                  {c[s] != null ? c[s]!.toLocaleString() : "—"}
                </td>
              ))}
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                {convRate(c.appointments, c.registrations)}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                {convRate(c.attendance, c.appointments)}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                {convRate(c.payments, c.attendance)}
              </td>
            </tr>
          ))}
          {/* Totals row */}
          <tr className="bg-[var(--bg-subtle)] font-semibold border-t border-[var(--border-subtle)]">
            <td className="py-1 px-2 text-xs text-[var(--text-primary)]">合计</td>
            {STAGES.map((s) => (
              <td key={s} className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-primary)]">
                {totals[s].toLocaleString()}
              </td>
            ))}
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
              {convRate(totals.appointments, totals.registrations)}
            </td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
              {convRate(totals.attendance, totals.appointments)}
            </td>
            <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
              {convRate(totals.payments, totals.attendance)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
