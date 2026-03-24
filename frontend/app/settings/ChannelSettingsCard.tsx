'use client';

import { Card } from '@/components/ui/Card';
import { NumInput, PctInput } from '@/components/ui/NumInput';
import type { ChannelDecomposition, ChannelTarget, MonthlyTargetV2 } from '@/lib/types';

const CHANNEL_KEYS: (keyof ChannelDecomposition)[] = [
  'cc_narrow',
  'ss_narrow',
  'lp_narrow',
  'wide',
];

const CHANNEL_LABELS: Record<string, string> = {
  cc_narrow: 'CC窄口',
  ss_narrow: 'SS窄口',
  lp_narrow: 'LP窄口',
  wide: '宽口',
};

interface ChannelSettingsCardProps {
  v2: MonthlyTargetV2;
  onUpdateChannel: (key: keyof ChannelDecomposition, patch: Partial<ChannelTarget>) => void;
}

export default function ChannelSettingsCard({ v2, onUpdateChannel }: ChannelSettingsCardProps) {
  const ch = v2.channels;

  const totalReg = CHANNEL_KEYS.reduce((s, k) => s + ch[k].user_count, 0);
  const totalPaid = CHANNEL_KEYS.reduce(
    (s, k) => s + Math.round(ch[k].user_count * ch[k].conversion_rate),
    0
  );
  const totalChannelRevenue = CHANNEL_KEYS.reduce((s, k) => {
    const c = ch[k];
    return s + Math.round(c.user_count * c.conversion_rate) * c.asp;
  }, 0);
  const revenueGap =
    v2.hard.referral_revenue > 0 ? totalChannelRevenue - v2.hard.referral_revenue : 0;

  return (
    <Card title="渠道拆解 (L2)">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row text-xs">
              <th className="text-left py-1.5 px-2 w-20">渠道</th>
              <th className="text-right py-1.5 px-2">注册目标</th>
              <th className="text-right py-1.5 px-2">客单价</th>
              <th className="text-right py-1.5 px-2">转化率</th>
              <th className="text-right py-1.5 px-2">付费目标</th>
              <th className="text-right py-1.5 px-2">收入目标</th>
            </tr>
          </thead>
          <tbody>
            {CHANNEL_KEYS.map((k) => {
              const c = ch[k];
              const paid = Math.round(c.user_count * c.conversion_rate);
              const rev = paid * c.asp;
              return (
                <tr key={k} className="border-b border-[var(--border-subtle)]">
                  <td className="py-1 px-2 text-xs font-medium text-[var(--text-secondary)]">
                    {CHANNEL_LABELS[k]}
                  </td>
                  <td className="py-1 px-2 text-xs text-right">
                    <NumInput
                      value={c.user_count}
                      onChange={(v) => onUpdateChannel(k, { user_count: v })}
                    />
                  </td>
                  <td className="py-1 px-2 text-xs text-right">
                    <NumInput
                      value={c.asp}
                      onChange={(v) => onUpdateChannel(k, { asp: v })}
                      suffix="USD"
                      step={10}
                    />
                  </td>
                  <td className="py-1 px-2 text-xs text-right">
                    <PctInput
                      value={c.conversion_rate}
                      onChange={(v) => onUpdateChannel(k, { conversion_rate: v })}
                    />
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {paid}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    ${rev.toLocaleString()}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-[var(--border-subtle)] font-semibold">
              <td className="py-1 px-2 text-xs text-[var(--text-primary)]">合计</td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-primary)]">
                {totalReg}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                —
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-muted)]">
                {totalReg > 0 ? `${((totalPaid / totalReg) * 100).toFixed(1)}%` : '—'}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-[var(--text-primary)]">
                {totalPaid}
              </td>
              <td
                className={`py-1 px-2 text-xs text-right font-mono tabular-nums ${
                  revenueGap !== 0 && v2.hard.referral_revenue > 0
                    ? 'text-yellow-600'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                ${totalChannelRevenue.toLocaleString()}
                {revenueGap !== 0 && v2.hard.referral_revenue > 0 && (
                  <span className="text-xs ml-1">
                    ({revenueGap > 0 ? '+' : ''}
                    {revenueGap.toLocaleString()})
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
