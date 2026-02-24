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
