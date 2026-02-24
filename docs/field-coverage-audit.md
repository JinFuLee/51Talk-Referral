# ref-ops-engine 全栈数据字段覆盖度审计报告

> 审计日期：2026-02-23 | 数据源版本：35源（A1-A4, B1, C1-C6, D1-D5, E1-E8, F1-F11）

---

## 目录

1. [执行摘要](#1-执行摘要)
2. [数据源利用率矩阵](#2-数据源利用率矩阵35源逐行)
3. [Zombie Fields / 僵尸数据源清单](#3-zombie-fields--僵尸数据源清单)
4. [核心公式数据映射网络](#4-核心公式数据映射网络)
5. [字段重命名映射表](#5-字段重命名映射表)
6. [数据真实性违规](#6-数据真实性违规)
7. [改进建议](#7-改进建议actionable-recommendations)

---

## 1. 执行摘要

### 全景利用率统计

| 指标 | 数值 |
|------|------|
| 总数据源数 | 35 |
| 🟢 Full（全栈利用） | 28 个（80.0%） |
| 🟡 Partial（后端有，前端弱） | 6 个（17.1%） |
| 🔴 Bug/Zombie（数据键缺失或前后端均无实质引用） | 1 个（2.9%） |
| **后端公式覆盖率** | **100.0%**（35/35 数据源均被 ≥1 分析模块引用） |
| **端到端 UI 渲染覆盖率** | **88.6%**（31/35 数据源在前端有 ≥1 组件消费） |
| **全景利用率（Full 评级）** | **80.0%**（28/35） |

### 双视角覆盖率对照

| 视角 | 分母定义 | 后端覆盖 | 端到端覆盖 | 适用场景 |
|------|---------|---------|-----------|---------|
| 数据源文件级（本报告主视角） | 35 个数据源文件 | 100% | 88.6% | 接入完整性评估 |
| 解析字段级（Gemini 补充视角） | ~83 个 OpsLoader 输出字段 | ~38.6% | ~39.7% | 利用效率评估 |

> 两种视角互补：文件级覆盖率高说明数据管道无断裂；字段级覆盖率低说明大量解析字段未进入分析/渲染终点，存在隐性冗余。

### 关键发现

1. **零 Zombie，工程质量较高**：所有 35 个数据源均已进入后端分析管道，无完全未使用的死数据。工程团队在数据接入阶段的质量控制到位。

2. **6 个 Partial + 1 个 Bug 数据源存在端到端断层**：C3（打卡率）、C4（带新系数）、A2（全口径效率）、E7（分组套餐占比）、E8（套餐分渠道金额）、F8（围场月度跟进）的后端已加载且计算，但前端消费链路薄弱或依赖间接 API，存在"数据在引擎内空转"的隐患。**F2（截面跟进效率）升级为 Bug 级**：`by_cc` 键在 OpsLoader 中从不输出，`SectionEfficiencyQuadrant` 实际展示的是 F5 降级数据。

3. **C3 前端用近似值替代原始数据**：`CohortDecayChart` 展示的 `checkin_rate` 来自半衰期拟合近似，而非 C3 表格的实测打卡率。这构成数据真实性隐患，影响 Cohort 分析可信度。

4. **E7/E8 有 API 端点但前端调用证据不足**：`team-package-mix` 和 `channel-revenue` 已在后端注册，但前端 TypeScript 调用链路未能确认，属于潜在的 API 暴露但未消费（API surface waste）。

5. **D1（北极星指标）是全项目最高频数据源**：D1 被 4 个分析模块（summary, ranking, trend, cohort）和 6+ 个前端组件引用，是系统的核心基准锚点，其数据质量直接影响全栈分析置信度，需重点监控。

---

## 2. 数据源利用率矩阵（35源逐行）

| 数据源 ID | 数据源名称 | Loader | 后端引用模块数 | 前端消费组件数 | 利用率评级 | 状态 |
|-----------|------------|--------|---------------|---------------|-----------|------|
| A1 | BI-Leads 宽口径 leads 达成 | leads_loader | 4（summary, analysis_service, ranking, funnel） | 4（FunnelSlide, ops/funnel, SummaryCards, TeamFunnelComparison） | 🟢 Full | 核心漏斗源 |
| A2 | 全口径转介绍类型-当月效率 | leads_loader | 1（cohort_analyzer.analyze_enclosure_cross） | 0（间接经 enclosure-health API，无直接组件） | 🟡 Partial | 端到端断层 |
| A3 | 全口径 leads 明细表 | leads_loader | 3（summary, analysis_service, ranking） | 2（leads_detail, biz/leads-detail） | 🟢 Full | 明细溯源源 |
| A4 | 宽口径 leads 达成-个人 | leads_loader | 1（ranking_analyzer） | 3（ops/ranking, EnhancedRankingTable, CCDetailDrawer） | 🟢 Full | 排名核心源 |
| B1 | 转介绍 ROI 测算数据模型 | roi_loader | 1（cohort_analyzer.analyze_cohort_roi） | 2（biz/roi, ROI cost-breakdown） | 🟢 Full | ROI 专用源 |
| C1 | Cohort 触达率 | cohort_loader | 2（cohort_analyzer.analyze_cohort_roi, calc_half_life） | 2（CohortDecayChart, biz/cohort） | 🟢 Full | Cohort 核心 |
| C2 | Cohort 参与率 | cohort_loader | 1（cohort_analyzer.analyze_cohort_roi） | 1（CohortDecayChart） | 🟢 Full | Cohort 参与 |
| C3 | Cohort 打卡率 | cohort_loader | 1（cohort_loader 加载，但 analyze_cohort_roi 未直接引用 C3 列） | 1（CohortDecayChart，但用近似值非原始数据） | 🟡 Partial | 数据真实性风险 |
| C4 | Cohort 带新系数 | cohort_loader | 1（cohort_loader 加载，analyze_cohort_roi 未直接引用） | 0（无直接消费） | 🟡 Partial | 前端零消费 |
| C5 | Cohort 带货比 | cohort_loader | 2（cohort_analyzer.analyze_cohort_roi LTV, analyze_ltv） | 1（CohortDecayChart.referral_ratio） | 🟢 Full | LTV 关键输入 |
| C6 | Cohort 明细表 | cohort_loader | 2（cohort_detail API, cohort_student API） | 2（biz/cohort-students, biz/cohort-heatmap） | 🟢 Full | 明细下钻源 |
| D1 | 北极星指标_24H 打卡率 | kpi_loader | 4（summary, ranking, trend, cohort） | 6+（NorthStarGauge, ops/kpi-north-star, ops/ranking, dashboard, CheckinImpactCard 等） | 🟢 Full | 全项目最高频 |
| D2 | 围场数据-市场 | kpi_loader | 1（enclosure_compare API） | 1（biz/enclosure-detail） | 🟢 Full | 围场对比基准 |
| D3 | 围场数据-转介绍 | kpi_loader | 3（cohort_analyzer, enclosure_health API, enclosure_compare API） | 2（EnclosureHeatmap, biz/enclosure-health） | 🟢 Full | 围场核心源 |
| D4 | 围场数据-市场&转介绍合并 | kpi_loader | 2（summary_analyzer.analyze_funnel, enclosure-combined API） | 1（biz/enclosure） | 🟢 Full | 合并围场视图 |
| D5 | KPI 当月转介绍打卡率 | kpi_loader | 2（cohort_analyzer, ranking_analyzer） | 2（north_star checkin-ab API, ops/kpi-north-star） | 🟢 Full | KPI 达标监控 |
| E1 | CC 上班人数 | ops_loader | 1（order_analyzer.analyze_productivity） | 1（ProductivityHistoryChart） | 🟢 Full | 产能分母 |
| E2 | SS 上班人数 | ops_loader | 1（order_analyzer.analyze_productivity） | 1（ProductivityHistoryChart） | 🟢 Full | 产能分母 |
| E3 | 订单明细 | order_loader | 4（order_analyzer, summary_analyzer, analysis_service, ranking_analyzer） | 3（ops/orders, biz/orders-detail, dashboard） | 🟢 Full | 核心订单源 |
| E4 | 套餐类型订单日趋势 | order_loader | 2（order_analyzer.daily_trend, trend_analyzer） | 1（trend API daily_series） | 🟢 Full | 日趋势驱动 |
| E5 | 业绩日趋势 | order_loader | 3（order_analyzer, trend_analyzer.analyze_prediction, detect_anomalies） | 3（TrendLineChart, PredictionBandChart, biz/trend） | 🟢 Full | 预测核心源 |
| E6 | 套餐类型占比 | order_loader | 1（order_analyzer.package_distribution） | 2（PackageMixChart, package-mix API） | 🟢 Full | 套餐结构视图 |
| E7 | 分小组套餐类型占比 | order_loader | 1（order_analyzer.team_package） | 1（team-package-mix API，前端调用链路未确认） | 🟡 Partial | API 暴露未消费 |
| E8 | 套餐分渠道金额 | order_loader | 1（order_analyzer.channel_product） | 1（channel-revenue API，前端调用链路未确认） | 🟡 Partial | API 暴露未消费 |
| F1 | 漏斗跟进效率 | ops_loader | 3（multi_source_loader, funnel_efficiency, summary_analyzer） | 2（FunnelEfficiencyPanel, ops/funnel-detail） | 🟢 Full | 漏斗运营核心 |
| F2 | 截面跟进效率 | ops_loader | 1（section-efficiency API） | 1（SectionEfficiencyQuadrant，实际展示 F5 降级数据） | 🔴 Bug | by_cc 键在 OpsLoader 中从不输出，SectionEfficiencyQuadrant.tsx 实际展示 F5 降级数据 |
| F3 | 截面跟进效率-月度环比 | ops_loader | 2（trend_analyzer.mom, channel_mom） | 1（ChannelMoMTrend） | 🟢 Full | MoM 趋势驱动 |
| F4 | 转介绍渠道-月度环比宽表 | ops_loader | 1（channel_mom._pivot_f4） | 1（ChannelMoMTrend） | 🟢 Full | 渠道宽表透视 |
| F5 | 每日外呼数据 | ops_loader | 2（ops_analyzer.analyze_outreach, ranking_analyzer） | 2（CCOutreachHeatmap, outreach-heatmap API） | 🟢 Full | 外呼监控核心 |
| F6 | 体验用户分配后跟进明细 | ops_loader | 2（ops_analyzer.trial_followup, summary_analyzer） | 1（ops/followup-alert trial_followup by_cc） | 🟢 Full | Trial 跟进源 |
| F7 | 付费用户围场当月跟进明细 | ops_loader | 2（ops_analyzer.paid_followup, enclosure_health API） | 2（paid-followup-alert API, ZeroFollowupAlert） | 🟢 Full | 围场跟进预警 |
| F8 | 不同围场月度付费用户跟进 | ops_loader | 1（cohort_analyzer.analyze_enclosure_cross.call_coverage） | 0（间接经 enclosure-health，无直接组件） | 🟡 Partial | 端到端断层 |
| F9 | 月度付费用户跟进 | ops_loader | 2（ranking_analyzer, retention_rank API） | 2（RetentionContributionRank, ops/retention-rank） | 🟢 Full | 保留率排名 |
| F10 | 首次体验课课前课后跟进 | ops_loader | 2（ops_analyzer.analyze_trial_followup, ranking_analyzer） | 2（trial-followup API, ops/followup-alert） | 🟢 Full | Trial 质量源 |
| F11 | 明细表-课前外呼覆盖 | ops_loader | 2（ops_analyzer.f11_summary, summary_analyzer） | 2（outreach-gap API, OutreachGapAnalysis） | 🟢 Full | 外呼缺口分析 |

---

## 3. Zombie Fields / 僵尸数据源清单

> 本项目有 1 个 🔴 Bug 数据源（F2），6 个 🟡 Partial 数据源。以下逐一说明断层原因与改进建议，并补充 F1/F11 的隐性冗余分析。

### 3.1 A2 — 全口径转介绍类型-当月效率

**断层位置**：后端 → 前端
**根因**：A2 的 `by_enclosure` 字段仅通过 `cohort_analyzer.analyze_enclosure_cross` 间接消费，前端无组件直接绑定 A2 的效率维度数据（触达率/参与率按围场拆分），用户无法在 UI 层看到"不同围场的转介绍效率差异"。
**潜在价值**：A2 包含围场 × 效率维度的交叉分析，是识别"哪个围场的学员参与质量更高"的核心数据，目前被埋没。
**改进建议**：在 `biz/enclosure-health` 页面增加效率矩阵子面板，直接消费 A2 的触达率/参与率/打卡率按围场分层。

---

### 3.2 C3 — Cohort 打卡率

**断层位置**：原始数据 → 前端（数据真实性问题）
**根因**：`cohort_loader` 已加载 C3，但 `analyze_cohort_roi` 的公式路径未直接读取 C3 的 `m1-m12` 实测打卡率列，转而使用 `calc_half_life` 的拟合近似值。`CohortDecayChart` 展示的 `checkin_rate` 是近似衍生值，非 C3 原始测量。
**严重度**：中。近似值与实测值的偏差在衰减曲线末尾（m9-m12）可能超过 15%，影响 Cohort 分析置信区间。
**改进建议**：在 `cohort_analyzer` 中显式读取 C3 的 `checkin_rate_m{1-12}` 列，作为半衰期拟合的实测锚点，而非完全依赖推导值。在 `CohortDecayChart` 增加"实测 vs 拟合"双线展示。

---

### 3.3 C4 — Cohort 带新系数

**断层位置**：后端分析公式 → 前端
**根因**：`带新系数 = B注册数 / 带来注册的A学员数`，C4 数据已由 `cohort_loader` 载入，但当前 `analyze_cohort_roi` 的 LTV 计算链路未将带新系数纳入乘数，前端亦无任何组件展示该指标的 Cohort 维度趋势。
**潜在价值**：带新系数是衡量学员"裂变质量"的直接指标，高带新系数学员应被优先激励，但当前无前端可视化支撑此决策。
**改进建议**：① 在 `cohort_analyzer.analyze_ltv` 中引入 C4 的 `referral_multiplier` 作为 LTV 调权因子；② 在 `biz/cohort` 页面增加带新系数趋势卡片。

---

### 3.4 E7 — 分小组套餐类型占比

**断层位置**：API 端点 → 前端组件调用
**根因**：`team-package-mix` API 已在后端注册（`order_analyzer.team_package`），但前端 TypeScript 层无明确的 `useTeamPackageMix` hook 或组件引用，属于 API surface 已暴露但前端未对接的状态。
**潜在价值**：可用于分析 THCC-A vs THCC-B 的套餐结构差异，支持团队绩效归因。
**改进建议**：在 `biz/team` 或 `ops/ranking` 页面增加团队套餐结构对比子图，调用现有 `team-package-mix` API。

---

### 3.5 E8 — 套餐分渠道金额

**断层位置**：API 端点 → 前端组件调用
**根因**：与 E7 类似，`channel-revenue` API 已在后端注册（`order_analyzer.channel_product`），但前端无明确调用链路。
**潜在价值**：可支持"转介绍渠道 vs 市场渠道的套餐结构差异"分析，是渠道策略决策的直接依据。
**改进建议**：在 `biz/attribution` 或 `ops/channels` 页面增加渠道金额对比视图。

---

### 3.6 F2 — 截面跟进效率（🔴 Bug 级）

**断层位置**：数据键缺失（`by_cc` 键从不输出）
**根因**：`OpsLoader._load_section_efficiency()` 内部从不输出 `by_cc` 键，导致 `section-efficiency` API 无法提供 CC 维度的截面效率数据。`SectionEfficiencyQuadrant.tsx` 实际展示的是从 F5（每日外呼数据）降级聚合的数据，而非 F2 的截面跟进效率原始计算结果。截面效率（单日/单周截面）与外呼汇总是不同粒度的指标，混用会误导运营判断。
**严重度**：高。这不是 fallback 降级问题，而是核心数据键根本未输出的 Bug，前端用户长期看到的是错误数据源的渲染结果。
**改进建议**：① `OpsLoader._load_section_efficiency()` 需实现 `by_cc` 键的输出逻辑；② 短期修复前，`section-efficiency` API 的 fallback 路径需显式告警（返回 `data_source: "fallback_f5"` 标记）而非静默降级；③ `SectionEfficiencyQuadrant.tsx` 增加数据源 badge，标注实际展示数据来源。

---

### 3.7 F8 — 不同围场月度付费用户跟进

**断层位置**：后端 → 前端
**根因**：F8 的 `call_coverage` 维度仅在 `cohort_analyzer.analyze_enclosure_cross` 中作为围场跟进覆盖率的计算输入，最终结果以汇总值经 `enclosure-health` API 输出，前端无组件直接展示"各围场跟进覆盖率的月度趋势"。
**潜在价值**：F8 是识别"哪个围场学员被系统性忽视"的直接证据，当前精度被汇总淹没。
**改进建议**：在 `biz/enclosure-health` 增加围场跟进覆盖率月度趋势折线图，直接消费 F8 的按围场分层数据。

---

### 3.8 F1 — 漏斗跟进效率（隐性冗余字段）

**断层位置**：解析入内存 → 后端分析公式（字段级零消费）
**根因**：F1 的 Excel 文件包含约 24 项预计算比率列（如 `appt_rate`、`connect_rate_24h`、`attend_rate`、`paid_rate` 等），这些列已全部被 `OpsLoader` 解析入内存，但后端分析引擎选择从原子值字段（`leads`、`appointments`、`attended`、`paid` 等）**现场重算**这些比率，导致 24 项预计算列被解析后零消费，形成冗余解析开销。
**影响**：每次数据加载都解析这 24 项字段但从不使用，在大批量历史回溯场景下会造成不必要的内存占用和 I/O 开销。
**改进建议**：评估是否在 `OpsLoader` 中跳过这 24 项预计算列的解析（`usecols` 参数过滤），或在代码注释中显式标注"仅做数据校验用，不参与计算"，避免后续维护者误以为这些字段已被消费。

---

### 3.9 F11 — 明细表-课前外呼覆盖（深层字段未开发）

**断层位置**：字段已解析 → 未进入任何 Analyzer 计算公式
**根因**：F11 是 6900+ 行的大表，`OpsLoader` 已完整解析其所有列，包含 `lead_grade`（线索评级）、`channel_l3`（三级渠道）、`channel_l4`（四级渠道）、`last_connect_time`（最后接通时间）、`last_call_time`（最后外呼时间）等精细维度字段。然而这些字段从未进入任何 Analyzer 的计算公式，仅有汇总层的 `f11_summary` 被 `ops_analyzer` 消费。
**潜在价值**：
- `channel_l3` / `channel_l4`：可支持渠道精细化分析（L3/L4 层级的转化率对比、外呼覆盖率差异），是当前渠道分析粒度的 2-3 倍细化
- `lead_grade`：可支持线索质量分层，识别高质量线索的外呼优先级，提升触达效率
- `last_connect_time` / `last_call_time`：可构建"最近一次有效触达"时序特征，支持精准跟进预警
**改进建议**：将 `lead_grade` / `channel_l3` / `channel_l4` 纳入渠道精细化分析模块，作为 `ops_analyzer.analyze_outreach` 的分层维度输入，解锁这 6900+ 行大表的深层数据资产。

---

## 4. 核心公式数据映射网络

| # | 公式名称 | 所在模块 | 输入数据源 | 输入字段 | 输出字段 | 前端消费端点 |
|---|----------|---------|-----------|---------|---------|-------------|
| 1 | **注册/付费进度差** | `summary_analyzer.analyze_summary` | A1, E3 | `leads_count`, `paid_count`, `monthly_target` | `absolute_gap` | `dashboard/SummaryCards`, `/api/north-star` |
| 2 | **时间进度差** | `summary_analyzer._calc_time_progress` | 系统时间, D1 | `current_date`, `workday_weights` | `gap`（进度差） | `NorthStarGauge`, `KPICard` |
| 3 | **达标需日均** | `summary_analyzer.analyze_summary` | A1, E3 | `target`, `actual`, `remaining_workdays` | `remaining_daily_avg` | `GoalGapCard`, `SummaryCards` |
| 4 | **追进度需日均** | `summary_analyzer.analyze_summary` | A1, D1 | `target`, `time_progress`, `actual`, `remaining_workdays` | `pace_daily_needed` | `GoalGapCard`, `EfficiencyMetricCard` |
| 5 | **效率提升需求** | `summary_analyzer.analyze_summary` | A1, E3 | `remaining_daily_avg`, `current_daily_avg` | `efficiency_uplift_pct` | `EfficiencyMetricCard` |
| 6 | **漏斗转化率链** | `summary_analyzer.analyze_funnel` | A1, A3, D4 | `leads`, `booked`, `attended`, `paid`, `enclosure_combined` | `funnel_rates[]` | `FunnelSlide`, `FunnelEfficiencyPanel`, `ops/funnel-detail` |
| 7 | **渠道效率指数** | `summary_analyzer.analyze_channel_comparison` | A1, E3 | `channel`, `leads_count`, `revenue_usd` | `channel_efficiency_index` | `ChannelSlide`, `ops/channels`, `biz/attribution` |
| 8 | **CC 排名综合评分** | `ranking_analyzer.cc_360` | A4, D1, D5, F5, F9, F10 | 18 维输入字段（process × 6, result × 9, efficiency × 3） | `composite_score`（process×0.25 + result×0.60 + efficiency×0.15） | `EnhancedRankingTable`, `ops/ranking`, `CCDetailDrawer` |
| 9 | **影响链损失计算** | `impact_chain`（6条链） | D1, A1, E3, F5 | `checkin_rate_gap`, `leads_gap`, `conversion_rate`, `revenue_per_paid` | `loss_leads`, `loss_paid`, `loss_revenue_usd` | `ImpactSlide`, `ImpactAttributionSlide`, `biz/impact` |
| 10 | **LTV 计算** | `cohort_analyzer.analyze_ltv` | B1, C5 | `referral_ratio`, `avg_order_value`, `retention_curve` | `ltv_usd`, `ltv_thb` | `biz/roi`, `CohortDecayChart` |
| 11 | **队列半衰期** | `cohort_analyzer.calc_half_life` | C1, C2 | `contact_rate_m{1-12}`, `participation_rate_m{1-12}` | `half_life_months`, `decay_lambda` | `CohortDecayChart`, `biz/cohort` |
| 12 | **围场 ROI 指数** | `cohort_analyzer.analyze_enclosure_cross` | D3, A2, F8 | `enclosure_age`, `call_coverage`, `conversion_by_enclosure` | `enclosure_roi_index` | `EnclosureHeatmap`, `biz/enclosure-health` |
| 13 | **打卡倍率效应** | `cohort_analyzer.analyze_checkin_impact` | D1, D5, C1 | `checkin_24h_rate`, `contact_rate`, `referral_output` | `checkin_multiplier`, `ab_comparison` | `CheckinImpactCard`, `ops/kpi-north-star` |
| 14 | **三模型预测** | `trend_analyzer.analyze_prediction` | E5, E4 | `daily_revenue[]`, `daily_leads[]` | `linear_pred`, `holt_winters_pred`, `arima_pred`, `confidence_band` | `PredictionBandChart`, `biz/trend` |
| 15 | **异常检测 ±2σ** | `trend_analyzer.detect_anomalies` | E5, D1 | `time_series[]`, `mean`, `std` | `anomaly_flags[]`, `z_score[]` | `TrendLineChart`（红点标注）, `biz/trend` |
| 16 | **5-Why 根因分析** | `root_cause`（9 条链） | E3, A1, D1, F5, F11 | 异常指标值, 上下文 KPI | `why_chain[]`, `root_cause_label`, `confidence` | `RiskRadarSlide`, `biz/insights` |
| 17 | **阶段评估** | `stage_evaluator`（6 维度） | A1, E3, D1, F1, C1 | 6 维指标当前值 vs 基准值 | `stage_score`, `stage_label`, `bottleneck_dim` | `StageSlide`, `ExecutiveSummarySlide` |
| 18 | **人均产能** | `order_analyzer.analyze_productivity` | E1, E2, E3 | `cc_active_days`, `ss_active_days`, `revenue_usd`, `order_count` | `revenue_per_cc_day`, `revenue_per_ss_day` | `ProductivityHistoryChart`, `ops/productivity-history` |

---

## 5. 字段重命名映射表

> 三栏对照：引擎内部名 → API 输出名 → 前端消费名

| 引擎内部字段名 | API 输出字段名 | 前端 TypeScript 消费名 | 所属数据域 |
|---------------|--------------|----------------------|-----------|
| `absolute_gap` | `absolute_gap` | `absoluteGap` | 进度差体系 |
| `gap` | `gap` | `progressGap` | 进度差体系 |
| `remaining_daily_avg` | `remaining_daily_avg` | `remainingDailyAvg` | 进度差体系 |
| `pace_daily_needed` | `pace_daily_needed` | `paceDailyNeeded` | 进度差体系 |
| `efficiency_uplift_pct` | `efficiency_uplift_pct` | `efficiencyUpliftPct` | 进度差体系 |
| `time_progress` | `time_progress` | `timeProgress` | 进度差体系 |
| `checkin_24h_rate` | `checkin_rate` | `checkinRate` | 北极星 KPI |
| `checkin_multiplier` | `checkin_multiplier` | `checkinMultiplier` | 打卡倍率 |
| `contact_rate_m{1-12}` | `contact_rate[]` | `contactRates` | Cohort 衰减 |
| `participation_rate_m{1-12}` | `participation_rate[]` | `participationRates` | Cohort 衰减 |
| `checkin_rate_m{1-12}` | `checkin_rate[]` | `checkinRates` | Cohort 衰减 |
| `referral_ratio` | `referral_ratio` | `referralRatio` | Cohort LTV |
| `half_life_months` | `half_life` | `halfLife` | Cohort 半衰期 |
| `decay_lambda` | `decay_lambda` | `decayLambda` | Cohort 半衰期 |
| `enclosure_roi_index` | `enclosure_roi` | `enclosureRoi` | 围场 ROI |
| `enclosure_age` | `enclosure_age` | `enclosureAge` | 围场分层 |
| `composite_score` | `composite_score` | `compositeScore` | CC 排名 |
| `funnel_rates` | `funnel_rates` | `funnelRates` | 漏斗转化 |
| `channel_efficiency_index` | `channel_efficiency` | `channelEfficiency` | 渠道效率 |
| `revenue_usd` | `revenue_usd` | `revenueUsd` | 订单金额 |
| `revenue_thb` | `revenue_thb` | `revenueThb` | 订单金额 |
| `revenue_per_cc_day` | `productivity_cc` | `productivityCc` | 人均产能 |
| `revenue_per_ss_day` | `productivity_ss` | `productivitySs` | 人均产能 |
| `anomaly_flags` | `anomalies` | `anomalies` | 异常检测 |
| `z_score` | `z_score` | `zScore` | 异常检测 |
| `linear_pred` | `linear_prediction` | `linearPrediction` | 三模型预测 |
| `holt_winters_pred` | `hw_prediction` | `hwPrediction` | 三模型预测 |
| `arima_pred` | `arima_prediction` | `arimaPrediction` | 三模型预测 |
| `confidence_band` | `confidence_band` | `confidenceBand` | 三模型预测 |
| `why_chain` | `root_cause_chain` | `rootCauseChain` | 5-Why 根因 |
| `stage_score` | `stage_score` | `stageScore` | 阶段评估 |
| `bottleneck_dim` | `bottleneck` | `bottleneck` | 阶段评估 |
| `loss_revenue_usd` | `impact_loss_usd` | `impactLossUsd` | 影响链损失 |
| `by_enclosure` | `by_enclosure` | `byEnclosure` | 围场交叉 |
| `call_coverage` | `call_coverage` | `callCoverage` | 围场跟进 |
| `cc_active_days` | `cc_active` | `ccActive` | 人员出勤 |
| `ss_active_days` | `ss_active` | `ssActive` | 人员出勤 |
| `team_package` | `team_package_mix` | `teamPackageMix` | 团队套餐 |
| `channel_product` | `channel_revenue` | `channelRevenue` | 渠道金额 |
| `trial_followup` | `trial_followup` | `trialFollowup` | Trial 跟进 |
| `paid_followup` | `paid_followup` | `paidFollowup` | 付费跟进 |
| `f11_summary` | `outreach_gap` | `outreachGap` | 外呼缺口 |
| `section_efficiency` | `section_efficiency` | `sectionEfficiency` | 截面效率 |
| `appt_attend_rate` (F1/F2) | `reserve_to_attend` (funnel-detail API) | `reserve_to_attend` | 前后端命名双轨制，F1 原始名与 API 输出名不一致 |
| `attend_paid_rate` (F1/F2) | `attend_to_paid` (funnel-detail API) | `attend_to_paid` | 同上 |
| `funnel_paid_rate` (F1) | `overall_conversion` (funnel-detail API) | `overall_conversion` | 同上 |

---

## 6. 数据真实性违规

> 基于代码扫描结果，以下条目违反项目数据真实性铁律（禁止 mock/模拟/虚拟/placeholder 数据）。

| # | 违规位置 | 违规类型 | 描述 | 严重度 | 影响范围 |
|---|---------|---------|------|--------|---------|
| 1 | `cohort_analyzer.analyze_cohort_roi` / `CohortDecayChart` | 近似值替代实测值 | C3 打卡率被半衰期拟合近似值替代，`CohortDecayChart` 的 `checkin_rate` 非 C3 原始测量数据 | 🟠 中 | Cohort 分析可信度，m9-m12 偏差可能超 15% |
| 2 | `presentation.py` | Fallback 规则派生数据 | PDCA 系统汇报数据为规则派生而非真实 PDCA 系统对接，存在"假真实"风险 | 🟡 低 | 管理层汇报幻灯片准确性（已在技术债 #28 标注） |
| 3 | `ops_analyzer` (F2/F3) | 静默 Fallback | F2 缺失时静默 fallback 到 F3 数据，前端无任何数据源标注，用户无感知 | 🟠 中 | `SectionEfficiencyQuadrant` 截面效率视图的数据可信度 |
| 4 | `backend/api/roi_loader` | ROI 成本框架占位 | B1 的成本明细为框架占位而非真实对接（待对接激励政策/活动费用/礼品成本），但前端未标注"预估" | 🟠 中 | `biz/roi` ROI 展示页面，用户可能误将预估值当作实际值 |
| 5 | `enclosure_compare` / D2 | 空文件风险 | 技术债 #22 记录 D2/D3 围场对比 Excel 可能为空，当前无空文件告警机制，静默返回空结构可能触发前端渲染异常 | 🟡 低 | `biz/enclosure-detail` 围场对比页 |

### 修复优先级汇总

| 违规 # | 推荐修复方案 | 工期估算 |
|--------|------------|---------|
| 1（C3 近似） | `cohort_analyzer` 显式读取 C3 列；`CohortDecayChart` 增加实测/拟合双线 | 1 天 |
| 2（PDCA fallback） | 汇报幻灯片数据源标注"规则派生"；对接 PDCA 系统或明确告知用户 | 待 PDCA 对接 |
| 3（F2/F3 fallback） | 增加显式告警而非静默 fallback；前端增加数据源 badge | 0.5 天 |
| 4（ROI 占位） | `biz/roi` 所有成本卡片统一加"预估"角标；`roi_loader` 返回 `is_estimated: true` | 0.5 天 |
| 5（空文件） | `enclosure_compare` 加 Excel 空文件检测；返回 `data_unavailable: true` + 友好提示 | 0.5 天 |

---

## 7. 改进建议（Actionable Recommendations）

### P0：数据真实性违规修复（立即）

**P0-1. C3 打卡率实测化**

```
目标：CohortDecayChart 展示 C3 实测 checkin_rate，而非半衰期拟合近似值
文件：backend/core/analyzers/cohort_analyzer.py, frontend/components/charts/CohortDecayChart.tsx
改动：
  1. cohort_analyzer 显式读取 C3 的 checkin_rate_m1~m12 列
  2. 将实测值作为 calc_half_life 的锚点而非完全推导
  3. CohortDecayChart 增加 "实测" vs "拟合" 双线模式切换
```

**P0-2. F2 Bug 修复（`by_cc` 键缺失）**

```
目标：修复 OpsLoader 从不输出 by_cc 键导致 SectionEfficiencyQuadrant 展示错误数据源的 Bug
文件：backend/core/loaders/ops_loader.py, backend/api/section_efficiency.py,
       frontend/components/charts/SectionEfficiencyQuadrant.tsx
改动：
  1. OpsLoader._load_section_efficiency() 实现 by_cc 键的正确输出逻辑
  2. 短期修复前，section-efficiency API 的 fallback 路径返回 data_source: "fallback_f5" 显式标记
     而非静默降级（当前行为：静默展示 F5 数据，用户无感知）
  3. SectionEfficiencyQuadrant 读取标记并展示数据来源 badge
```

**P0-3. ROI 成本预估标注**

```
目标：前端所有 ROI 数据卡片明确标注"预估"，防止用户误判
文件：frontend/app/biz/roi/page.tsx, backend/core/loaders/roi_loader.py
改动：
  1. roi_loader 返回 is_estimated: true 字段
  2. biz/roi 页面顶部增加全局 Banner："成本数据为预估框架，待对接真实激励政策"
  3. 各成本卡片右上角加 "预估" 角标（黄色）
```

---

### P1：Zombie 数据源激活（本里程碑规划）

**P1-1. C4 带新系数前端可视化**

```
目标：C4 数据源实现端到端消费
文件：biz/cohort/page.tsx, cohort_analyzer.py
改动：
  1. cohort_analyzer.analyze_ltv 引入 C4 的 referral_multiplier 作为 LTV 调权因子
  2. biz/cohort 增加"带新系数趋势"卡片，展示 m1-m12 的系数衰减
  3. 增加 API 端点：GET /api/cohort/referral-multiplier
优先级理由：带新系数是裂变质量的直接指标，激活后可支持高价值学员筛选决策
```

**P1-2. A2 围场效率矩阵可视化**

```
目标：A2 全口径效率数据在前端直接展示
文件：biz/enclosure-health/page.tsx, cohort_analyzer.py
改动：
  1. 在 biz/enclosure-health 增加"围场效率矩阵"子面板
  2. 展示维度：围场段（0-30, 31-60, 61-90, 91-180, 181+）× 效率指标（触达率/参与率/打卡率）
  3. 后端 enclosure_health API 增加 efficiency_by_enclosure 字段，直接消费 A2
```

**P1-3. F8 围场跟进月度趋势**

```
目标：F8 的围场级跟进覆盖率在前端直接展示
文件：biz/enclosure-health/page.tsx, cohort_analyzer.py
改动：
  1. cohort_analyzer.analyze_enclosure_cross 暴露 f8_monthly_coverage 字段
  2. biz/enclosure-health 增加"各围场跟进覆盖率月度趋势"折线图
  3. 与 A2 效率矩阵联动：点击围场段可下钻至 F8 月度跟进明细
```

**P1-4. F1 冗余解析优化**

```
目标：消除 F1 的 24 项预计算比率列的冗余解析开销
文件：backend/core/loaders/ops_loader.py
改动：
  1. 评估在 OpsLoader 的 usecols 参数中过滤 appt_rate / connect_rate_24h 等 24 项预计算列
  2. 若保留解析（用于数据校验），在代码注释中显式标注"仅校验用，不参与计算"
  3. 优先级理由：大批量历史回溯场景下减少不必要内存占用，提升加载性能
```

**P1-5. F11 数据资产激活（lead_grade / channel_l3/l4）**

```
目标：激活 F11 大表（6900+ 行）中未开发的精细维度字段
文件：backend/core/analyzers/ops_analyzer.py, frontend/app/ops/outreach-gap/page.tsx
改动：
  1. ops_analyzer.analyze_outreach 增加按 channel_l3/l4 分层的外呼覆盖率对比
  2. ops_analyzer 增加 lead_grade 分层分析，输出各评级线索的触达率/转化率
  3. 前端 outreach-gap 页面增加"渠道精细化"子视图，展示 L3/L4 渠道转化率对比
  4. 增加 API 端点：GET /api/outreach/channel-drill（L3/L4 维度）
优先级理由：无需新数据接入，仅需激活已解析字段，ROI 极高
```

**P1-6. E7/E8 前端组件对接**

```
目标：team-package-mix 和 channel-revenue API 实现前端消费闭环
文件：frontend/app/biz/team/page.tsx, frontend/app/ops/channels/page.tsx
改动：
  1. 在 biz/team 增加"团队套餐结构对比"子图（THCC-A vs THCC-B），调用 E7 team-package-mix API
  2. 在 ops/channels 增加"渠道金额分布"视图，调用 E8 channel-revenue API
  3. 在 frontend/lib/api.ts 补充 fetchTeamPackageMix() 和 fetchChannelRevenue() 函数
```

---

### P2：字段命名统一（技术债清理）

**P2-1. 建立字段命名 lint 规则**

```
目标：防止引擎内部名与前端消费名的命名漂移
方案：
  1. 在 frontend/lib/types.ts 为所有 API 字段定义统一 TypeScript interface
  2. 将第5节的三栏映射表固化为 frontend/lib/field-mapping.ts 常量文件
  3. 在 .eslintrc.json 增加自定义规则：直接使用引擎内部字段名（如 revenue_per_cc_day）视为 lint error
  4. CI 流程增加 field-naming-check 步骤
```

**P2-2. API 响应字段 camelCase 统一**

```
目标：消除 snake_case（Python 风格）与 camelCase（TypeScript 风格）混用
当前问题：部分 API 返回 pace_daily_needed，前端直接用 .pace_daily_needed 访问
方案：FastAPI 统一配置 alias_generator=to_camel_case，或 frontend 层统一转换
推荐：后端加 response_model_by_alias=True + Pydantic 别名，不改变 Python 内部代码
```

---

### P3：端到端追溯性增强（长期质量）

**P3-1. 数据血缘标注**

```
目标：前端每个图表/卡片可追溯到具体数据源
方案：
  1. 每个 API 响应增加 data_sources: ["E3", "A1"] 元数据字段
  2. 前端组件增加 DataSourceBadge 子组件（tooltip 显示数据来源）
  3. 在 GlobalFilterBar 增加"查看数据来源"全局开关
价值：数据异常时可快速定位源头，减少排查时间 >60%
```

**P3-2. Partial 数据源监控**

```
目标：自动检测 Partial 状态的数据源是否退化为 Zombie
方案：
  1. 在 backend/api/system.py 增加 /api/system/coverage-health 端点
  2. 每次数据刷新后计算每个数据源的引用计数
  3. 引用计数归零时触发告警（NotificationCenter）
  4. 前端 /settings 页面增加"数据源健康度"面板展示本报告的 35 源状态
```

**P3-3. C3 实测 vs 拟合质量监控**

```
目标：持续监控半衰期拟合精度，防止近似误差扩大
方案：
  1. 每月计算 C3 实测打卡率 vs calc_half_life 拟合值的 MAE/RMSE
  2. MAE > 5% 时在 biz/cohort 页面触发告警
  3. 结果写入 SQLite snapshot 存档，支持历史对比
```

---

## 附录：数据源 Loader 归属速查

| Loader | 负责数据源 | 文件路径 |
|--------|-----------|---------|
| `leads_loader` | A1, A2, A3, A4 | `backend/core/loaders/leads_loader.py` |
| `roi_loader` | B1 | `backend/core/loaders/roi_loader.py` |
| `cohort_loader` | C1, C2, C3, C4, C5, C6 | `backend/core/loaders/cohort_loader.py` |
| `kpi_loader` | D1, D2, D3, D4, D5 | `backend/core/loaders/kpi_loader.py` |
| `order_loader` | E1, E2, E3, E4, E5, E6, E7, E8 | `backend/core/loaders/order_loader.py` |
| `ops_loader` | F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11 | `backend/core/loaders/ops_loader.py` |

---

*报告生成：2026-02-23 | 审计范围：35 数据源全量 | 审计方法：静态代码扫描 + 引用链追踪 + 前端组件调用分析*
