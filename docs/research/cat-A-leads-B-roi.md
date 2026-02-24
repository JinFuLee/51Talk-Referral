# A 类 Leads (4 源) + B 类 ROI (1 源) — 面板价值调研报告

> 调研者: mk-leads-roi-sonnet | 日期: 2026-02-21

---

## 概述

A 类 Leads 4 个数据源（A1-A4）+ B 类 ROI 1 个数据源（B1）覆盖转介绍漏斗全链条数据，是运营分析系统最核心的数据层之一。当前利用率约 45%，存在大量高价值洼地。

---

## 源 A1: BI-Leads_宽口径leads达成_D-1（团队 Leads 达成）

- **频率**: D-1（每日更新）
- **字段清单**:
  | 字段 | 类型 | 说明 |
  |------|------|------|
  | 海外大区 | string | 地区标识 |
  | 团队 | string | CC/SS/LP（已别名标准化） |
  | 小组 | string | 二级分组 |
  | 总计.注册付费率 | float | 全口径注册付费率 |
  | 总计.注册 | int | 全口径注册人数 |
  | 总计.预约 | int | 全口径预约人数 |
  | 总计.出席 | int | 全口径出席人数 |
  | 总计.付费 | int | 全口径付费人数 |
  | CC窄口径.{注册付费率,注册,预约,出席,付费} | 各类型 | CC 渠道独立数据 |
  | SS窄口径.{5指标} | 各类型 | SS/EA 渠道独立数据 |
  | LP窄口径.{5指标} | 各类型 | LP/CM 渠道独立数据 |
  | 宽口径.{5指标} | 各类型 | 宽口径数据 |

- **当前利用**:
  - `_analyze_funnel()` — 从 `by_channel` 读各口径 注册/预约/出席/付费，构建4口径漏斗
  - `_analyze_channel_comparison()` — 计算各口径注册/付费比、效能指数
  - `GET /api/analysis/funnel` → 适配为 FunnelData
  - `GET /api/analysis/channel-comparison` → 适配为 ChannelComparisonData
  - 前端: `FunnelChart`、`ChannelBarChart`、`ChannelComparisonTable` (ops/funnel 页)

- **价值洼地**:
  - `注册付费率` 字段（每口径均有）当前**未被 funnel 分析消费**，只有 channel_comparison 用到 paid/reg 算出来的比值
  - `预约`、`出席` 中间段数据当前仅在 funnel 展示，**没有历史趋势存储**
  - `by_team` 结构（每行含团队+小组分解）**完全未被利用**，可做团队级漏斗对比
  - 目标与实际的对比（`倒子目标` 字段）仅在 channel_comparison 用了 CC 口径，**SS/LP 子目标未消费**

- **可构建图表/交互**:
  1. **团队漏斗对比图** — GroupedBarChart（Recharts BarChart grouped） — 数据: `by_team[*]` 各小组的注册/预约/出席/付费 — hover tooltip 显示各阶段绝对值+环比 — 解决: 哪个团队漏斗损耗最大
  2. **口径转化率雷达图** — RadarChart — 数据: 4 口径 × 注册付费率/预约率/出席率 三维 — hover 显示该口径各指标与全局均值对比 — 解决: 哪个口径整体质量最高
  3. **预约-出席流失追踪** — SankeyChart（用 Recharts 自定义或 d3-sankey） — 数据: 注册→预约→出席→付费各节点数量，计算流失量 — click 节点钻取到该阶段 CC 明细 — 解决: 漏斗哪个阶段流失最严重
  4. **团队 vs 目标进度条** — ProgressTable (已有组件) — 数据: `by_team` 付费 vs 倒子目标 — hover 显示 gap 和达标所需日均 — 解决: 哪个团队落后于目标

- **跨源联动**:
  - join key: `团队/小组` → A4 (个人 leads) 下钻到人员级
  - `注册` → A3 (leads 明细) 匹配 `末次分配CC组名称` 做学员级分析
  - `付费` → E3 (订单明细) 关联验证转化数据一致性
  - `time_progress` (系统) → 计算双差额体系（当前 channel_comparison 只用了时间进度差）

- **前端 spec**:
  - 组件: `TeamFunnelComparison` (props: `{ data: FunnelByTeam[]; metric: '注册'|'付费'|'预约'|'出席' }`)
  - 新增组件: `FunnelSankeyDiagram` (props: `{ stages: FunnelStage[]; channelKey: string }`)
  - 建议路由: `/app/ops/funnel` 页（当前页已有 FunnelChart，扩展 Tab 加团队对比）

