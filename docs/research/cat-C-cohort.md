# C 类 Cohort 6 源 — 面板运营/业务价值调研报告

> **调研日期**: 2026-02-21
> **调研员**: mk-cohort-sonnet
> **数据来源**: cohort_loader.py、analysis_engine_v2.py、前端组件

---

## 概述

C 类共 6 个 M-1 月度数据源，全部由 `CohortLoader` 统一加载，载入 `self.data["cohort"]`。结构统一：前 3 列（月份/海外大区/小组）+ 第 4-15 列（第 1-12 个月指标值 `m1`~`m12`）。

**当前利用率评估**：
- C1-C3（触达率/参与率/打卡率）：**部分利用**，仅 `by_month` 聚合进入 `cohort_roi` 分析和 LTV 估算，`by_team` 完全未用
- C4（带新系数）：**极少利用**，仅通过 KPI 模块间接引用，Cohort 维度数据**完全未用**
- C5（带货比）：**部分利用**，`by_month` 进 LTV 计算，`by_team` 未用
- C6（Cohort 明细表）：**完全未用**，8800+ 条学员级数据完全未进任何分析模块

---

## 源 C1: BI-cohort模型_CC触达率_M-1

- **频率**: M-1（上月数据）
- **字段清单**（loader 解析后）:

| 字段 | 类型 | 说明 |
|------|------|------|
| `月份` | str (YYYY-MM) | cohort 入组月 |
| `海外大区` | str | 大区名称 |
| `小组` | str | CC 小组名 |
| `m1`~`m12` | float/None | 第 1-12 个月触达率（0-1 之间） |

- **`by_team`** = 按月份+大区+小组的每行明细
- **`by_month`** = 按月份聚合的平均值（仅含小计/总计行）

- **当前利用**:
  - `_analyze_cohort_roi()`: 取 `by_month.m1` 作为各 cohort 月的触达率，计算衰减半衰期
  - `CohortDecayChart.tsx`: 展示触达率曲线（目前喂 mock 数据，未接真实 API）
  - 半衰期计算结果展示在 `biz/roi` 页卡片文字中

- **价值洼地**:
  - `by_team` 数据（小组维度的 m1-m12 衰减）完全未用
  - m2-m12 的跨月衰减曲线仅用来算半衰期，未用于可视化
  - 各 cohort 月之间的纵向对比（同一月龄不同 cohort 月的触达率趋势）未做

- **可构建图表/交互**（至少 3 个）:
  1. **Cohort 留存热力图（触达率）** — Recharts `Cell`+自定义渲染的矩形网格 — X轴=入组月(cohort月份)，Y轴=月龄(m1-m12)，色深=触达率值 — hover 显示具体值和同期对比 — 解决问题：识别哪个入组月学员触达率最高、衰减最慢
  2. **触达率衰减多线折线图** — `LineChart` — X轴=月龄(M1-M12)，每条线=一个cohort月，色渐变区分近远 — 点击线条高亮单个cohort — 解决问题：对比不同批次学员的触达持久性差异
  3. **小组触达率雷达图** — `RadarChart` — 各小组的 m1/m3/m6/m12 4个维度 — 切换查看不同入组月 — 解决问题：哪个小组在哪个月龄阶段触达执行力最强

- **跨源联动**:
  - join `月份` → C2(参与率)、C3(打卡率)、C4(带新系数)、C5(带货比)，构成完整行为漏斗衰减视图
  - join `小组` → F类(运营跟进数据)，识别高触达率是否对应高跟进强度
  - join `月份` → E类(订单)，验证高触达率月份是否对应更高付费转化

- **前端 spec**:
  - 组件名: `CohortRetentionHeatmap`，新建于 `frontend/components/charts/`
  - props: `{ data: CohortDecayPoint[][], metric: "reach"|"participation"|"checkin"|"coefficient"|"ratio" }`
  - 页面路由: `/biz/cohort`（新页面）或整合至 `/biz/roi`

