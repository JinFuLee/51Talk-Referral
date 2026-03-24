# 转介绍数据仪表盘完整覆盖分析报告

> 分析日期：2026-03-24 | 数据源：8 个（D1/D2/D2b/D2-SS/D2-LP/D3/D4/D5）| 前端页面：21 个 | 后端 API 文件：25 个

---

## 一、数据源覆盖矩阵

### 1.1 D1 — 结果数据（4行×18列）

| 列名 | 已消费 API | 前端页面 | 可支撑分析维度 | 缺口 |
|------|-----------|---------|--------------|------|
| 统计日期(day) | overview | home | 时间轴 | — |
| 区域 | overview | home | 区域筛选 | — |
| 转介绍注册数 | overview, funnel, attribution/summary | home, funnel, attribution | 漏斗顶部 | — |
| 预约数 | overview, funnel | home, funnel | 漏斗中部 | — |
| 出席数 | overview, funnel | home, funnel | 漏斗中部 | — |
| 转介绍付费数 | overview, funnel | home, funnel | 漏斗底部 | — |
| 客单价 | overview | home | 单价跟踪 | ❌ **双差额体系缺失**（仅展示值，缺目标差/进度差/日均） |
| 总带新付费金额USD | overview, funnel | home | 业绩汇总 | ❌ **双差额体系缺失** |
| 注册预约率 | funnel | funnel | 漏斗转化率 | — |
| 预约出席率 | funnel | funnel | 漏斗转化率 | — |
| 出席付费率 | funnel | funnel | 漏斗转化率 | — |
| 注册转化率 | funnel, attribution | funnel, attribution | 综合转化 | — |
| 转介绍基础业绩单量标 | overview（target） | home | 目标基准 | — |
| 转介绍基础业绩标USD | overview（target） | home | 目标基准 | — |
| 转介绍基础业绩客单价标USD | ❌ 未消费 | ❌ 未展示 | 客单价目标 | ❌ **P1缺口：客单价目标对比缺失** |
| 区域单量达成率 | ❌ 仅 overview 原始透传 | home（原始字段显示） | 达成率看板 | ❌ **P1缺口：无达成率专属卡片** |
| 区域业绩达成率 | ❌ 仅 overview 原始透传 | home（原始字段显示） | 达成率看板 | ❌ **P1缺口：无达成率专属卡片** |
| 区域转介绍客单价达成率 | ❌ 仅 overview 原始透传 | home（原始字段显示） | 达成率看板 | ❌ **P1缺口：无达成率专属卡片** |

**D1 列利用率**：已深度利用 14/18 = **78%**，缺失：客单价目标字段 + 三项达成率字段未作专属展示

---

### 1.2 D2 — 围场过程数据-byCC（833行×25列）

| 列名 | 已消费 API | 前端页面 | 缺口 |
|------|-----------|---------|------|
| 统计日期(day) | enclosure（过滤） | enclosure | — |
| 区域 | enclosure | enclosure | — |
| 是否有效 | enclosure（有效行过滤） | enclosure | — |
| 围场 | enclosure, cc-matrix, team, channel | enclosure, cc-matrix, team, channel | — |
| 生命周期 | enclosure, attribution | enclosure, attribution | — |
| last_cc_group_name | enclosure, team, cc-matrix | enclosure, team, cc-matrix | — |
| last_cc_name | enclosure, team, cc-matrix | enclosure, team, cc-matrix | — |
| 学员数 | enclosure, team | enclosure, team | — |
| 转介绍参与率 | enclosure, cc-matrix | enclosure, cc-matrix | ❌ **无目标对比（CLAUDE.md 效率类5项缺失）** |
| 财务模型的参与率 | ❌ 未消费 | ❌ 未展示 | ❌ **P1缺口：财务模型参与率 vs 统计参与率双口径对比缺失** |
| 带新系数 | enclosure, cc-matrix | enclosure, cc-matrix | ❌ **无历史趋势** |
| 带货比 | enclosure, team, cc-matrix | enclosure, team, cc-matrix | — |
| 注册转化率 | enclosure, cc-matrix, attribution | enclosure, attribution | — |
| 带新参与数 | channel（attribution engine 使用） | channel | — |
| CC带新参与数 | channel（attribution engine 使用） | channel | — |
| SS带新参与数 | channel（attribution engine 使用） | channel | — |
| LP带新参与数 | channel（attribution engine 使用） | channel | — |
| 宽口径带新参与数 | channel（attribution engine 使用） | channel | — |
| 转介绍注册数 | enclosure, team, cc-matrix, channel | enclosure, team, channel | — |
| 转介绍付费数 | enclosure, team | enclosure, team | — |
| 总带新付费金额USD | enclosure, team, channel | enclosure, team, channel | — |
| 当月有效打卡率 | enclosure, team, daily-monitor | enclosure, team, checkin | — |
| CC触达率 | enclosure, cc-matrix, daily-monitor | enclosure, daily-monitor, checkin | — |
| SS触达率 | enclosure | enclosure | ❌ **SS触达率仅展示于围场页，无独立SS触达仪表盘** |
| LP触达率 | enclosure | enclosure | ❌ **LP触达率同上** |

