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