- **后端 spec**:
  - API: `GET /api/analysis/cohort-decay?metric=reach_rate&group_by=month|team`
  - 返回: `{ by_cohort_month: [{cohort: "2025-09", m1: 0.82, m2: 0.65, ...}, ...], by_team: [...] }`

---

## 源 C2: BI-cohort模型_CC参与率_M-1

- **频率**: M-1
- **字段清单**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `月份` | str (YYYY-MM) | cohort 入组月 |
| `海外大区` | str | 大区 |
| `小组` | str | CC 小组 |
| `m1`~`m12` | float/None | 第 1-12 个月参与率（带>=1注册的学员/有效学员） |

- **当前利用**:
  - `_analyze_cohort_roi()`: 取 `by_month.m1` 计算参与率半衰期，参与 LTV 近似计算（当带货比缺失时用参与率代替）
  - `CohortDecayChart.tsx`: 参与率曲线（mock 数据）
  - LTV 估算的辅助数据源

- **价值洼地**:
  - `by_team` 完全未用（哪个小组学员更长期保持参与意愿）
  - m2-m12 的参与率衰减未可视化展示
  - 参与率与触达率之间的转化比（参与/触达）未计算，是衡量触达质量的核心指标

- **可构建图表/交互**:
  1. **触达→参与转化漏斗（月龄维度）** — 并排 `BarChart` — X轴=月龄，每组有触达率和参与率两条柱，中间可视化转化率 — hover 显示转化效率 — 解决问题：哪个月龄段触达了但没有转化为参与，是运营效率洼地
  2. **参与率衰减曲线 × 小组对比** — `LineChart` 多线 — X轴=月龄，每条线=小组，带 toggle 切换入组月 — 解决问题：哪个小组的学员参与持续性最好（运营能力识别）
  3. **参与率历史 Cohort 对比热力图** — 同 C1 热力图，参与率维度 — 共用 `CohortRetentionHeatmap` 组件，切换 `metric` prop — 解决问题：最近几个月参与率是否在提升（月度运营质量趋势）

- **跨源联动**:
  - 参与率/触达率比值 → 触达质量 → 联动 F5(外呼数据) 判断哪类外呼导致高转化参与
  - 参与率 m1 → 联动 E3(订单明细) 验证高参与率学员是否注册更多
  - 参与率 × C4(带新系数) → 每个参与学员平均带来的注册数

- **前端 spec**:
  - 复用 `CohortRetentionHeatmap`，`metric="participation"`
  - 新增: `CohortFunnelDecayChart` 展示触达→参与转化

- **后端 spec**:
  - 整合至同一 `GET /api/analysis/cohort-decay` 端点，`metric=participation_rate`

---

## 源 C3: BI-cohort模型_CC打卡率_M-1

- **频率**: M-1
- **字段清单**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `月份` | str (YYYY-MM) | cohort 入组月 |
| `海外大区` | str | 大区 |
| `小组` | str | CC 小组 |
| `m1`~`m12` | float/None | 第 1-12 个月打卡率（转码且分享的学员/有效学员） |

- **当前利用**:
  - `CohortDecayChart.tsx`: 打卡率曲线（mock 数据，未接真实数据）
  - 与 D1/D5 的打卡率数据**重叠但不同**：D1/D5 是当月日级数据，C3 是 cohort 月龄维度数据
  - 实际上：**C3 cohort 打卡率数据目前完全未被后端任何分析模块使用**

- **价值洼地**:
  - C3 的 cohort 月龄维度是 D1/D5 不具备的——D1/D5 只知道"本月打卡率"，C3 能回答"入组第3个月的学员打卡率是多少"
  - `by_team` 完全未用
  - 打卡率 cohort 衰减 vs 参与率衰减对比：哪个衰减更快？是否打卡率在早期更高但衰减更快？

