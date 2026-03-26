## CC 排名：三类 18 维

### CC 过程指标（25%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 外呼数 | 4% | outreach.by_cc |
| 接通数 | 4% | outreach.by_cc |
| 有效接通(>=120s) | 5% | outreach.by_cc |
| 付费前跟进 | 3% | trial_followup.pre_class |
| 预约课前跟进 | 3% | trial_followup.pre_class |
| 预约课后跟进 | 3% | trial_followup.post_class |
| 付费后跟进 | 3% | paid_followup |

### CC 结果指标（60%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 注册数 | 12% | leads.by_cc |
| leads 数 | 8% | leads.by_cc |
| 转介绍用户数 | 8% | leads.by_cc |
| 客单价(USD) | 7% | orders.by_cc |
| 付费单量 | 12% | orders.by_cc |
| 转介绍业绩(USD) | 9% | orders.by_cc（CC新单转介绍）|
| 业绩占比 | 4% | 个人/团队总额 |

### CC 效率指标（15%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 注册→付费转化率 | 5% | paid/registered |
| 打卡率 | 4% | kpi.by_cc |
| 参与率 | 3% | kpi.by_cc |
| 带新系数 | 3% | kpi.by_cc |

### CC 算法规则
- 每个指标在所有 CC 中 min-max 归一化到 [0,1]；相同值时归一化为 0.5（中位值）
- 数据源缺失时，权重等比分摊到同类其他维度（`_redistribute` 机制）
- 类内权重已归一化（各类内维度权重之和 = 1.0），类别得分范围 [0,1]
- `composite_score = process×0.25 + result×0.60 + efficiency×0.15`，满分 = 1.0
- 表中"权重"列为业务意图权重（占 composite_score 的百分比），代码中类内权重 = 业务权重 / 类别权重
- 输出字段: `{cc_name, rank, composite_score, process_score, result_score, efficiency_score, detail}`
- `detail` 中每个维度包含 `{raw: 原始值, norm: 归一化后的值}`

## SS/LP 排名：四类 5 维

### SS/LP 过程指标（25%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 触达率 (contact_rate) | 12.5% | outreach.by_cc (F5) |
| 打卡率 (checkin_rate) | 12.5% | kpi.north_star_24h (D1) / kpi.checkin_rate_monthly (D5) |

### SS/LP 结果指标（30%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 转介绍用户数 (leads) | 30% | leads.personal (A4) |

### SS/LP 质量指标（25%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| leads→CC转化率 | 25% | leads.personal (A4) paid/leads |

### SS/LP 贡献指标（20%）
| 指标 | 权重 | 数据源 |
|------|------|--------|
| 业绩贡献占比 (paid_share) | 20% | 个人 CC转化付费数 / 同角色团队总 CC转化付费数 |

### SS/LP 算法规则
- 每个指标在同角色（SS 或 LP）中 min-max 归一化到 [0,1]；SS 和 LP 分别归一化，不混合
- 数据源缺失时，权重等比分摊到同类其他维度（`_redistribute_role` 机制）
- `composite_score = process×0.25 + result×0.30 + quality×0.25 + contribution×0.20`，满分 = 1.0
- `paid_share` = 个人 CC 转化付费数 / 同角色（SS 或 LP）团队总 CC 转化付费数
- `leads_to_cc_rate` = `conversion_rate`（A4 字段，或 paid/leads 计算，与 CC 转化率同口径）
- 输出字段: `{name, rank, composite_score, process_score, result_score, quality_score, contribution_score, paid_share, detail}`

## CC vs SS/LP 排名对比
| 维度 | CC（3类 18维）| SS/LP（4类 5维）|
|------|--------------|----------------|
| 过程 | 7 维（外呼/接通/有效接通/付费前跟进/课前跟进/课后跟进/付费后跟进）| 2 维（触达率/打卡率）|
| 结果 | 7 维（注册数/leads数/转介绍用户数/客单价/付费单量/转介绍业绩/业绩占比）| 1 维（leads 数）|
| 效率 | 4 维（注册→付费转化率/打卡率/参与率/带新系数）| — |
| 质量 | — | 1 维（leads→CC 转化率）|
| 贡献 | 业绩占比归入结果类 | 独立类别（paid_share）|
| 总维度 | 18 维（contact_rate 采集但不计入评分权重）| 5 维 |
| 总权重 | process×0.25 + result×0.60 + efficiency×0.15 | process×0.25 + result×0.30 + quality×0.25 + contribution×0.20 |

> **注意（contact_rate）**: CC 排名中 `contact_rate`（有效接通率）在原始数据采集阶段被记录到
> `raw_data` 并保存在 `detail` 输出字段中，但不参与任何 DIMS 权重计算，故不计入 18 维评分体系。
> 若后续需要纳入效率类，需在 `EFFICIENCY_DIMS` 中显式添加并重新归一化权重。