- **后端 spec**:
  - 扩展 `GET /api/analysis/funnel` 返回值加 `by_team` 字段
  - 新增 `GET /api/analysis/funnel/team` — 返回 by_team 分组漏斗数据
  - 请求参数: `channel` (cc_narrow/ss_narrow/lp_narrow/wide/total，默认 total)
  - 返回 JSON: `{ by_team: [ { team, 注册, 预约, 出席, 付费, 注册付费率 }[] ] }`

---

## 源 A2: BI-Leads_全口径转介绍类型-当月效率_D-1（围场 × 渠道效率）

- **频率**: D-1（每日更新）
- **字段清单**:
  | 字段 | 类型 | 说明 |
  |------|------|------|
  | 海外大区 | string | 地区 |
  | 围场 | string | 0-30/31-60/61-90/91-180/181+ |
  | 总计.带货比 | float | 全口径带货比 |
  | 总计.参与率 | float | 全口径参与率 |
  | 总计.围场转率 | float | 围场转化率 |
  | 总计.A学员数 | int | 有效付费学员数 |
  | 总计.推荐注册 | int | 推荐带来注册数 |
  | 总计.推荐付费 | int | 推荐带来付费数 |
  | CC窄口径.{带货比,参与率,围场转率,A学员数,推荐注册,推荐付费} | 各类型 | CC 渠道围场分段数据 |
  | LP窄口径.{6字段} | 各类型 | LP/CM 渠道数据 |
  | SS窄口径.{6字段} | 各类型 | SS/EA 渠道数据 |
  | 宽口径.{6字段} | 各类型 | 宽口径数据 |

- **当前利用**:
  - `_analyze_enclosure_cross()` — 取 `by_enclosure` 计算各围场 ROI 指数（带货比×参与率）
  - `GET /api/analysis/enclosure` → enclosure_cross 联动分析的一个数据源
  - 前端: `EnclosureHeatmap`（biz/enclosure 页）

- **价值洼地**:
  - `推荐注册`、`推荐付费` 字段按围场分段存在，当前**仅取参与率和带货比**，推荐链条数量完全未展示
  - `围场转率` 字段当前**未被消费**（enclosure_cross 用 conversion_rate 来自 D2，不是 A2）
  - **CC vs LP vs SS 各口径的围场效率对比**未展示（只展示总计）
  - `A学员数` per围场 按口径分解未利用——可以看 CC 覆盖了哪个围场多少学员

- **可构建图表/交互**:
  1. **围场 × 渠道热力矩阵** — Heatmap（Recharts 自定义或 EnclosureHeatmap 扩展） — 数据: 5围场×4口径 的 `参与率` 矩阵 — hover tooltip 显示该格子的 A学员数+推荐注册+推荐付费 — click 下钻到该围场该渠道的学员列表（跨 A3） — 解决: 哪个围场哪个渠道效率最高
  2. **围场带货比趋势** — LineChart — 数据: 5围场的带货比按时间变化（需历史快照配合） — hover 显示带货比值+同期A学员数 — 解决: 老学员池衰减速度
  3. **围场推荐漏斗** — 分组 BarChart（Recharts BarChart） — 数据: 5围场的 A学员数→推荐注册→推荐付费 三段 — hover 显示各段转化率（推荐注册/A学员数，推荐付费/推荐注册） — click 切换 CC/LP/SS/宽 口径 — 解决: 哪个围场的推荐质量最好（注册到付费转化）
  4. **口径效率雷达图** — RadarChart — 数据: CC/LP/SS/宽 各口径的 带货比/参与率/围场转率 三维 — slider 控制选择围场范围（0-30 or 31-60 or...） — 解决: 不同资历学员哪个渠道跟进效率最优

- **跨源联动**:
  - join key: `围场` → D2/D3/D4 (KPI 围场数据) 补充 active_students/conversion_rate
  - join key: `围场` → F8 (围场月度跟进) 补充跟进覆盖率
  - `A学员数` per围场 → B1 成本模型，计算每个围场的单位获客成本

- **前端 spec**:
  - 新增组件: `EnclosureChannelMatrix` (props: `{ data: EnclosureChannelData[]; metric: 'participation_rate'|'conversion_ratio'|'leads_ratio' }`)
  - 新增组件: `EnclosureConversionFunnel` (props: `{ data: EnclosureConversionData[]; channelFilter: string }`)
  - 建议路由: `/app/biz/enclosure` 页（加 Tab: 围场×渠道 矩阵）