- **可构建图表/交互**:
  1. **打卡率 Cohort 热力图** — 复用 `CohortRetentionHeatmap`，`metric="checkin"` — 解决问题：哪批学员打卡习惯最持久
  2. **打卡率 vs 参与率衰减对比** — 双线 `LineChart`，X轴=月龄，两线=打卡率/参与率 — 切换 cohort 月 — 解决问题：打卡和参与的相对关系随月龄如何变化，找到打卡驱动参与的最佳窗口期
  3. **打卡坚持曲线 × CC 小组排名** — `BarChart` — X轴=小组，Y轴=m6打卡率（第6个月仍保持打卡的比例），按值排序 — 点击显示该小组全部月龄曲线 — 解决问题：哪个小组培养出的学员打卡习惯最持久

- **跨源联动**:
  - C3 打卡率 cohort 数据 → 联动 `checkin_impact` 分析（D1×D5），验证 cohort 月龄打卡率与带新系数的相关性
  - C3 by_team × C4 by_team → 验证高打卡率小组是否对应高带新系数（目前 `checkin_impact` 方法只用 D1 数据，可用 C3 增强）

- **前端 spec**:
  - 复用 `CohortRetentionHeatmap`，`metric="checkin"`
  - 整合到 `/biz/cohort` 新页面，Tab 切换各指标维度

- **后端 spec**:
  - 整合至 `GET /api/analysis/cohort-decay`，`metric=checkin_rate`

---

## 源 C4: BI-cohort模型_CC帶新系數_M-1（完全未用，最大价值洼地之一）

- **频率**: M-1
- **字段清单**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `月份` | str (YYYY-MM) | cohort 入组月 |
| `海外大区` | str | 大区 |
| `小组` | str | CC 小组 |
| `m1`~`m12` | float/None | 第 1-12 个月带新系数（B注册数/带来注册的A学员数） |

- **当前利用**:
  - `CohortLoader.load_all()` 中以 key `referral_coefficient` 加载，数据进入 `self.data["cohort"]["referral_coefficient"]`
  - `_analyze_cohort_roi()` 中**未读取 C4**（只用了 C1/C2/C5）
  - `_analyze_checkin_impact()` 中"带新系数"来自 **D1(north_star_24h)** 的 `referral_coefficient` 字段，而非 C4
  - **结论：C4 cohort 带新系数数据目前完全未进入任何分析**

- **价值洼地**（最大价值洼地）:
  - 带新系数的 cohort 月龄衰减：学员入组第几个月带新能力最强？哪个月是带新的"黄金窗口"？
  - by_team 小组维度：哪个小组培养出的学员带新系数衰减最慢？
  - C4.m1 vs C2.m1 → 带新效率 = 带新系数/参与率，衡量每个参与学员平均带多少新
  - 月度 cohort 对比：近几个月新入组学员的带新系数是否在提升（衡量运营能力进步）

- **可构建图表/交互**:
  1. **带新系数 Cohort 热力图** — `CohortRetentionHeatmap`，`metric="coefficient"` — X轴=入组月，Y轴=月龄，色=带新系数值（建议用橙色系区分其他指标） — hover 显示"本月龄每个参与学员平均带X个新注册" — 解决问题：哪批学员、哪个月龄是带新主力
  2. **带新系数衰减曲线 × 黄金窗口标注** — `LineChart` — X轴=月龄，标注带新系数最高的月龄点（黄金窗口），可叠加参与率曲线对比 — slider 切换入组月 — 解决问题：CC 应该在学员入组第几个月重点运营带新活动
  3. **小组带新持久力排行榜** — `BarChart` 横向 — X轴=带新系数 m6 均值，Y轴=小组名，按值排序 — 点击查看该小组 m1-m12 完整曲线 — 解决问题：哪个小组的学员在半年后仍保持高带新能力（运营方法论差异识别）
  4. **带新效率雷达（参与率 vs 带新系数双维）** — `RadarChart` — 各入组月的 m1/m3/m6 共 6 个维度 — 解决问题：找到"高参与且高带新"的最优 cohort 月，反推当时运营动作

- **跨源联动**:
  - C4 带新系数 m1 → A1(注册数) → 联动验证高带新系数是否对应高注册量增长
  - C4 by_team → D1.referral_coefficient by_cc → join 小组名，用 C4 cohort 数据增强 `checkin_impact` 分析（比 D1 更精准，有月龄维度）
  - C4.m1 × C5.m1 → 综合效率指标：带新系数高但带货比低说明学员带来的注册质量低