**D2 列利用率**：已利用 23/25 = **92%**，缺失：财务模型参与率（双口径对比未建）

---

### 1.3 D2b — 围场过程数据-byCC副本（1行×7列）

| 列名 | 已消费 API | 前端页面 | 缺口 |
|------|-----------|---------|------|
| 区域 | ❌ 未接入 | ❌ 未展示 | ❌ P1缺口 |
| 统计日期(day) | ❌ 未接入 | ❌ 未展示 | ❌ P1缺口 |
| 学员数 | ❌ 未接入 | ❌ 未展示 | ❌ P1缺口 |
| 财务模型的参与率 | ❌ 未接入 | ❌ 未展示 | ❌ P1缺口 |
| 带新系数 | ❌ 未接入 | ❌ 未展示 | ❌ P1缺口 |
| 带货比 | ❌ 未接入 | ❌ 未展示 | ❌ P1缺口 |
| 带新参与数 | ❌ 未接入 | ❌ 未展示 | ❌ P1缺口 |

**D2b 列利用率**：0/7 = **0%**（完全未接入）
**价值**：全站 KPI 汇总行，可作为首页核心指标的 ground truth 来源（当前首页用 D2 聚合，存在误差）

---

### 1.4 D2-SS — 围场过程数据-bySS（517行×20列）

| 列名 | 已消费 API | 前端页面 | 缺口 |
|------|-----------|---------|------|
| 所有20列 | ❌ 完全未接入 | ❌ 完全未展示 | ❌ P0缺口：SS个人围场绩效无仪表盘 |

**D2-SS 列利用率**：0/20 = **0%**
**核心缺失**：SS 人员排名（cc-ranking-spec.md 已定义算法）、SS×围场矩阵、SS 触达拆解、SS 带新产出

---

### 1.5 D2-LP — 围场过程数据-byLP（322行×20列）

| 列名 | 已消费 API | 前端页面 | 缺口 |
|------|-----------|---------|------|
| 所有20列 | ❌ 完全未接入 | ❌ 完全未展示 | ❌ P0缺口：LP个人围场绩效无仪表盘 |

**D2-LP 列利用率**：0/20 = **0%**
**核心缺失**：LP 人员排名、LP×围场矩阵、LP 触达拆解

---

### 1.6 D3 — 明细（353307行×19列）

| 列名 | 已消费 API | 前端页面 | 缺口 |
|------|-----------|---------|------|
| stdt_id | student_360, outreach_quality | students/360 | — |
| 统计日期(day) | student_360, daily_monitor | students/360 | — |
| 区域 | outreach_quality, attribution | students/360, channel | — |
| 围场 | checkin, outreach_quality | checkin, channel | — |
| last_cc_group_name | checkin, outreach_quality | checkin | — |
| last_cc_name | checkin, outreach_quality, daily_monitor | checkin, daily-monitor | — |
| last_ss_group_name | checkin | checkin | — |
| last_ss_name | checkin | checkin | — |
| last_lp_group_name | checkin | checkin | — |
| last_lp_name | checkin | checkin | — |
| 转介绍注册数 | outreach_quality, student_360 | students/360 | — |
| 邀约数 | ❌ 未消费 | ❌ 未展示 | ❌ **P1缺口：邀约数漏斗节点缺失（注册→邀约→出席→付费完整链路）** |
| 出席数 | outreach_quality, student_360 | students/360 | — |
| 转介绍付费数 | outreach_quality, student_360 | students/360 | — |
| 总带新付费金额USD | outreach_quality | — | ❌ **未在前端展示** |
| 有效打卡 | checkin | checkin | — |
| CC接通 | outreach_quality | ❌ 无专属页面 | ❌ **outreach_quality API已建但无前端页面消费** |
| SS接通 | outreach_quality | ❌ 无专属页面 | ❌ **同上** |
| LP接通 | outreach_quality | ❌ 无专属页面 | ❌ **同上** |

