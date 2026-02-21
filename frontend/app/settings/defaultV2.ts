import type { MonthlyTargetV2, ChannelTarget, EnclosureTarget } from "@/lib/types";

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
      display_currency: "THB",
      lock_field: "pct",
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
      d91_180: emptyEnclosure(),
      d181_plus: emptyEnclosure(),
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

export const MONTHS = ["202601", "202602", "202603", "202604", "202605", "202606"];
