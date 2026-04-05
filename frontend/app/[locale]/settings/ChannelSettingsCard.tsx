'use client';

import { useLocale } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { NumInput, PctInput } from '@/components/ui/NumInput';
import type { ChannelDecomposition, ChannelTarget, MonthlyTargetV2 } from '@/lib/types';
import { formatRate } from '@/lib/utils';

const I18N = {
  zh: {
    cardTitle: '渠道拆解 (L2)',
    channel: '渠道',
    regTarget: '注册目标',
    asp: '客单价',
    convRate: '转化率',
    paidTarget: '付费目标',
    revTarget: '收入目标',
    total: '合计',
    cc_narrow: 'CC窄口',
    ss_narrow: 'SS窄口',
    lp_narrow: 'LP窄口',
    wide: '宽口',
  },
  'zh-TW': {
    cardTitle: '渠道拆解 (L2)',
    channel: '渠道',
    regTarget: '註冊目標',
    asp: '客單價',
    convRate: '轉化率',
    paidTarget: '付費目標',
    revTarget: '收入目標',
    total: '合計',
    cc_narrow: 'CC窄口',
    ss_narrow: 'SS窄口',
    lp_narrow: 'LP窄口',
    wide: '寬口',
  },
  en: {
    cardTitle: 'Channel Breakdown (L2)',
    channel: 'Channel',
    regTarget: 'Reg Target',
    asp: 'ASP',
    convRate: 'Conv Rate',
    paidTarget: 'Paid Target',
    revTarget: 'Rev Target',
    total: 'Total',
    cc_narrow: 'CC Narrow',
    ss_narrow: 'SS Narrow',
    lp_narrow: 'LP Narrow',
    wide: 'Wide',
  },
  th: {
    cardTitle: 'แยกช่องทาง (L2)',
    channel: 'ช่องทาง',
    regTarget: 'เป้าลงทะเบียน',
    asp: 'ราคาเฉลี่ย',
    convRate: 'อัตราแปลง',
    paidTarget: 'เป้าชำระเงิน',
    revTarget: 'เป้ารายได้',
    total: 'รวม',
    cc_narrow: 'CC แคบ',
    ss_narrow: 'SS แคบ',
    lp_narrow: 'LP แคบ',
    wide: 'กว้าง',
  },
};

const CHANNEL_KEYS: (keyof ChannelDecomposition)[] = [
  'cc_narrow',
  'ss_narrow',
  'lp_narrow',
  'wide',
];

interface ChannelSettingsCardProps {
  v2: MonthlyTargetV2;
  onUpdateChannel: (key: keyof ChannelDecomposition, patch: Partial<ChannelTarget>) => void;
}

export default function ChannelSettingsCard({ v2, onUpdateChannel }: ChannelSettingsCardProps) {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
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
    <Card title={t.cardTitle}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="slide-thead-row text-xs">
              <th className="text-left py-1.5 px-2 w-20">{t.channel}</th>
              <th className="text-right py-1.5 px-2">{t.regTarget}</th>
              <th className="text-right py-1.5 px-2">{t.asp}</th>
              <th className="text-right py-1.5 px-2">{t.convRate}</th>
              <th className="text-right py-1.5 px-2">{t.paidTarget}</th>
              <th className="text-right py-1.5 px-2">{t.revTarget}</th>
            </tr>
          </thead>
          <tbody>
            {CHANNEL_KEYS.map((k) => {
              const c = ch[k];
              const paid = Math.round(c.user_count * c.conversion_rate);
              const rev = paid * c.asp;
              return (
                <tr key={k} className="border-b border-subtle-token">
                  <td className="py-1 px-2 text-xs font-medium text-secondary-token">
                    {t[k as keyof typeof t]}
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
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                    {paid}
                  </td>
                  <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-secondary-token">
                    ${rev.toLocaleString()}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-subtle-token font-semibold">
              <td className="py-1 px-2 text-xs text-primary-token">{t.total}</td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-primary-token">
                {totalReg}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-muted-token">
                —
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-muted-token">
                {totalReg > 0 ? formatRate(totalPaid / totalReg) : '—'}
              </td>
              <td className="py-1 px-2 text-xs text-right font-mono tabular-nums text-primary-token">
                {totalPaid}
              </td>
              <td
                className={`py-1 px-2 text-xs text-right font-mono tabular-nums ${
                  revenueGap !== 0 && v2.hard.referral_revenue > 0
                    ? 'text-warning-token'
                    : 'text-primary-token'
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