**D3 列利用率**：已利用 16/19 = **84%**，关键缺口：邀约数（完整漏斗节点）、接通质量无前端页面

---

### 1.7 D4 — 已付费学员围场明细（18615行×59列）

**已深度消费的列（student_360 + cross_analyzer）**：
学员id、区域、业务线、当前国家名称、围场、生命周期、推荐人学员ID、打卡天数系列（上月/本月）、转码次数系列、课耗系列、推荐付费数、CC/SS员工姓名/组名称、CC末次拨打/备注/接通日期、末次接通时长、总CC拨打次数、三级渠道、总推荐注册/出席/付费数、次卡数据系列、CC/SS/LP带新付费数

**未消费的重要列**：

| 列名 | 缺口说明 | 优先级 |
|------|---------|--------|
| 真实姓名 | student_360 已有接口但前端仅显示ID | P2 |
| 当前菲教级别 | 教学质量与转介绍关联分析缺失 | P2 |
| 历史转码次数 | 学员活跃度画像缺失 | P2 |
| 推荐奖励领取状态 | ❌ 激励政策效果追踪完全缺失 | **P1** |
| 末次CC七级部门负责人姓名 | 部门层级追踪缺失 | P3 |
| 末次CC五级部门负责人姓名 | 同上 | P3 |
| 常登录国家 | 地理分布分析缺失 | P2 |
| 近3个自然月平均课耗 | 学习活跃度指标缺失 | P2 |
| 总续费订单数 | LTV 计算缺口 | P2 |
| 末次续费日期距今天数 | 续费风险预警缺失 | **P1** |
| 次卡距到期天数 | ❌ 到期预警仪表盘完全缺失 | **P0** |
| 总1v1续费订单数 | LTV细分缺失 | P2 |
| 宽口径带新人数/付费数 | 渠道分析已有但未做人数维度 | P1 |

**D4 列利用率**：约利用 40/59 = **68%**，关键缺口：到期预警（次卡距到期天数）、激励追踪（奖励领取状态）、续费风险（末次续费距今天数）

---

### 1.8 D5 — 高潜学员（419行×14列）

| 列名 | 已消费 API | 前端页面 | 缺口 |
|------|-----------|---------|------|
| stdt_id | high_potential, hp_warroom | high-potential, warroom | — |
| 统计日期(day) | high_potential | high-potential | — |
| 区域 | high_potential | high-potential | — |
| 业务线 | high_potential | high-potential | — |
| 围场 | high_potential, hp_warroom | high-potential, warroom | — |
| 总带新人数 | high_potential | high-potential | — |
| 出席数 | high_potential, hp_warroom | high-potential, warroom | — |
| 转介绍付费数 | high_potential | high-potential | — |
| last_cc_group_name | high_potential | high-potential | — |
| last_cc_name | high_potential | high-potential | — |
| last_ss_group_name | high_potential | high-potential | — |
| last_ss_name | high_potential | high-potential | — |
| last_lp_group_name | high_potential | high-potential | — |
| last_lp_name | high_potential | high-potential | — |

**D5 列利用率**：14/14 = **100%**（完全覆盖，但无 SS/LP 维度的高潜排名）

---

## 二、已有页面补全清单

