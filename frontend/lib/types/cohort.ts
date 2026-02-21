export interface CohortMonthRow {
  cohort: string;
  [metric: string]: number | null | string;
}

export interface HeatmapResponse {
  metrics: string[];
  metric_labels: string[];
  months: number[];
  matrix: (number | null)[][];
  cohort_months: CohortMonthRow[];
  data_source: string;
}

export interface DecayResponse {
  metric: string;
  metric_label: string;
  by_cohort_month: { cohort: string; series: { month: number; value: number }[] }[];
  summary_decay: { month: number; value: number | null }[];
  data_source: string;
}

export interface DetailResponse {
  retention_by_age: { m: number; valid_rate: number; reach_rate: number; bring_new_rate: number }[];
  by_cc: {
    cc: string;
    team: string;
    students: number;
    valid_rate: number;
    reach_rate: number;
    bring_new_rate: number;
    bring_new_total: number;
  }[];
  churn_by_age: {
    m: number;
    first_churn_count: number;
    first_churn_rate: number;
    cumulative_churn_rate: number;
  }[];
  top_bringers: {
    student_id: string;
    total_new: number;
    team: string;
    last_active_m: number;
    cohort: string;
  }[];
  total_students: number;
  data_source: string;
}

export const METRIC_OPTIONS = [
  { key: "reach_rate", label: "触达率" },
  { key: "participation_rate", label: "参与率" },
  { key: "checkin_rate", label: "打卡率" },
  { key: "referral_coefficient", label: "带新系数" },
  { key: "conversion_ratio", label: "带货比" },
] as const;

export const TABS = [
  { id: "heatmap", label: "留存热力图" },
  { id: "decay", label: "衰减曲线" },
  { id: "detail", label: "学员留存" },
] as const;

export type TabId = (typeof TABS)[number]["id"];
