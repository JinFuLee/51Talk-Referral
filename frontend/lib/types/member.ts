export interface StudentBrief {
  id: string | number
  name: string
  enclosure: string
  lifecycle: string
  cc_name: string
  cc_group: string
  registrations: number
  appointments: number
  attendance: number
  payments: number
  // D4 高价值列
  checkin_this_month?: number | null
  lesson_consumed_this_month?: number | null
  referral_code_count_this_month?: number | null
  referral_reward_status?: string | null
  days_until_card_expiry?: number | null
  cc_last_call_date?: string | null
}

export interface HighPotentialStudent {
  id: string | number
  enclosure: string
  total_new: number
  attendance: number
  payments: number
  cc_group: string
  cc_name: string
  ss_group: string
  ss_name: string
  lp_group: string
  lp_name: string
}