| 页面 | 当前状态 | 缺失功能 | 优先级 |
|------|---------|---------|--------|
| home(/) | 原始字段显示 D1 数据 | ❌ 达成率三项无专属卡片；❌ CLAUDE.md 定义的8项数值指标展示格式未对齐（缺目标差/进度差/日均）；❌ 客单价目标对比缺失 | P0 |
| funnel | 5段漏斗已有 | ❌ D3邀约数节点缺失（注册→邀约→出席→付费应为4节点）；❌ 场景推演缺少效率提升量化说明 | P1 |
| enclosure | CC×围场矩阵完整 | ❌ 财务模型参与率 vs 统计参与率对比缺失；❌ SS/LP 触达在此页只作列展示，缺独立分析视角 | P1 |
| team | CC维度已有 | ❌ 完全没有 SS 视角；❌ 完全没有 LP 视角；❌ 无复合排名（cc-ranking-spec.md 算法未落地） | P0 |
| checkin | 四Tab完整 | ❌ D3邀约数未接入，导致触达→邀约→出席链路断裂 | P1 |
| daily-monitor | 触达统计+CC排名 | ❌ outreach_quality API（接通质量）已建但此页未消费；❌ SS/LP 个人排行榜仅靠 D3，无 D2-SS/D2-LP 加持 | P1 |
| channel | 6维度归因完整 | ❌ 宽口径带新人数未展示（仅有付费数）；❌ D2b全站汇总未对比 | P1 |
| attribution | D1+D4归因 | ❌ attribution/breakdown 按生命周期聚合已有，但前端页面对 D4 中"末次续费距今天数"等字段未展示 | P2 |
| students/360 | 单学员全画像 | ❌ 推荐奖励领取状态未展示；❌ 近3个月课耗未展示；❌ 次卡距到期天数未展示 | P1 |
| members | 未读代码，待确认 | 待确认 | — |
| high-potential | 完整 | ❌ 无SS/LP维度高潜排名 | P2 |
| enclosure-health | 健康评分+对标完整 | — | — |
| cc-matrix | 热力图+雷达+下钻 | ❌ 无SS-matrix/LP-matrix对应页面 | P0 |
| reports/ops, reports/exec | 报告生成 | — | — |
| present | 汇报模式 | — | — |
| indicator-matrix | 指标矩阵 | — | — |
| settings | 配置面板 | — | — |

---

## 三、新增仪表盘完整清单

### 3.1 P0 — 必须立即实现

---

#### 新增 A：SS/LP 人员绩效仪表盘（数据源：D2-SS + D2-LP）

**名称**：`/ss-lp-matrix` — SS/LP 围场绩效矩阵

**描述**：对标 cc-matrix 页面，为 SS/LP 提供围场×个人维度的绩效分析

**数据源链路**：
- D2-SS（517行×20列）→ SS 围场过程指标（参与率/打卡率/触达率/注册数/付费数）
- D2-LP（322行×20列）→ LP 围场过程指标

**API 链路**：
- 新建 `backend/api/enclosure_ss_lp.py`
  - `GET /enclosure-ss` → SS 按围场×个人聚合指标
  - `GET /enclosure-lp` → LP 按围场×个人聚合指标
  - `GET /team/ss-ranking` → SS 个人排名（按 cc-ranking-spec.md SS/LP算法：process×0.25 + result×0.30 + quality×0.25 + contribution×0.20）
  - `GET /team/lp-ranking` → LP 个人排名
- 新增 DataManager 中的 `enclosure_ss` / `enclosure_lp` 数据键（需新建 Loader）

**前端链路**：新建 `frontend/app/ss-lp-matrix/page.tsx`

**业务价值**：
- Before：SS 517条×LP 322条绩效数据 0% 被展示，运营无法追踪 SS/LP 个人产能
- After：SS/LP 排名表 + 围场矩阵 + 雷达图，管理层一键查看 SS/LP 绩效差异
- ROI：投入 1 天实现 → 产出：SS/LP 管理人效提升（当前 SS/LP 数据完全盲区）

**优先级**：P0（两个完整数据源 0% 利用率）

---

#### 新增 B：首页 KPI 达成率面板重构（数据源：D1 + 现有 overview API）

**名称**：首页 KPI 看板重构为 CLAUDE.md 指标显示规范