- **前端 spec**:
  - 新组件: `CohortCoefficientChart`，复用 `CohortRetentionHeatmap` + 新增 `GoldenWindowAnnotation` 标注层
  - props: `{ data: CohortRawData, highlightGoldenWindow?: boolean }`
  - 路由: `/biz/cohort`，Tab "带新系数"

- **后端 spec**:
  - 新方法: `_analyze_cohort_coefficient()` 在 `analysis_engine_v2.py`
  - 返回: `{ by_cohort_month: [...], golden_window_m: int, team_ranking: [...], efficiency_ratio: [{cohort: str, m: int, coefficient: float, participation: float, efficiency: float}] }`
  - API: `GET /api/analysis/cohort-coefficient`（或整合至 cohort-decay）

---

## 源 C5: BI-cohort模型_CC帶貨比_M-1（部分利用，by_team 未用）

- **频率**: M-1
- **字段清单**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `月份` | str (YYYY-MM) | cohort 入组月 |
| `海外大区` | str | 大区 |
| `小组` | str | CC 小组 |
| `m1`~`m12` | float/None | 第 1-12 个月带货比（推荐注册数/有效学员数） |

- **当前利用**:
  - `_analyze_cohort_roi()`: 取 `by_month` 的 m1-m12 计算累积 LTV（Σ带货比×客单价）
  - `_analyze_ltv()`: 取最新 cohort 月的 m1-m12 计算 LTV_3m/LTV_6m/LTV_12m
  - **是所有 C 类源中利用率最高的（用于 LTV 和 ROI 计算）**

- **价值洼地**:
  - `by_team` 完全未用（哪个小组的学员带货比衰减最慢）
  - 各 cohort 月的 LTV 曲线对比未展示（只算了单一最新月）
  - 带货比 vs 带新系数的联动分析未做：带货比 = 带新系数 × 注册转付费率，可以拆解来源

- **可构建图表/交互**:
  1. **多期 LTV 曲线对比** — `LineChart` — X轴=月龄(m1-m12)，每条线=入组月，Y轴=累积 LTV（USD），带参考线=客单价 — 解决问题：哪一批学员的长期 LTV 最高（验证运营质量的滞后指标）
  2. **带货比 Cohort 热力图** — `CohortRetentionHeatmap`，`metric="ratio"` — 颜色用紫色系区分 — 解决问题：哪个月龄段带货比最高，重点运营时机
  3. **小组 LTV 分布箱线图** — `ScatterChart` 近似（Recharts 无 BoxPlot，用散点+自定义形状） — 展示各小组学员 12 个月累积 LTV 的分布 — 解决问题：LTV 高的学员集中在哪个小组，是特定运营方法论的成果吗

- **跨源联动**:
  - C5 带货比 × C4 带新系数 → 带货比 / 带新系数 ≈ 注册转付费率，cross-check E3(订单) 实际转化率
  - C5.m1-m12 累积 LTV × B1(ROI) 成本 → 精细化 cohort-level ROI 计算（比当前全量平摊更准确）
  - C5 by_team → 联动 CC 排名（ranking_cc），识别 LTV 最高小组的管理方法

- **前端 spec**:
  - 新组件: `LTVCohortCompareChart`，props: `{ cohortData: CohortRawData[], unitPrice: number }`
  - 路由: `/biz/roi` 现有页面增加 "多期 LTV 对比" section，或 `/biz/cohort` Tab "带货比/LTV"

- **后端 spec**:
  - 增强现有 `_analyze_ltv()` 方法，返回 `by_cohort_month` 数组（目前只返回最新月单点）
  - API 返回: 增加 `ltv_by_cohort: [{cohort: "2025-09", ltv_3m: 255, ltv_6m: 425, ltv_12m: 680}]`

---

## 源 C6: BI-cohort模型_CCcohort明细表_M-1（完全未用，最大价值洼地）

- **频率**: M-1
- **字段清单**（8806行×30+列，学员级明细）:

