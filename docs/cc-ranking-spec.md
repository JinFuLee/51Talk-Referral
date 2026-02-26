# CC 人员排名算法规范（三类 18 维）

## 过程指标（25%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 外呼数 | 4% | outreach.by_cc |
| 接通数 | 4% | outreach.by_cc |
| 有效接通(>=120s) | 5% | outreach.by_cc |
| 付费前跟进 | 3% | trial_followup.pre_class |
| 预约课前跟进 | 3% | trial_followup.pre_class |
| 预约课后跟进 | 3% | trial_followup.post_class |
| 付费后跟进 | 3% | paid_followup |

## 结果指标（60%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 注册数 | 12% | leads.by_cc |
| leads 数 | 8% | leads.by_cc |
| 转介绍用户数 | 8% | leads.by_cc |
| 客单价(USD) | 7% | orders.by_cc |
| 付费单量 | 12% | orders.by_cc |
| 转介绍业绩(USD) | 9% | orders.by_cc（CC新单转介绍）|
| 业绩占比 | 4% | 个人/团队总额 |

## 效率指标（15%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 注册→付费转化率 | 5% | paid/registered |
| 打卡率 | 4% | kpi.by_cc |
| 参与率 | 3% | kpi.by_cc |
| 带新系数 | 3% | kpi.by_cc |

## 算法
- 每个指标在所有 CC 中 min-max 归一化到 [0,1]
- 数据源缺失时，权重等比分摊到同类其他维度
- `composite_score = process × 0.25 + result × 0.60 + efficiency × 0.15`
- 输出: `{cc_name, rank, composite_score, process_score, result_score, efficiency_score, detail}`

---

# SS/LP 人员排名算法规范（四类 4 维）

## 过程指标（25%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 触达率 (contact_rate) | 12.5% | outreach.by_cc (F5) |
| 打卡率 (checkin_rate) | 12.5% | kpi.north_star_24h (D1) / kpi.checkin_rate_monthly (D5) |

## 结果指标（30%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 转介绍用户数 (leads) | 30% | leads.personal (A4) |

## 质量指标（25%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| leads→CC转化率 | 25% | leads.personal (A4) paid/leads |

## 贡献指标（20%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 业绩贡献占比 (paid_share) | 20% | 个人 CC转化付费数 / 同角色团队总 CC转化付费数 |

## 算法
- 每个指标在同角色（SS 或 LP）中 min-max 归一化到 [0,1]
- SS 和 LP 分别归一化排名，不混合
- 数据源缺失时，权重等比分摊到同类其他维度
- `composite_score = process × 0.25 + result × 0.30 + quality × 0.25 + contribution × 0.20`
- 输出: `{name, rank, composite_score, process_score, result_score, quality_score, contribution_score, paid_share, detail}`

## 与 CC 排名的区别
| 维度 | CC | SS/LP |
|------|-----|-------|
| 过程 | 7 维（外呼/接通/跟进等）| 2 维（触达率/打卡率）|
| 结果 | 7 维（注册/付费/金额等）| 1 维（leads 数）|
| 效率 | 4 维（转化率/打卡/参与/带新）| — |
| 质量 | — | 1 维（leads→CC 转化率）|
| 贡献 | 业绩占比在结果类 | 独立类别（paid_share）|
| 总权重 | process 25% + result 60% + efficiency 15% | process 25% + result 30% + quality 25% + contribution 20% |