**描述**：CLAUDE.md 明确定义数值类指标必须展示8项（当前实际值/目标/绝对差/进度差/达标需日均/追进度需日均/效率提升需求/当前日均），效率类指标展示5项

**数据源链路**：D1 全部18列 + overview API 已计算的 kpi_pace

**API 链路**：现有 `/api/overview` 已有 `kpi_pace` 结构，扩展：
- 补充 `绝对差 = actual - target`（当前仅有进度差）
- 补充 `efficiency_needed = daily_avg_needed / current_daily_avg - 1`
- 补充 `客单价目标字段`（D1 `转介绍基础业绩客单价标USD` 当前未消费）
- 补充达成率三项（`区域单量达成率` / `区域业绩达成率` / `区域转介绍客单价达成率`）专属卡片

**前端链路**：重构 `frontend/app/page.tsx`，拆分为 `KPICard` 组件（8项展示）+ `RateCard` 组件（5项展示）

**业务价值**：
- Before：首页仅显示实际值，运营每次需心算与目标的差距和日均需求
- After：8维卡片一眼看出"今天还需做多少"
- ROI：节省运营人员每日 5 分钟计算时间 × 全团队人数

**优先级**：P0（CLAUDE.md 已明确规范）

---

#### 新增 C：次卡到期预警面板（数据源：D4）

**名称**：`/expiry-alert` — 次卡到期风险仪表盘

**描述**：基于 D4 `次卡距到期天数` 字段，展示 7/14/30天内到期学员，辅助 CC 优先跟进

**数据源链路**：D4（18615行）→ 过滤 `次卡距到期天数 <= 30` → 按围场×CC分组 → 按紧急程度排序

**API 链路**：
- 新建 `GET /students/expiry-alert?days=30` → 分层（7天内/8-14天/15-30天）到期学员列表
- 字段：stdt_id、围场、末次CC名、次卡距到期天数、当前次卡数、总推荐注册人数、历史付费数
- 新建 `GET /students/expiry-alert/summary` → 各层人数 + 预估流失付费量

**前端链路**：新建 `frontend/app/expiry-alert/page.tsx`，红黄绿三色分层卡片

**业务价值**：
- Before：到期学员信息散落在 D4 中，CC 无法主动识别高优先级跟进对象
- After：到期预警面板按紧急度排序，CC 每天打开即知今日必跟进名单
- ROI：假设 1% 挽留成功率 × 月均到期学员数 × 客单价 ≈ 每月增量收入

**优先级**：P0（D4 中已有精确字段，且属于直接影响收入的高价值场景）

---

### 3.2 P1 — 重要，下一迭代实现

---

#### 新增 D：D2b 全站汇总 KPI 核对面板（数据源：D2b）

**名称**：首页增加 D2b 全站汇总对比模块

**描述**：D2b 是全站 1行×7列的汇总数据，作为 D2 聚合结果的 ground truth 校验，直接对比发现数据漂移

**数据源链路**：D2b（1行×7列）→ 与 D2 聚合结果对比 → 差异率展示

**API 链路**：
- 修复 Loader pattern 碰撞问题（见第四节）后，新建 `GET /overview/d2b-summary`
- 返回：`{ students, finance_participation_rate, new_coefficient, cargo_ratio, participants }` + 与 D2 聚合值的差异 %

**前端链路**：在首页 Overview 底部增加"数据源一致性校验"卡片

**业务价值**：
- Before：D2 聚合值与实际全站汇总（D2b）存在未被发现的差异
- After：数据源校验自动化，发现数据问题时间缩短
- ROI：防止基于错误聚合值做决策

**优先级**：P1

---

#### 新增 E：激励政策效果追踪面板（数据源：D4）

**名称**：`/incentive-tracking` — 推荐奖励效果仪表盘

**描述**：基于 D4 `推荐奖励领取状态` 字段，分析领奖学员 vs 未领奖学员的转介绍行为差异

**数据源链路**：D4 → 按 `推荐奖励领取状态` 分组 → 对比两组的 `总推荐注册/付费数`、`带新系数`、`参与率`

**API 链路**：
- 新建 `GET /analysis/incentive-effect` → 领奖组 vs 未领奖组的指标对比
- 字段：`has_reward`（bool）、`students_count`、`avg_referral_registrations`、`avg_referral_payments`、`avg_new_coefficient`