| 字段 | 类型 | 说明 |
|------|------|------|
| `月份` | str | 学员入组月 |
| `海外大区` | str | 大区 |
| `学员id` | str | 唯一学员标识 |
| `当前小组` | str | CC 所在小组 |
| `当前CC` | str | 负责该学员的 CC 名称 |
| `第m个月是否有效` (m=1-12) | 0/1 | 该月是否为有效学员（次卡>0且在有效期） |
| `第m个月是否触达` (m=1-12) | 0/1 | 该月是否被有效触达 |
| `第m个月带新注册数` (m=1-12) | int/None | 该月带来的新注册数（"-" 表示0，已处理） |

**Loader 聚合输出**:
- `records`: 学员级完整列表
- `by_cc`: {cc_name → {学员数, 有效学员数, 触达学员数, 带新注册总数}}（仅聚合 m1）
- `by_team`: {team_name → {学员数, 有效学员数, 触达学员数, 带新注册总数}}（仅聚合 m1）
- `total_students`: 总学员数

- **当前利用**:
  - `analysis_engine_v2.py` 中**零引用**，`multi_source_loader.py` 中以 `cohort.cohort_detail` 加载，**完全未进任何分析模块**
  - loader 聚合的 `by_cc`/`by_team` 也未被任何 API 端点返回
  - 前端无任何组件消费此数据

- **价值洼地**（最大价值洼地，8800+ 学员级数据）:
  1. **个人级留存分析**：每个学员 12 个月的有效/触达/带新时序，可做个体层面的生命周期追踪
  2. **CC 级真实带新效率**：`by_cc.带新注册总数` 已聚合，远比排名算法中用 D1/A 类间接推算更准确
  3. **触达质量分析**：`第m月是否触达` vs `第m月带新注册数`，学员级别验证"触达→带新"因果链
  4. **流失预警**：`第m月是否有效` 连续为 0 的学员识别为流失，可做月龄级别的流失率曲线
  5. **带新主力学员识别**：带新注册总数高的学员，分析其特征（月龄、小组）

- **可构建图表/交互**:
  1. **学员生命周期留存率曲线（真实数据版）** — `LineChart` — X轴=月龄(m1-m12)，Y轴=仍有效学员比例（累积 m1 有效数 / 总学员数），可按小组/入组月分组 — 区间选择器切换入组月范围 — 解决问题：取代当前基于 C1-C5 近似的衰减曲线，提供真实学员级留存率
  2. **CC 带新效率排行榜（C6 真实版）** — `RankingTable` 复用 — 基于 `by_cc.带新注册总数 / by_cc.有效学员数`，比当前排名更准确 — 列：CC名、负责学员数、有效率、触达率、真实带新率、带新总数 — 点击行展开该 CC 的 m1-m12 时序 sparkline — 解决问题：CC 排名的带新系数维度用真实学员级数据替代 D1 间接数据
  3. **流失漏斗（月龄流失率）** — `FunnelChart` 或 `BarChart` — X轴=月龄，Y轴=该月首次流失（`is_valid=0`）的学员占比 — 按小组分层展示 — hover 显示该月龄流失学员数和累计流失率 — 解决问题：哪个月龄是最大流失节点，指导运营在该时间点前加强干预
  4. **带新主力学员热图** — 散点图风格的 `ScatterChart` — X轴=月龄（最后一次触达月），Y轴=总带新注册数，点=学员，色=所在小组 — 框选交互识别高价值学员群体 — 解决问题：找到"高月龄仍高带新"的超级用户群，分析其特征反推运营策略
  5. **触达→带新转化验证图** — 并排 `BarChart` — 按月龄分组，展示"被触达且带新 / 被触达未带新 / 未被触达"三段比例 — 解决问题：量化在学员级别"触达是否真正驱动了带新"，验证 `checkin_impact` 因果链的真实性

- **跨源联动**:
  - join `当前CC` → CC 排名模块（ranking_cc），用 C6 真实带新数据替代 D1 间接数据，提升排名准确性
  - join `学员id` → E3(订单明细)（若有学员id字段），追踪学员是否付费，计算真实 LTV
  - join `当前CC` + `月份` → F5(外呼数据)，验证"高外呼量→高触达率→高带新率"因果链
  - join `当前小组` → C1-C5 by_team，补全小组级分析