- **后端 spec**:
  - 新增 `GET /api/analysis/enclosure/channel-matrix`
  - 返回: `{ by_enclosure: [ { segment, cc_narrow: {带货比, 参与率, 推荐注册, 推荐付费}, lp_narrow, ss_narrow, wide }[] ] }`
  - 扩展 enclosure_cross 输出加 `channel_breakdown` 字段

---

## 源 A3: BI-Leads_全口径leads明细表_D-1（学员级 Leads 明细）

- **频率**: D-1（每日更新）
- **字段清单**:
  | 字段 | 类型 | 说明 |
  |------|------|------|
  | 学员ID | string | 唯一标识，跨源 join key |
  | 渠道类型 | string | 标准化后的渠道名 |
  | 注册日期(day) | date | 注册时间 |
  | 首次体验课约课日期(day) | date | 约课时间 |
  | 首次体验课出席日期(day) | date | 出席时间 |
  | 首次1v1大单付费日期(day) | date | 付费时间 |
  | 首次1v1大单付费金额 | float (USD) | 付费金额 |
  | 当月是否预约 | bool-like | 当月预约状态 |
  | 是否预约过 | bool-like | 历史预约状态 |
  | 是否转介绍 | bool-like | 是否转介绍来源 |
  | 当月是否出席 | bool-like | 当月出席状态 |
  | 转介绍类型 | string | 转介绍类别 |
  | 推荐人学员ID | string | 推荐人ID，可追踪推荐关系链 |
  | 首次分配CC员工姓名 | string | 首次CC |
  | 首次分配CC员工ID | string | CC ID |
  | 首次分配CC组名称 | string | CC团队 |
  | 末次分配CC员工姓名 | string | 末次CC（当前负责） |
  | 末次分配CC员工ID | string | |
  | 末次分配CC组名称 | string | |
  | CC总流转次数 | int | CC 更换次数 |

- **当前利用**:
  - `_analyze_student_journey()` — 用于学员全旅程跨源联动（A3×E3×F6×F11），统计已注册/已预约/已出席/已付费学员数
  - `_analyze_cc_ranking()` — `by_cc` 聚合（leads/预约/出席/付费 per CC）作为 CC 排名的注册维度
  - `GET /api/analysis/student-journey` — 返回旅程各阶段漏斗
  - 前端: `StudentJourneyFlow`（ops/funnel 页）

- **价值洼地**:
  - `推荐人学员ID` 字段当前**完全未被利用**，可构建 **A→B 推荐关系网络图**
  - `CC总流转次数` 当前**未被消费**，高流转次数=学员体验差/CC 不稳定的信号
  - `转介绍类型` 字段未聚合分析（不同类型的转化率差异）
  - `首次1v1大单付费金额` 当前仅在 by_cc 统计付费计数，**未做金额分布分析**
  - 注册→付费的**时间间隔**（注册日期 - 付费日期）当前未计算，是预测付费时机的关键指标
  - `首次vs末次CC` 差异（CC 总流转次数 > 0）的学员付费率 vs 未流转学员的付费率对比

- **可构建图表/交互**:
  1. **推荐关系网络图** — NetworkGraph（需引入 react-force-graph 或 D3）— 数据: `{学员ID, 推荐人学员ID}` 构建有向图 — hover 节点显示该学员 注册/付费状态+CC+金额 — click 展开推荐链（A→B→C 三代） — 解决: 谁是超级推荐者（带来最多付费的 A 学员）
  2. **CC 流转影响分析** — ScatterChart（Recharts ScatterChart） — X轴: CC总流转次数，Y轴: 是否付费(0/1) — 按渠道类型着色 — hover 显示学员ID+注册日期+最终结果 — 解决: CC 频繁更换是否显著降低付费率
  3. **学员旅程时间漏斗** — 堆叠 BarChart — 数据: 按注册周分组，统计注册→预约→出席→付费各阶段的中位天数 — hover 显示该时间段的漏斗转化率 — 解决: 各阶段的典型转化时长，优化跟进时机
  4. **付费金额分布** — HistogramChart（Recharts BarChart + 手动分箱） — 数据: `首次1v1大单付费金额` — 按 CC 着色分层 — hover 显示该金额区间学员数+占比 — 解决: 客单价分布，识别低价单/高价单集中在哪些 CC