**前端链路**：新建 `frontend/app/incentive-tracking/page.tsx`，双组对比卡片 + 相关性散点图

**业务价值**：
- Before：奖励政策发出后无量化效果追踪，无法判断 ROI
- After：领奖组/未领奖组的转介绍行为差异清晰可见，支撑激励政策优化
- ROI：激励政策 ROI 量化 → 削减低效激励成本 / 加大高效激励投入

**优先级**：P1

---

#### 新增 F：完整转介绍漏斗（含邀约节点）（数据源：D3）

**名称**：`/funnel` 页面补充邀约节点

**描述**：D3 含 `邀约数` 字段（当前漏斗为注册→预约→出席→付费，实际业务是注册→邀约→出席→付费，节点不对齐）

**数据源链路**：D3（353307行）→ 按统计日期聚合邀约数 → 与 D1 的注册/出席/付费数对比

**API 链路**：扩展 `GET /funnel` 增加 `invitation_count`（来自 D3.邀约数聚合）+ 两段转化率（注册→邀约率、邀约→出席率）

**前端链路**：修改 `frontend/app/funnel/page.tsx`，漏斗图增加邀约节点

**业务价值**：
- Before：漏斗中间节点不完整，无法定位邀约环节问题
- After：完整 4 段漏斗，定位邀约转化率瓶颈
- ROI：若邀约→出席率低，可定向优化邀约话术，提升出席率

**优先级**：P1

---

#### 新增 G：SS/LP 维度续费风险预警（数据源：D4）

**名称**：在 student_360 和 checkin 页面增加续费风险字段展示

**描述**：D4 含 `末次续费日期距今天数`（续费间隔）字段，超过 N 天未续费的学员为高风险

**数据源链路**：D4 → 按 `末次续费日期距今天数` 分段（30/60/90天）→ 识别高风险学员

**API 链路**：
- 扩展 `GET /students/360/{stdt_id}` 增加 `renewal_risk_level`（high/medium/low）字段
- 新建 `GET /analysis/renewal-risk` → 按续费间隔分层的学员分布统计

**前端链路**：
- `frontend/app/students/360/page.tsx`：学员卡片增加续费风险标签
- 新建 `frontend/app/renewal-risk/page.tsx`：续费风险分布面板

**优先级**：P1

---

#### 新增 H：接通质量面板（数据源：D3 outreach_quality）

**名称**：`/outreach-quality` — 触达质量分析面板

**描述**：`outreach_quality` API 已建（`GET /analysis/outreach-quality`），但无任何前端页面消费

**数据源链路**：D3（CC接通/SS接通/LP接通/有效打卡 → 按围场聚合）

**前端链路**：新建 `frontend/app/outreach-quality/page.tsx`，展示：
- CC/SS/LP 三角色接通数 + 接通率（接通/学员数）按围场分布
- 有效打卡数与接通数的相关性散点图
- 接通后转介绍产出（注册/付费/金额）分析

**业务价值**：
- Before：outreach_quality API 已存在但 100% 未被前端消费（API 完全浪费）
- After：接通质量面板让 CC 看到"接通多不一定产出多"的质量维度
- ROI：识别接通率高但转化率低的 CC，针对性提升接通质量

**优先级**：P1

---

### 3.3 P2 — 锦上添花

---

#### 新增 I：学员行为轨迹可视化（数据源：D4 周度转码数据）

**描述**：D4 含 `第1-4周转码` 字段，可展示学员月内学习活跃度热图

**API 链路**：新建 `GET /analysis/learning-heatmap` → 按围场聚合各周转码率

**优先级**：P2

---

#### 新增 J：推荐链网络图优化（数据源：D4 推荐人学员ID）

**描述**：student_360 已有 `/network` 接口，可增加网络图深度分析（合伙人链路识别）

**优先级**：P2

---

#### 新增 K：地理分布分析（数据源：D4 常登录国家）

**描述**：D4 `常登录国家` 可支撑学员地理分布分析，识别跨国市场机会

**优先级**：P2

---

## 四、后端修复方案

