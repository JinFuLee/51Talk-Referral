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

  // Compute totals row
  const totals = STAGES.reduce(
    (acc, key) => {
      acc[key] = channels.reduce((sum, c) => sum + c[key], 0);
      return acc;
    },
    {} as Record<(typeof STAGES)[number], number>
  );

  function convRate(numerator: number, denominator: number) {
    if (denominator === 0) return "—";
    return formatRate(numerator / denominator);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--text-muted)] border-b border-slate-100">
            <th className="py-2 pr-3 font-medium">渠道</th>
            {STAGES.map((s) => (
              <th key={s} className="py-2 pr-3 text-right font-medium">
                {STAGE_LABELS[s]}
              </th>
            ))}
            <th className="py-2 pr-3 text-right font-medium">注→预</th>
            <th className="py-2 pr-3 text-right font-medium">预→出</th>
            <th className="py-2 text-right font-medium">出→付</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((c) => (
            <tr
              key={c.channel}
              className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
            >
              <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)]">
                {c.channel}
              </td>
              {STAGES.map((s) => (
                <td key={s} className="py-2.5 pr-3 text-right text-[var(--text-primary)]">
                  {c[s].toLocaleString()}
                </td>
              ))}
              <td className="py-2.5 pr-3 text-right text-[var(--text-secondary)] text-xs">
                {convRate(c.appointments, c.registrations)}
              </td>
              <td className="py-2.5 pr-3 text-right text-[var(--text-secondary)] text-xs">
                {convRate(c.attendance, c.appointments)}
              </td>
              <td className="py-2.5 text-right text-[var(--text-secondary)] text-xs">
                {convRate(c.payments, c.attendance)}
              </td>
            </tr>
          ))}
          {/* Totals row */}
          <tr className="bg-slate-50 font-semibold border-t border-slate-200">
            <td className="py-2.5 pr-3 text-[var(--text-primary)]">合计</td>
            {STAGES.map((s) => (
              <td key={s} className="py-2.5 pr-3 text-right text-[var(--text-primary)]">
                {totals[s].toLocaleString()}
              </td>
            ))}
            <td className="py-2.5 pr-3 text-right text-[var(--text-secondary)] text-xs">
              {convRate(totals.appointments, totals.registrations)}
            </td>
            <td className="py-2.5 pr-3 text-right text-[var(--text-secondary)] text-xs">
              {convRate(totals.attendance, totals.appointments)}
            </td>
            <td className="py-2.5 text-right text-[var(--text-secondary)] text-xs">
              {convRate(totals.payments, totals.attendance)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
