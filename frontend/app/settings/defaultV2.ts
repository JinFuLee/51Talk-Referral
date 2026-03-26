import type { MonthlyTargetV2, ChannelTarget, EnclosureTarget } from '@/lib/types';

export function defaultV2(month: string): MonthlyTargetV2 {
  const emptyChannel = (): ChannelTarget => ({
    user_count: 0,
    asp: 0,
    conversion_rate: 0,
    reserve_rate: 0,
    attend_rate: 0,
  });
  const emptyEnclosure = (): EnclosureTarget => ({
    reach_rate: 0,
    participation_rate: 0,
    conversion_rate: 0,
    checkin_rate: 0,
  });
  return {
    version: 2,
    month,
    hard: {
      total_revenue: 0,
      referral_pct: 0,
      referral_revenue: 0,
      display_currency: 'THB',
      lock_field: 'pct',
    },
    channels: {
      cc_narrow: emptyChannel(),
      ss_narrow: emptyChannel(),
      lp_narrow: emptyChannel(),
      wide: emptyChannel(),
    },
    enclosures: {
      d0_30: emptyEnclosure(),
      d31_60: emptyEnclosure(),
      d61_90: emptyEnclosure(),
      d91_120: emptyEnclosure(),
      d121_150: emptyEnclosure(),
      d151_180: emptyEnclosure(),
      d6M: emptyEnclosure(),
      d7M: emptyEnclosure(),
      d8M: emptyEnclosure(),
      d9M: emptyEnclosure(),
      d10M: emptyEnclosure(),
      d11M: emptyEnclosure(),
      d12M: emptyEnclosure(),
      d12M_plus: emptyEnclosure(),
    },
    sop: {
      checkin_rate: 0,
      reach_rate: 0,
      participation_rate: 0,
      reserve_rate: 0,
      attend_rate: 0,
      outreach_calls_per_day: 0,
    },
  };
}

// 动态生成月份列表：当前年份的 12 个月
export const MONTHS = (() => {
  const year = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => `${year}${String(i + 1).padStart(2, '0')}`);
})();