### 4.1 Loader Pattern 碰撞修复

**问题 1**：D2 pattern `*围场过程数据*byCC*.xlsx` 同时匹配 `byCC` 和 `byCC副本`

**修复方案**：
```python
# 现有（有歧义）
"enclosure_cc": "*围场过程数据*byCC*.xlsx"

# 修复后（精确排除副本）
"enclosure_cc": "*围场过程数据*byCC[!副]*xlsx"  # 排除"副"字
# 或更健壮的方式：
"enclosure_cc": "*围场过程数据*byCC.xlsx"  # 不带副本后缀的精确匹配
"enclosure_cc_summary": "*围场过程数据*byCC副本*.xlsx"  # D2b 独立 key
```

**问题 2**：D3 pattern `*明细*.xlsx` 可能匹配 D4 `围场明细`

**修复方案**：
```python
# 现有（有歧义）
"detail": "*明细*.xlsx"

# 修复后
"detail": "*明细.xlsx"  # 严格匹配无前缀的"明细"
# 或用负向匹配：
"detail": re.compile(r"明细(?!.*围场).*\.xlsx")  # 排除含"围场"的
```

**修复位置**：`backend/core/data_manager.py`（DataManager 的 Loader pattern 注册处）

---

### 4.2 新增 SS/LP Loader

```python
# 在 DataManager 中新增以下 Loader 注册：

LOADER_REGISTRY = {
    # 现有
    "result": "*结果数据*.xlsx",
    "enclosure_cc": "*围场过程数据*byCC.xlsx",        # 修复 pattern
    "enclosure_cc_summary": "*围场过程数据*byCC副本*.xlsx",  # 新增 D2b
    "enclosure_ss": "*围场过程数据*bySS*.xlsx",       # 新增 D2-SS
    "enclosure_lp": "*围场过程数据*byLP*.xlsx",       # 新增 D2-LP
    "detail": "*明细.xlsx",                           # 修复 pattern
    "student": "*已付费学员围场明细*.xlsx",
    "high_potential": "*高潜学员*.xlsx",
}
```

**对应新增 API 文件**：`backend/api/enclosure_ss_lp.py`（参考 `enclosure.py` 结构，复用 `_df_to_metrics` 逻辑，适配 SS/LP 列名）

---

### 4.3 overview API 扩展（支持 CLAUDE.md 8项指标格式）

```python
# 在 overview.py 中扩展 kpi_pace 计算：

def _compute_kpi_8item(actual, target, elapsed, remaining, time_progress):
    """计算 CLAUDE.md 规定的数值类指标8项"""
    daily_avg = actual / elapsed if elapsed > 0 else None
    absolute_gap = actual - target if target else None
    pace_gap = (actual / target - time_progress) if target else None
    remaining_daily_avg = (target - actual) / remaining if remaining > 0 and target else None
    pace_daily_needed = max(0, target * time_progress - actual) / remaining if remaining > 0 and target else None
    efficiency_needed = (remaining_daily_avg / daily_avg - 1) if daily_avg and daily_avg > 0 and remaining_daily_avg else None

    return {
        "actual": actual,
        "target": target,
        "absolute_gap": absolute_gap,
        "pace_gap": pace_gap,
        "remaining_daily_avg": round(remaining_daily_avg, 2) if remaining_daily_avg else None,
        "pace_daily_needed": round(pace_daily_needed, 2) if pace_daily_needed else None,
        "efficiency_needed": round(efficiency_needed, 4) if efficiency_needed else None,
        "current_daily_avg": round(daily_avg, 2) if daily_avg else None,
    }
```

---

## 五、优先级排序与执行计划

### 执行 Wave 总览

| Wave | 内容 | 工作量 | 数据利用率提升 | Before | After |
|------|------|-------|--------------|--------|-------|
| Wave 1 (P0) | Loader修复 + SS/LP Loader + SS/LP仪表盘 + 首页重构 + 次卡预警 | 3天 | +35pp | 当前 D2-SS/D2-LP 0%；首页缺8项格式；次卡预警0% | D2-SS/D2-LP 75%；首页合规；次卡预警100% |
| Wave 2 (P1) | D2b接入 + 激励追踪 + 完整漏斗 + 接通质量前端 + 续费风险 | 2天 | +15pp | D2b 0%；邀约缺失；outreach_quality 浪费 | D2b 85%；漏斗完整；接通质量可见 |
| Wave 3 (P2) | 学习热图 + 推荐链优化 + 地理分布 | 1.5天 | +5pp | D4 未覆盖字段利用率低 | D4整体 85% |