- **前端 spec**:
  - 新页面: `/biz/cohort/students`（学员级明细）
  - 新组件:
    - `RetentionCurveChart`: props `{ data: StudentRetentionPoint[], groupBy: "team"|"cohort_month" }`
    - `CCBringNewRanking`: props `{ ccData: CCSummary[], sortBy: "rate"|"total" }`
    - `ChurnFunnelByAge`: props `{ data: ChurnData[] }`

- **后端 spec**:
  - 新分析方法: `_analyze_cohort_detail()` 加入 `analysis_engine_v2.py`
  - 返回结构:
    ```json
    {
      "retention_by_age": [{"m": 1, "valid_rate": 0.92, "reach_rate": 0.78}, ...],
      "by_cc": [{"cc": "XX", "students": 120, "valid_rate": 0.85, "reach_rate": 0.72, "bring_new_rate": 0.23, "bring_new_total": 28}],
      "by_team": [...],
      "churn_by_age": [{"m": 3, "first_churn_count": 45, "cumulative_churn_rate": 0.18}, ...],
      "top_bringers": [{"student_id": "xxx", "total_new": 8, "team": "CC-A", "last_active_m": 7}]
    }
    ```
  - 新 API: `GET /api/analysis/cohort-detail`

---

## 汇总：跨源联动机会矩阵

| join key | C1 | C2 | C3 | C4 | C5 | C6 | 外部源 |
|----------|----|----|----|----|----|----|--------|
| `月份` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | A/E/D 月汇总 |
| `小组` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | F类运营跟进 |
| `当前CC` | — | — | — | — | — | ✓ | D1排名/F5外呼 |
| `学员id` | — | — | — | — | — | ✓ | E3订单(理论) |

**最高价值联动**:
1. C1~C5 所有指标 by_month 同步可视化 → 完整漏斗衰减面板（5指标在一张图上对比衰减速度）
2. C4(带新系数) + C5(带货比) + C2(参与率) → 每个参与学员的带新和变现效率双指标
3. C6(学员明细) + D1(north_star) → 用学员级数据替代 D1 间接推算，提升 CC 排名带新维度准确性

---

## 新建建议：`/biz/cohort` 页面（统一 Cohort 分析中心）

**当前问题**: Cohort 衰减图散落在 `/biz/roi` 页（且喂 mock 数据），无专属 Cohort 分析页面。

**建议页面结构**:
```
/biz/cohort
├── Tab "衰减曲线"  — CohortRetentionHeatmap（5指标切换）+ 多期衰减折线对比
├── Tab "带新分析"  — C4 带新系数黄金窗口 + C6 CC 真实带新排行榜
├── Tab "LTV 预测"  — C5 多期 LTV 曲线 + cohort_roi API 数据（真实数据替换 mock）
├── Tab "学员流失"  — C6 流失漏斗 + 留存率曲线（学员级真实数据）
└── Tab "小组对比"  — by_team 各指标横向对比雷达图
```

---

## 优先级建议

| 优先级 | 任务 | 价值 | 工作量 |
|--------|------|------|--------|
| P0 | `CohortDecayChart` 接真实 API（替换 mock） | 即时，当前图表是假数据 | S |
| P0 | 新建 `_analyze_cohort_detail()` 消费 C6 数据 | 8800+ 学员级数据完全浪费 | M |
| P1 | `CohortRetentionHeatmap` 组件（C1-C5 热力图） | 高业务价值可视化 | M |
| P1 | 新建 `/biz/cohort` 页面，整合 C1-C5 衰减 | 统一入口 | M |
| P2 | C6 CC 真实带新排行榜（替代 D1 间接推算） | 提升排名准确性 | M |
| P2 | C4 带新系数黄金窗口分析 | 运营决策支撑 | S |
| P3 | LTV 多期 cohort 对比（增强 C5 利用） | 管理层决策 | S |