- **跨源联动**:
  - join key: `学员ID` → E3 (订单明细) 验证付费数据一致性
  - join key: `学员ID` → F6 (体验跟进) 检验外呼覆盖对付费的影响
  - join key: `学员ID` → F11 (课前外呼) 课前外呼覆盖 vs 出席率关系
  - join key: `末次分配CC员工姓名` → A4 (个人 leads) 与团队级数据对齐
  - join key: `推荐人学员ID` 自关联 → 推荐链深度分析

- **前端 spec**:
  - 新增组件: `LeadsDetailTable` (props: `{ records: LeadsRecord[]; filterCC?: string; filterChannel?: string }`)
  - 新增组件: `ReferralNetworkGraph` (props: `{ records: LeadsRecord[]; maxDepth?: number }`)
  - 新增组件: `ConversionTimeAnalysis` (props: `{ records: LeadsRecord[] }`)
  - 建议路由: `/app/ops/funnel` 加 Tab "学员明细" 或新建 `/app/ops/leads-detail`

- **后端 spec**:
  - 新增 `GET /api/analysis/leads-detail` — 分页返回明细记录
  - 请求参数: `cc_name?`, `channel?`, `paid_only?` (bool), `page`, `page_size`
  - 返回: `{ records: LeadsRecord[]; total: int; by_cc: dict; referral_network: {nodes, edges}? }`
  - 新增 `GET /api/analysis/referral-network` — 专门返回推荐关系图数据

---

## 源 A4: BI-Leads_宽口径leads达成-个人_D-1（个人 Leads 达成）

- **频率**: D-1（每日更新）
- **字段清单**:
  | 字段 | 类型 | 说明 |
  |------|------|------|
  | name | string | 转介绍销售名称（SS/LP 人员） |
  | region | string | 海外大区 |
  | team | string | 团队（已别名标准化） |
  | group | string | 小组 |
  | leads | float | 个人 leads 数 |
  | reserve | float | 个人预约数 |
  | showup | float | 个人出席数 |
  | paid | float | 个人付费数 |
  | conversion_rate | float | 注册付费率 |

- **当前利用**:
  - `_analyze_cc_ranking()` — 用于 CC 综合排名（注册数/leads数/转化率维度）
  - `_analyze_ss_lp_ranking()` — SS/LP 排名数据源（leads/paid/conversion_rate）
  - `_analyze_student_journey()` — 个人漏斗统计补充
  - `GET /api/analysis/cc-ranking`、`ss-ranking`、`lp-ranking`
  - 前端: `RankingTable` (ranking 页、ops/ranking 页)

- **价值洼地**:
  - `reserve`（预约数）字段当前**在排名中未使用**（排名只用 leads/paid/conversion_rate）
  - `showup`（出席数）字段在 SS/LP 排名中**完全未消费**
  - `group`（小组）字段可做**组内排名**，但当前只做全局排名
  - **未做 CC vs SS vs LP 跨角色横向对比**（各角色效率差异）
  - 个人 conversion_rate 的**分布直方图**未展示（哪些人集中在 0-20%，哪些超过 50%）

- **可构建图表/交互**:
  1. **个人漏斗气泡图** — ScatterChart — X轴: leads数，Y轴: 付费数，气泡大小: 转化率 — 按团队着色 — hover 显示姓名/team/reserve/showup — click 钻取到该人明细（A3 学员列表） — 解决: 谁是高 leads 高转化的顶尖销售
  2. **小组内排名对比** — HorizontalBarChart（Recharts BarChart 水平） — 数据: 按 group 分组，组内人员按付费数排序 — 支持 group 下拉筛选 — hover 显示各指标完整数据 — 解决: 各小组内部的销售差异度
  3. **转化率分布直方图** — BarChart + 分箱 — 数据: conversion_rate 分桶（0-10%/11-20%/.../>50%）— hover 显示该区间人数+代表人物 — 解决: 团队整体转化率水平是否健康
  4. **预约→出席漏斗率矩阵** — 热力图或 DataTable — 数据: 每人的 reserve/leads (预约率) vs showup/reserve (出席率) — hover 显示该人在两个维度的排名位置 — 解决: 谁擅长约课但出席率差（可能约课质量问题）

- **跨源联动**:
  - join key: `name` → A3 `末次分配CC员工姓名` → 下钻到学员明细
  - join key: `name` → CC 360° 画像（D1打卡率 × F5外呼 × A4）
  - join key: `team/group` → A1 by_team 校验团队数据一致性

- **前端 spec**:
  - 新增组件: `PersonalFunnelBubble` (props: `{ records: PersonalLeadsRecord[]; groupFilter?: string }`)
  - 扩展 `RankingTable` — 加 `reserve` (预约数) 和 `showup` (出席数) 列，支持按这两个字段排序
  - 建议路由: `/app/ops/ranking` 页（已有，扩展列即可）