---

### Wave 1 — Tag 拆解建议（P0，估 3天）

**Tag A：后端基础设施（无依赖，可并行）**
- `backend/core/data_manager.py`：修复 D2/D3 pattern 碰撞，新增 D2b/D2-SS/D2-LP Loader
- 新建 `backend/api/enclosure_ss_lp.py`（SS/LP围场API + 排名API）
- 扩展 `backend/api/overview.py`（8项指标格式 + 达成率三项 + 客单价目标）
- 新建 `backend/api/expiry_alert.py`（次卡到期预警 API）

**Tag B：前端页面（依赖 Tag A API）**
- 新建 `frontend/app/ss-lp-matrix/page.tsx`（SS/LP围场绩效矩阵）
- 重构 `frontend/app/page.tsx`（首页 8项KPI + 达成率卡片）
- 新建 `frontend/app/expiry-alert/page.tsx`（次卡到期预警）

---

### Wave 2 — Tag 拆解建议（P1，估 2天）

**Tag C：数据接入扩展（无依赖）**
- 接入 D2b：新建 `GET /overview/d2b-summary`
- 扩展 D3 漏斗：`GET /funnel` 增加邀约数节点
- 扩展 D4 续费风险：`GET /analysis/renewal-risk`
- 扩展激励效果：`GET /analysis/incentive-effect`

**Tag D：前端补全（依赖 Tag C）**
- 新建 `frontend/app/outreach-quality/page.tsx`（消费已有 outreach_quality API）
- 扩展 `frontend/app/funnel/page.tsx`（邀约节点）
- 新建 `frontend/app/incentive-tracking/page.tsx`
- 新建 `frontend/app/renewal-risk/page.tsx`

---

## 六、数据源利用率统计（Before/After 对比）

| 数据源 | 总列数 | 当前已消费列数 | 当前利用率 | Wave1后利用率 | Wave2后利用率 |
|--------|--------|--------------|-----------|-------------|-------------|
| D1 结果数据 | 18 | 14（深度）+4（透传） | 78% | **90%**（8项格式+达成率卡片） | 95% |
| D2 byCC | 25 | 23 | 92% | 95% | 97% |
| D2b byCC副本 | 7 | 0 | **0%** | 60% | **85%** |
| D2-SS bySS | 20 | 0 | **0%** | **80%** | 90% |
| D2-LP byLP | 20 | 0 | **0%** | **80%** | 90% |
| D3 明细 | 19 | 16 | 84% | 89% | **95%**（邀约+接通质量前端） |
| D4 学员明细 | 59 | ~40 | 68% | **78%**（次卡预警+续费风险） | 85% |
| D5 高潜 | 14 | 14 | 100% | 100% | 100% |
| **总计** | **182** | **~107** | **59%** | **~145（80%）** | **~165（91%）** |

---

## 七、关键结论

> **核心发现**：D2-SS（517行×20列）和 D2-LP（322行×20列）是两个完整的人员绩效数据源，利用率 0%，与之对应的 SS/LP 排名算法已在 cc-ranking-spec.md 中完整定义，属于"算法就绪、数据就绪、实现缺失"的高确定性 P0 缺口。

> **最高 ROI 修复**：次卡到期预警（D4 `次卡距到期天数` 字段）直接对接收入场景，一个字段 → 一个可操作的跟进名单，CC 无需分析即可行动。

> **已建 API 未被消费**：`/api/analysis/outreach-quality` 完整实现触达质量分析，但无任何前端页面消费。这是 0 成本增量（仅需新建前端页面）。

> **Loader 碰撞风险**：D2/D3 的 pattern 碰撞尚未造成运行时错误（当前文件名恰好不触发），但属于隐性定时炸弹——用户上传新文件时可能触发。应在 Wave 1 中优先修复。
