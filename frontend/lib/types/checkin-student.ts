// 打卡学员分析类型定义 — 匹配后端 /api/checkin/student-analysis 响应
// 字段名与 backend/api/checkin.py student_analysis 端点完全对齐

// ── 基础单元 ──────────────────────────────────────────────────────────────────

/** 精确频次项（0-6 次，7 个桶） */
export interface FrequencyItem {
  /** 打卡次数 0-6 */
  count: number;
  /** 该次数学员人数 */
  students: number;
  /** 占总学员比例 0-1 */
  pct: number;
}

/** 频段分组项（4 段：0次 / 1-2次 / 3-4次 / 5-6次） */
export interface FrequencyBand {
  /** 频段标签，如 "0次" "1-2次" "3-4次" "5-6次" */
  band: string;
  /** 该频段学员人数 */
  students: number;
  /** 占总学员比例 0-1 */
  pct: number;
}

// ── 月度对比 ──────────────────────────────────────────────────────────────────

/** 本月 vs 上月打卡指标对比 */
export interface MonthComparison {
  /** 本月人均打卡天数 */
  avg_days_this: number;
  /** 上月人均打卡天数 */
  avg_days_last: number;
  /** 本月零打卡学员数 */
  zero_this: number;
  /** 上月零打卡学员数 */
  zero_last: number;
  /** 本月满勤（≥6次）学员数 */
  superfan_this: number;
  /** 上月满勤学员数 */
  superfan_last: number;
  /** 本月活跃（4-5次）学员数 */
  active_this: number;
  /** 上月活跃学员数 */
  active_last: number;
  /** 总有效学员数 */
  total_students: number;
  /** 本月参与率（>0次/总学员）0-1 */
  participation_rate_this: number;
  /** 上月参与率 0-1 */
  participation_rate_last: number;
}

// ── 转化漏斗 ──────────────────────────────────────────────────────────────────

/** 打卡频段×转化漏斗交叉项 */
export interface ConversionFunnelItem {
  /** 频段标签 */
  band: string;
  /** 该频段总学员数 */
  students: number;
  /** 有推荐注册的学员比例 0-1 */
  has_registration_pct: number;
  /** 有推荐付费的学员比例 0-1 */
  has_payment_pct: number;
  /** 人均推荐注册数 */
  avg_registrations: number;
  /** 人均推荐付费数 */
  avg_payments: number;
}

// ── 围场分布 ──────────────────────────────────────────────────────────────────

/** 围场打卡分布项 */
export interface EnclosureDistItem {
  /** 围场标签，如 M0 / M1 / M2 */
  enclosure: string;
  /** 该围场总学员数 */
  total: number;
  /** 人均打卡天数 */
  avg_days: number;
  /** 参与率 0-1 */
  participation_rate: number;
  /** 0-6 次精确分布 */
  distribution: FrequencyItem[];
}

// ── 课耗×打卡四象限 ───────────────────────────────────────────────────────────

/** 课耗×打卡交叉分析（四象限） */
export interface LessonCheckinCross {
  /** 有课耗 + 无打卡（激活目标池） */
  has_lesson_no_checkin: number;
  /** 有课耗 + 有打卡（核心用户） */
  has_lesson_has_checkin: number;
  /** 无课耗 + 有打卡（轻度参与） */
  no_lesson_has_checkin: number;
  /** 无课耗 + 无打卡（完全沉默） */
  no_lesson_no_checkin: number;
  /** 按频段统计的课耗×打卡数据 */
  by_band: Array<{
    band: string;
    avg_lesson: number;
    students: number;
  }>;
}

// ── CC 触达×打卡响应 ───────────────────────────────────────────────────────────

/** 单个联系频次分组的打卡统计 */
export interface ContactCheckinGroup {
  /** 该分组学员数 */
  students: number;
  /** 人均打卡天数 */
  avg_days: number;
  /** 参与率 0-1 */
  participation_rate: number;
}

/** CC 触达×打卡响应完整数据 */
export interface ContactCheckinResponse {
  /** 近 7 天有联系的学员 */
  contacted_7d: ContactCheckinGroup;
  /** 8-14 天前联系的学员 */
  contacted_14d: ContactCheckinGroup;
  /** 14 天以上前联系的学员 */
  contacted_14d_plus: ContactCheckinGroup;
  /** 从未联系的学员 */
  never_contacted: ContactCheckinGroup;
}

// ── 续费×打卡关联 ─────────────────────────────────────────────────────────────

/** 续费×打卡关联分析 */
export interface RenewalCorrelation {
  by_band: Array<{
    band: string;
    avg_renewals: number;
    has_renewal_pct: number;
    students: number;
  }>;
}

// ── 学员明细行 ────────────────────────────────────────────────────────────────

/** 学员明细行（top_students + improvement_ranking 共用） */
export interface StudentRow {
  /** 学员 ID */
  student_id: string;
  /** 围场标签，如 M0 / M1 */
  enclosure: string;
  /** 负责 CC 姓名 */
  cc_name: string;
  /** 团队名称 */
  team: string;
  /** 本月打卡天数（0-6） */
  days_this_month: number;
  /** 上月打卡天数（0-6） */
  days_last_month: number;
  /** 打卡天数变化（本月 - 上月） */
  delta: number;
  /** 本月课耗（null = 无课耗记录） */
  lesson_this_month: number | null;
  /** 本月推荐注册数 */
  referral_registrations: number;
  /** 本月推荐付费数 */
  referral_payments: number;
  /** 总续费订单数 */
  total_renewals: number;
  /** CC 末次联系距今天数（null = 无记录） */
  cc_last_call_days_ago: number | null;
  /** 次卡距到期天数（null = 无记录） */
  card_days_remaining: number | null;
  /** 今日是否已打卡（0/1） */
  today_checked_in: number;
  /** 学员标签列表 */
  tags: string[];
}

// ── 标签汇总 ──────────────────────────────────────────────────────────────────

/** 各标签人数汇总 */
export type TagsSummary = Record<string, number>;

// ── 完整响应 ──────────────────────────────────────────────────────────────────

/** /api/checkin/student-analysis 完整响应类型 */
export interface StudentAnalysisResponse {
  /** 0-6 次精确频次分布 */
  frequency_distribution: FrequencyItem[];
  /** 4 段频段分布 */
  frequency_bands: FrequencyBand[];
  /** 本月 vs 上月对比 */
  month_comparison: MonthComparison;
  /** 打卡×转化漏斗交叉 */
  conversion_funnel: ConversionFunnelItem[];
  /** 围场打卡分布 */
  by_enclosure: EnclosureDistItem[];
  /** 学员标签汇总 */
  tags_summary: TagsSummary;
  /** 课耗×打卡四象限 */
  lesson_checkin_cross: LessonCheckinCross;
  /** CC 触达×打卡响应 */
  contact_checkin_response: ContactCheckinResponse;
  /** 续费×打卡关联 */
  renewal_checkin_correlation: RenewalCorrelation;
  /** Top 学员列表（按本月打卡降序） */
  top_students: StudentRow[];
  /** 进步榜（delta > 0，按 delta 降序） */
  improvement_ranking: StudentRow[];
}