- **后端 spec**:
  - 扩展 `GET /api/analysis/cc-ranking` 返回值加 `reserve`、`showup` 字段
  - 新增 `GET /api/analysis/ranking/group-breakdown` — 按 group 分组返回组内排名
  - 返回: `{ by_group: { [group: string]: RankingItem[] } }`

---

## 源 B1: 中台_转介绍ROI测算数据模型_M-1（ROI 测算模型）

- **频率**: M-1（每月更新）
- **字段清单（4 个 Sheet）**:

  **Sheet 1: ROI汇总**
  | 字段 | 类型 | 说明 |
  |------|------|------|
  | 产品类型（次卡/现金） | string | 奖励产品类别 |
  | 地区 | string | 地区 |
  | 目标营收 | float (USD) | 目标营收 |
  | 目标ROI | float | 目标 ROI |
  | 实际营收 | float (USD) | 实际营收 |
  | 实际成本 | float (USD) | 实际成本 |
  | 实际ROI | float | 实际 ROI |
  | _total.实际营收 | float | 汇总营收 |
  | _total.实际成本 | float | 汇总成本 |
  | _total.实际ROI | float | 汇总 ROI |

  **Sheet 2: 转介绍成本list**
  | 字段 | 类型 | 说明 |
  |------|------|------|
  | 奖励类型 | string | 奖励大类 |
  | 内外场激励 | string | 内场/外场 |
  | 激励详情 | string | 具体激励内容描述 |
  | 推荐动作 | string | 触发条件 |
  | 推荐规则描述 | string | 规则说明 |
  | 赠送数 | int | 数量 |
  | 成本单价USD | float | 单价 |
  | 成本USD | float | 总成本 |

  **Sheet 3: 转介绍详细规则**
  | 字段 | 类型 | 说明 |
  |------|------|------|
  | 推荐分类 | string | 推荐类别 |
  | 人数分段列 × N | float | 各分段下的奖励数值 |

  **Sheet 4: 地区**
  | 字段 | 类型 | 说明 |
  |------|------|------|
  | 地区值 | string | 枚举：各大区名称 |

- **当前利用**:
  - `_analyze_cohort_roi()` — 取 `summary._total.实际成本` / `实际营收` / `实际ROI`，结合 Cohort 衰减计算月度 ROI
  - `GET /api/analysis/roi` → 适配为 ROIData（total_cost/total_revenue/roi_ratio）
  - `GET /api/analysis/cohort-roi` → Cohort × ROI 联动（LTV × 获客成本）
  - 前端: `biz/roi` 页（ROI 全景 + Cohort 衰减 + 成本明细）

- **价值洼地**:
  - `biz/roi` 页的成本明细**当前是硬编码** (`COST_BREAKDOWN` 静态数组)，未读取 B1 `cost_list` 真实数据
  - `cost_rules` 数据（详细规则表）**完全未被消费**，可展示每种推荐动作的激励梯度
  - `次卡 vs 现金` 的分类 ROI 数据（目标ROI、实际ROI）前端**也是硬编码** (`roiBlocks` 模拟)，未连真实数据
  - `地区` 枚举可用于筛选器，但**当前未构建地区级 ROI 对比**
  - `目标ROI vs 实际ROI` 的 **gap 追踪**未实现（只展示实际值）
  - B1 × A1 联动：每口径的获客成本（总成本/按口径付费数）**未计算**

- **可构建图表/交互**:
  1. **次卡 vs 现金 ROI 对比** — 双 GaugeChart 或 RadialBarChart（Recharts RadialBarChart） — 数据: `summary.次卡.实际ROI` + `summary.现金.实际ROI` vs 各自目标 — hover 显示目标ROI/实际ROI/gap — 解决: 哪种激励方式 ROI 更高，资源应向哪侧倾斜
  2. **成本结构瀑布图** — WaterfallChart（Recharts BarChart 变体） — 数据: `cost_list` 各奖励类型的 `成本USD`，从0叠加到总成本 — hover 显示激励详情/推荐动作/赠送数/单价 — click 展开规则详情抽屉 — 解决: 哪个激励类别占成本大头
  3. **激励规则阶梯图** — StepLineChart 或 BarChart — 数据: `cost_rules` 各推荐分类在不同人数分段的奖励数值 — hover 显示该分段的具体规则描述 — slider 控制查看哪个推荐分类 — 解决: 激励政策对推荐人数的边际效应
  4. **ROI 目标 vs 实际** — BulletChart（用 Recharts BarChart + 参考线） — 数据: 次卡/现金各自的目标ROI和实际ROI — 参考线标出目标值，bar 显示实际 — hover 显示 gap 和同期营收/成本 — 解决: ROI 达成率，是否需要优化成本结构

