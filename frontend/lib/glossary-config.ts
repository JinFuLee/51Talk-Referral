export interface GlossaryTerm {
  term: string;
  definition: string;
  formula?: string;
}

// Keep backward-compat alias
export type GlossaryItem = GlossaryTerm;

export const glossaryConfig: Record<string, GlossaryTerm[]> = {
  ops_dashboard: [
    { term: 'CC', definition: '前端销售 (Customer Consultant)' },
    { term: 'SS', definition: '后端销售（数据别名 EA）' },
    { term: 'LP', definition: '后端服务（数据别名 CM）' },
    { term: '注册数', definition: '当月新注册用户总数' },
    { term: '付费数', definition: '当月完成首次付费的用户数' },
    { term: 'Revenue', definition: '转介绍业绩（CC新单转介绍渠道订单金额，单位 USD）' },
    { term: 'Leads', definition: '转介绍注册人数 = 转介绍用户数 = 转介绍leads数（三者等价）' },
    { term: '时间进度', definition: '加权工作日进度，周六日权重 1.4x，周三权重 0.0' },
  ],

  ops_ranking: [
    { term: 'CC', definition: '前端销售 (Customer Consultant)' },
    { term: 'SS', definition: '后端销售（数据别名 EA）' },
    { term: 'LP', definition: '后端服务（数据别名 CM）' },
    {
      term: '综合得分',
      definition: '过程(25%) + 结果(60%) + 效率(15%) 加权分',
      formula: 'composite = process×0.25 + result×0.60 + efficiency×0.15',
    },
    {
      term: '触达率',
      definition: '有效通话(≥120s)学员 / 有效学员',
      formula: '触达率 = 有效通话学员数 / 有效学员总数',
    },
    { term: '打卡率', definition: '转码且分享的学员 / 有效学员' },
    { term: '参与率', definition: '带来≥1注册的学员 / 有效学员' },
    { term: '带新系数', definition: 'B注册数 / 带来注册的A学员数' },
  ],

  ops_channel_mom: [
    { term: 'MoM', definition: '月环比 (Month-over-Month)，本月与上月对比' },
    { term: '渠道', definition: '用户来源渠道，如转介绍、市场等' },
    { term: '转介绍', definition: '由现有学员推荐带来的新用户' },
    { term: 'WoW', definition: '周环比 (Week-over-Week)，本周与上周对比' },
    { term: 'YoY', definition: '同比 (Year-over-Year)，与去年同期对比' },
  ],

  ops_kpi_north_star: [
    { term: '北极星指标', definition: '24H 打卡率 — 衡量学员活跃度和转介绍参与的核心指标' },
    { term: '24H 打卡率', definition: '24小时内完成打卡并分享的学员比例' },
    { term: '带新系数', definition: 'B注册数 / 带来注册的A学员数' },
    { term: '参与率', definition: '带来≥1注册的学员 / 有效学员' },
    {
      term: '带货比',
      definition: '推荐注册数 / 有效学员',
      formula: '带货比 = 推荐注册数 / 有效学员数',
    },
    { term: 'CC-A/CC-B', definition: 'CC团队分组（如THCC-A、THCC-B），非个人代号' },
  ],

  ops_funnel_detail: [
    { term: '漏斗', definition: '用户从有效学员→触达→参与→注册→付费的转化路径' },
    { term: '窄口', definition: 'CC/SS/LP员工链接绑定UserB（高质量转介绍）' },
    { term: '宽口', definition: 'UserA学员链接绑定UserB（低质量转介绍）' },
    { term: '有效学员', definition: '已付费用户（次卡>0且在有效期内）' },
    { term: '触达率', definition: '有效通话(≥120s)学员 / 有效学员' },
    { term: '参与率', definition: '带来≥1注册的学员 / 有效学员' },
    { term: '转化率', definition: '注册→付费转化率' },
  ],

  ops_retention_rank: [
    { term: '留存贡献排名', definition: '各CC/团队对学员留存的贡献排名' },
    { term: '有效学员', definition: '已付费用户（次卡>0且在有效期内）' },
    { term: '围场', definition: '用户付费当日起算天数分段（M0~M12+ 共14段，每段30天）' },
    { term: '触达率', definition: '有效通话(≥120s)学员 / 有效学员' },
  ],

  ops_outreach_heatmap: [
    { term: '外呼热力图', definition: '展示各CC每日外呼量的热力分布' },
    { term: '有效接通', definition: '通话时长≥120秒的通话' },
    { term: '接通数', definition: '接通的外呼次数（不论时长）' },
    { term: '外呼数', definition: '拨出的外呼总次数' },
    {
      term: '有效率',
      definition: '有效接通数 / 外呼数',
      formula: '有效率 = 有效接通(≥120s) / 外呼总次数',
    },
  ],

  ops_followup_alert: [
    { term: '零跟进预警', definition: '当月未被CC有效跟进（有效通话=0）的付费学员' },
    { term: '围场', definition: '用户付费当日起算天数分段（M0~M12+ 共14段，每段30天）' },
    { term: '课前跟进', definition: '体验课开始前的跟进电话' },
    { term: '课后跟进', definition: '体验课结束后的跟进电话' },
    { term: '有效接通', definition: '通话时长≥120秒' },
    { term: '付费跟进覆盖率', definition: '当月被有效跟进的付费学员 / 总付费学员' },
  ],

  ops_productivity_history: [
    { term: '人效', definition: '每位在岗销售人员产生的平均业绩（USD/人）' },
    { term: 'CC人效', definition: 'CC团队总转介绍业绩 / CC在岗人数' },
    { term: 'SS人效', definition: 'SS团队总业绩 / SS在岗人数' },
    { term: '日趋势', definition: '每日人效走势，反映团队效率变化' },
  ],

  biz_team: [
    { term: 'CC', definition: '前端销售 (Customer Consultant)' },
    { term: 'SS', definition: '后端销售（数据别名 EA）' },
    { term: 'LP', definition: '后端服务（数据别名 CM）' },
    { term: '人效', definition: '每位在岗销售人员产生的平均业绩（USD/人）' },
    { term: '24H 打卡达标率', definition: '达到24H打卡目标的CC占比' },
    { term: '付费跟进覆盖率', definition: '当月被有效跟进的付费学员 / 总付费学员' },
  ],

  biz_insights: [
    { term: 'SCQA', definition: '分析框架：背景(S) → 冲突(C) → 疑问(Q) → 答案(A)' },
    { term: '5-Why', definition: '根因分析法：从结果指标异常出发，逐层追问5次找到根因' },
    { term: '金字塔原则', definition: '结论先行 → MECE拆解 → 数据论据 → 行动方案' },
    { term: '阶段评估', definition: '判断当前转介绍运营所处阶段（基础启动/科学运营/系统思维）' },
    {
      term: 'MECE',
      definition: '相互独立、完全穷尽 (Mutually Exclusive, Collectively Exhaustive)',
    },
  ],

  biz_impact: [
    { term: '影响链', definition: '效率指标缺口 → 用户数损失 → 收入损失的因果链' },
    { term: '打卡率 gap', definition: '实际打卡率与目标打卡率的差值' },
    { term: 'What-if 模拟', definition: '模拟提升某指标X%后预期增加的收入$Y' },
    {
      term: '损失量化',
      definition: '将效率缺口转化为可量化的美元收入损失',
      formula: '损失 = gap × 转化链各环节转化率 × 客单价',
    },
    { term: '顶级杠杆', definition: '所有效率指标中，提升单位带来收入提升最大的指标' },
  ],

  biz_enclosure_health: [
    { term: '围场', definition: '用户付费当日起算天数分段（M0~M12+ 共14段，每段30天）' },
    { term: '围场健康度', definition: '各围场段学员触达率、参与率的综合评估' },
    { term: '有效学员', definition: '已付费用户（次卡>0且在有效期内）' },
    { term: '触达率', definition: '有效通话(≥120s)学员 / 有效学员' },
    { term: '流失风险', definition: '长期未被触达（围场90天+）的学员' },
  ],

  biz_leads_detail: [
    { term: '围场×渠道矩阵', definition: '以围场分段为行、渠道为列，展示leads分布' },
    { term: '围场', definition: '用户付费当日起算天数分段（M0~M12+ 共14段，每段30天）' },
    { term: '转介绍用户', definition: '转介绍注册人数 = 转介绍leads数（等价）' },
    { term: '时间间隔', definition: '从付费到完成转介绍注册的间隔天数分布' },
    { term: '窄口', definition: '员工链接绑定（高质量转介绍）' },
    { term: '宽口', definition: '学员链接绑定（低质量转介绍）' },
  ],

  biz_cohort_students: [
    { term: '留存曲线', definition: '按月龄展示队列中仍然有效（付费）的学员比例' },
    {
      term: '带新率',
      definition: '带来≥1个B注册的学员 / 总学员',
      formula: '带新率 = 带新学员数 / 总学员数',
    },
    { term: '有效学员', definition: '次卡>0且在有效期内的已付费用户' },
    { term: '触达学员', definition: '当月被有效通话(≥120s)的学员' },
    { term: 'CC带新排名', definition: '各CC名下学员的带新总数和带新率排名' },
  ],

  biz_cohort_decay: [
    { term: '衰减曲线', definition: '同批次（Cohort）学员的指标随月龄增长的变化趋势' },
    { term: '带新系数黄金窗口', definition: '带新系数最高的月龄区间（通常是付费后第1-3个月）' },
    { term: '触达率', definition: '有效通话(≥120s)学员 / 有效学员' },
    { term: '参与率', definition: '带来≥1注册的学员 / 有效学员' },
    { term: '打卡率', definition: '转码且分享的学员 / 有效学员' },
    { term: '带新系数', definition: 'B注册数 / 带来注册的A学员数' },
    { term: '带货比', definition: '推荐注册数 / 有效学员' },
  ],

  // Shared fallback
  general: [
    { term: 'CC', definition: '前端销售 (Customer Consultant)' },
    { term: 'SS', definition: '后端销售（数据别名 EA）' },
    { term: 'LP', definition: '后端服务（数据别名 CM）' },
    { term: '有效学员', definition: '已付费用户（次卡>0且在有效期内）' },
    { term: '转介绍', definition: '由现有学员推荐带来的新用户' },
    { term: '触达率', definition: '有效通话(≥120s)学员 / 有效学员' },
  ],
};