- **跨源联动**:
  - `实际成本` → A2 `A学员数` per围场 → 计算每个围场的单位获客成本
  - `cost_list.成本USD` → Cohort 衰减曲线 → 计算每月龄学员的投入产出比
  - `地区` → A1 `海外大区` → 按地区分解 ROI（泰国 vs 其他）
  - `实际营收` vs A1 总计`付费` × 客单价 → 验证数据一致性

- **前端 spec**:
  - 修改 `biz/roi` 页面 — 将 `COST_BREAKDOWN` 硬编码替换为 API 读取 `cost_breakdown`
  - 新增 API hook `useROICostDetail()` → `GET /api/analysis/roi/cost-breakdown`
  - 新增组件: `ROICostWaterfall` (props: `{ costList: ROICostItem[]; totalCost: number }`)
  - 新增组件: `ROIGaugeComparison` (props: `{ actual: number; target: number; label: string }[]`)
  - 建议路由: `/app/biz/roi` 页（现有页面扩展）

- **后端 spec**:
  - 新增 `GET /api/analysis/roi/cost-breakdown` — 直接返回 B1 `cost_list`
  - 返回: `{ items: [ { 奖励类型, 内外场激励, 激励详情, 推荐动作, 赠送数, 成本单价USD: float, 成本USD: float }[] ], total_cost_usd: float }`
  - 修改 `_adapt_roi()` — 将 `cost_breakdown` 从 `cost_list` 原始数据填充而非空

---

## 跨源联动汇总（A1-A4 + B1）

| 分析场景 | 数据源组合 | join key | 价值 |
|----------|------------|---------|------|
| 推荐链追踪 | A3(推荐人ID) → A3(学员ID) | 推荐人学员ID = 学员ID | 找超级推荐者，A→B→C 多代 |
| CC 效率全面板 | A3(by_cc) + A4(records) + A1(by_team) | CC姓名 | 单 CC 的完整漏斗数据 |
| 围场效率 × 成本 | A2(by_enclosure) + B1(cost_list) | 围场分段 | 每个围场段的单位获客成本 |
| 口径质量 vs 目标 | A1(by_channel) + 目标体系 | 口径名称 | 4口径的达成率和时间进度 |
| 学员旅程完整链 | A3(明细) + A4(by_cc) + B1(ROI) | 学员ID/CC名 | 从注册到付费到 ROI 的全链路 |

---

## 当前利用率评估

| 数据源 | 字段数 | 已利用字段数 | 利用率 | 核心洼地 |
|--------|--------|------------|--------|---------|
| A1（团队Leads） | ~25 | ~10 | 40% | by_team 未用、注册付费率未存趋势 |
| A2（围场效率） | ~30 | ~4 | 13% | 推荐注册/付费未展示、口径对比未做 |
| A3（学员明细） | ~20 | ~8 | 40% | 推荐人ID/CC流转/时间间隔未用 |
| A4（个人Leads） | ~9 | ~5 | 55% | reserve/showup未进排名、组内排名未做 |
| B1（ROI模型） | ~20 | ~4 | 20% | 前端硬编码/cost_rules/地区ROI未做 |

**综合利用率: ~34%，存在大量中高价值洼地**

---

## M16 优先级建议

| 优先级 | 功能 | 数据源 | 预计收益 |
|--------|------|--------|---------|
| P0 | B1 成本明细接真实数据（替换硬编码） | B1 | 数据可信度立即提升 |
| P0 | A3 推荐关系网络图 | A3 | 超级推荐者识别，直接影响激励策略 |
| P1 | A1 团队漏斗对比 | A1 | 团队间瓶颈定位，运营决策依据 |
| P1 | A2 围场×渠道热力矩阵 | A2 | 资源分配优化 |
| P1 | A3 注册→付费时间间隔分析 | A3 | 跟进时机优化 |
| P2 | A4 个人漏斗气泡图 | A4 | 销售潜力识别 |
| P2 | B1 次卡vs现金 ROI 仪表盘 | B1 | 激励政策优化 |
| P3 | B1 激励规则阶梯图 | B1 | 政策可视化 |
