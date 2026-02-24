# F 类 Operations 前 6 源 (F1-F6) 面板价值调研报告

> 调研日期：2026-02-21 | 调研者：mk-ops-outreach-sonnet

---

## 总览

| 源 ID | 数据源名称 | 目录 | 频率 | 优先级 | 当前利用状态 |
|-------|-----------|------|------|--------|------------|
| F1 | `funnel_efficiency` | 宣宣_漏斗跟进效率_D-1 | D-1 | P1 | 部分 — 仅进 CC 排名过程维度，未建独立面板 |
| F2 | `section_efficiency` | 宣宣_截面跟进效率_D-1 | D-1 | P1 | 低 — 仅 `by_channel` 汇总进 `_analyze_funnel`，截面维度未展示 |
| F3 | `section_mom` | 宣宣_截面跟进效率-月度环比_D-1 | D-1(月更) | P2 | 低 — 仅 `_analyze_trend` 拿 `by_month` 做月环比参考，无独立视图 |
| F4 | `channel_mom` | 宣宣_转介绍渠道-月度环比_D-1 | D-1(月更) | P2 | 未用 — loader 解析完成，分析引擎无任何调用 |
| F5 | `daily_outreach` | 宣宣_转介绍每日外呼数据_D-1 | D-1 | P1 | 中 — `_analyze_outreach` 拿 `by_date`/`by_cc`；前端热力图+趋势线+CC表已有基础实现 |
| F6 | `trial_followup` | 宣宣_转介绍体验用户分配后跟进明细_D-1 | D-1 | P1 | 中 — 进 `_analyze_outreach`（24h 率）+`_analyze_cc_ranking`（过程维度）；学员旅程联动已实现 |

---

## F1 — 漏斗跟进效率（`funnel_efficiency`）

### 字段清单

```
channel          渠道（市场/转介绍等）
team             CC 小组
cc_name          CC 姓名
leads            leads 数
appointments     预约数
attended         出席数
paid             付费数
appt_rate        预约率
appt_attend_rate 预约出席率
attend_paid_rate 出席付费率
funnel_paid_rate 漏斗注册付费率（leads→paid 总转化）
call_rate_24h    24h 拨打率
connect_rate_24h 24h 接通率
effective_rate_24h 24h 有效接通率
call_rate_48h    48h 拨打率
connect_rate_48h 48h 接通率
effective_rate_48h 48h 有效接通率
total_call_rate     总拨打率
total_connect_rate  总接通率
total_effective_rate 总有效接通率
```

**汇总层**：`summary`（总计行）含 leads/appointments/attended/paid/total_call_rate/total_connect_rate

### 当前利用情况

- `_analyze_cc_ranking` 中通过 F5 by_cc 数据计算 CC 过程得分，**F1 的 appt_rate / attend_paid_rate / funnel_paid_rate 字段未被利用**
- 无独立 API 端点暴露 F1 数据
- 前端 `/ops/funnel` 页面使用的是 `useFunnel()` 调 `/api/analysis/funnel`，该端点读的是 A1 leads 达成 + F2 by_channel，**不含 F1 多级漏斗细节**

### 价值洼地

1. **CC 级多层漏斗对比** — F1 有每 CC 的 leads/预约/出席/付费四层数据，可做个人漏斗效率排名（哪层转化最弱）
2. **24h/48h 响应速度** — `call_rate_24h` vs `call_rate_48h` 揭示首次外呼响应速度对后续转化的影响，是精准 coaching 依据
3. **渠道 × 漏斗交叉** — 按 channel 聚合的 appt_rate/attend_paid_rate 可揭示不同渠道 leads 质量差异（市场 vs 转介绍）

### 可构建图表/交互（≥3）

#### 图表 1：多层漏斗动画瀑布图（Recharts `FunnelChart` 增强）

```
数据结构（F1 summary 行）：
[
  { name: "Leads", value: leads },
  { name: "预约", value: appointments },
  { name: "出席", value: attended },
  { name: "付费", value: paid }
]
交互：按渠道 Tab 切换（市场/转介绍/全部）
每层右侧显示转化率 badge：预约率/出席率/付费率
颜色映射：blue→indigo→purple→pink（漏斗层级深化）
组件：<F1FunnelBreakdown channel="转介绍" data={f1Records} />
```

#### 图表 2：CC 24h 响应速度热力图（Recharts `ScatterChart`）

```
X 轴：call_rate_24h（0~1）
Y 轴：funnel_paid_rate（0~1）
点大小：leads 数量
点颜色：team（小组区分）
交互：hover 显示 cc_name + 各层转化率
意义：24h 响应快 + 漏斗转化高的 CC 是最优实践标杆
组件：<F1ResponseEfficiencyScatter data={f1Records} />
```

#### 图表 3：渠道转化率对比条形图（Recharts `BarChart` 分组）

```
X 轴：渠道（市场/转介绍）
Y 轴：各级转化率（%）
分组 bars：appt_rate / appt_attend_rate / attend_paid_rate / funnel_paid_rate
交互：hover tooltip 显示绝对数量
组件：<F1ChannelConversionBar data={f1ByChannel} />
```

#### 图表 4（加分）：48h vs 24h 响应达标率表格

```
表格列：CC姓名 / 小组 / 24h拨打率 / 24h接通率 / 48h拨打率 / 48h接通率 / 总有效率 / 达标状态
达标标准：total_effective_rate >= 0.6 → ✓绿，0.4-0.6 → 黄，<0.4 → 红
```

### 前端 Spec

```
页面：/ops/funnel（增强现有页面，新增 F1 Tab）
新组件：
  - frontend/components/ops/F1FunnelBreakdown.tsx — FunnelChart 增强，含渠道切换
  - frontend/components/ops/CCResponseHeatmap.tsx — ScatterChart，24h响应×转化率
新 API 调用：useF1Funnel() → GET /api/analysis/funnel-detail
```

### 后端 Spec

```python
# backend/api/analysis.py 新增端点
@router.get("/funnel-detail")
def get_funnel_detail() -> dict:
    """F1 漏斗跟进效率明细"""
    result = _get_result()
    ops_raw = result.get("ops_raw", {}) or {}
    f1 = ops_raw.get("funnel_efficiency", {})
    return {
        "records": f1.get("records", []),
        "summary": f1.get("summary", {}),
        # 按渠道汇总
        "by_channel": _agg_f1_by_channel(f1.get("records", [])),
    }
```

---

## F2 — 截面跟进效率（`section_efficiency`）

### 字段清单

```
channel_type     渠道类型（市场/转介绍）
month            月份（yyyyMM）
team             CC 小组
cc_name          CC 姓名
appt_rate        预约率
appt_attend_rate 预约出席率
attend_paid_rate 出席付费率
reg_paid_rate    注册付费率
registrations    注册数
appointments     预约数
attended         出席数
paid             付费数
amount_usd       美金金额
```

**汇总层**：`by_channel`（市场/转介绍各自的小计行）

### 当前利用情况

- `_analyze_funnel` 中引用 `by_channel`（市场/转介绍），仅用于计算 `efficiency_index`
- CC 级别（cc_name 非空行）和 team 级别数据**完全未使用**
- 月度分层（month 字段）**未使用** — F2 与 F3 的核心差异是 F2 只含当月，F3 含历史多月；F2 的精细度（CC 级 + 月内截面）是未开采宝矿

### 价值洼地

1. **CC 个人截面效率排行** — 当月每个 CC 的 appt_rate/attend_paid_rate，可做运营 coaching 的量化依据
2. **渠道 × 团队效率矩阵** — 市场渠道 CC 组 vs 转介绍渠道 CC 组的效率差异（amount_usd/paid 占比）
3. **注册付费率 reg_paid_rate 追踪** — 注册转付费是最终商业转化，与 D 类 KPI 联动可做预测

### 可构建图表/交互（≥3）

#### 图表 1：CC 截面效率四象限图（Recharts `ScatterChart`）

```
X 轴：appt_rate（预约率）
Y 轴：attend_paid_rate（出席付费率）
点大小：paid（付费数）
点颜色：channel_type
参考线：X/Y 均值线（分四象限）
四象限解读：
  右上 → 高效全能（预约率高 + 付费转化高）
  右下 → 预约强但付费弱（需 coaching 闭环）
  左上 → 付费强但预约弱（leads 质量优但开口不足）
  左下 → 整体薄弱（需全面辅导）
组件：<F2EfficiencyQuadrant data={f2Records} />
```

#### 图表 2：团队效率对比雷达图（Recharts `RadarChart`）

```
维度：appt_rate / appt_attend_rate / attend_paid_rate / reg_paid_rate
每条线：一个 team
颜色区分各 team
交互：点击 team 高亮，其余降透明度
组件：<F2TeamRadar data={f2ByTeam} />
```

#### 图表 3：渠道金额贡献堆叠条形图（Recharts `BarChart` 堆叠）

```
X 轴：渠道类型（市场/转介绍）
Y 轴：amount_usd（美金，格式化为 $X (฿Y)）
层：按 team 分色堆叠
tooltip：team 名 + 付费数 + 金额
组件：<F2ChannelRevenueStack data={f2ByChannel} exchangeRate={34} />
```

### 前端 Spec

```
页面：/ops/funnel（新增 Tab：截面效率）或独立页 /ops/section
新组件：
  - frontend/components/ops/F2EfficiencyQuadrant.tsx
  - frontend/components/ops/F2TeamRadar.tsx
  - frontend/components/ops/F2ChannelRevenueStack.tsx
新 API 调用：useF2Section() → GET /api/analysis/section-efficiency
```

### 后端 Spec

```python
@router.get("/section-efficiency")
def get_section_efficiency() -> dict:
    """F2 截面跟进效率 CC 级明细"""
    result = _get_result()
    f2 = (result.get("ops_raw") or {}).get("section_efficiency", {})
    return {
        "records": f2.get("records", []),      # CC 级明细
        "by_channel": f2.get("by_channel", {}), # 渠道汇总
        "by_team": _agg_f2_by_team(f2.get("records", [])),
    }
```

---

## F3 — 截面月度环比（`section_mom`）

### 字段清单

与 F2 相同列结构，额外：
```
alloc_paid_rate  分配付费率（F2 是 reg_paid_rate，F3 是 alloc_paid_rate）
allocations      分配数（替代 registrations）
```

**额外汇总层**：`by_month`（按 yyyyMM 分组的多月数据）

### 当前利用情况

- `_analyze_trend` 中引用 `f3.get("by_month", {})`，用于生成 `mom_channel` 字段（月度环比参考）
- 前端 `/trend` 页的 `TrendLineChart` 展示月度趋势，但仅用了 amount_usd/paid，**appt_rate/attend_paid_rate 等效率字段未入图**
- `records` 里的 CC 级多月明细**完全未使用**

### 价值洼地

1. **效率指标月度趋势矩阵** — 每渠道/每月的 appt_rate/attend_paid_rate/alloc_paid_rate，做多线趋势图
2. **CC 个人效率历史曲线** — 跨月 CC 级数据支撑个人成长分析（CC 在哪个月哪个效率出现拐点）
3. **渠道环比对比** — 市场 vs 转介绍的效率 MoM 对比，识别渠道结构性变化

### 可构建图表/交互（≥3）

#### 图表 1：效率趋势矩阵（Recharts `LineChart` × 多效率指标）

```
X 轴：月份（yyyyMM → "25年12月"等）
Y 轴：效率值（%）
线组：appt_rate（预约率）/ attend_paid_rate（出席付费）/ alloc_paid_rate（分配付费）
筛选器：渠道（市场/转介绍）、团队
每条线可单独 toggle
组件：<F3EfficiencyTrendMatrix data={f3ByMonth} />
```

#### 图表 2：CC 月度环比 Sparkline 矩阵

```
表格行：每个 CC
列：各月（最近 6 月）
单元格：sparkline 迷你折线（3-5 个点）+ 当月值 + MoM 箭头（↑↓）
颜色：正向绿/负向红
交互：点击 CC 行展开详情（月度明细弹窗）
组件：<F3CCSparklineMatrix data={f3Records} months={f3Months} />
```

#### 图表 3：渠道月度热力图（Recharts `ResponsiveContainer` 自定义格子）

```
X 轴：月份
Y 轴：渠道（市场/转介绍）
颜色深度：attend_paid_rate（出席付费率）
tooltip：月份 + 渠道 + 所有效率指标
意义：一眼识别哪个月哪个渠道效率最佳/最差
组件：<F3ChannelEfficiencyHeatmap data={f3ByMonth} />
```

### 前端 Spec

```
页面：/trend（增强现有趋势页，新增"效率趋势"Tab）
新组件：
  - frontend/components/charts/F3EfficiencyTrendMatrix.tsx
  - frontend/components/ops/F3CCSparklineMatrix.tsx
  - frontend/components/charts/F3ChannelHeatmap.tsx
新 API 调用：useF3Mom() → GET /api/analysis/section-mom
```

### 后端 Spec

```python
@router.get("/section-mom")
def get_section_mom() -> dict:
    """F3 截面效率月度环比"""
    result = _get_result()
    f3 = (result.get("ops_raw") or {}).get("section_mom", {})
    return {
        "records": f3.get("records", []),
        "by_channel": f3.get("by_channel", {}),
        "by_month": f3.get("by_month", {}),
        "months": f3.get("months", []),
    }
```

---

## F4 — 渠道月度环比（`channel_mom`）

### 字段清单

宽表结构（行=渠道，列=各月×指标），解析后：
```
channel           三级渠道名称
注册数__{yyyyMM}  各月注册数
注册占比__{yyyyMM} 各月注册占比
注册付费率__{yyyyMM} 各月注册付费率
客单价__{yyyyMM}  各月客单价
预约率__{yyyyMM}  各月预约率
预约出席率__{yyyyMM} 各月预约出席率
出席付费率__{yyyyMM} 各月出席付费率
months            可用月份列表
```

### 当前利用情况

- **完全未用** — `ops_loader` 解析完成，返回 `{records, months}`，但 `analysis_engine_v2.py` 中**无任何对 `channel_mom` 的引用**
- 前端无对应视图

### 价值洼地

1. **渠道注册贡献趋势** — 多渠道（手拿嘴要/打卡活动/运营直播/社群/合伙人）的注册数月度变化，识别高增渠道
2. **客单价渠道对比趋势** — 哪个渠道的客单价在持续提升，指导渠道策略
3. **渠道效率退化预警** — 注册付费率下降 + 预约率下降 = 渠道疲化信号，可触发 5-Why 根因链

### 可构建图表/交互（≥3）

#### 图表 1：渠道注册占比流河图（Recharts `AreaChart` 堆叠归一化）

```
X 轴：月份
Y 轴：占比（0-100%）
层：各渠道（颜色区分）
堆叠至 100%，展示渠道结构变化
交互：点击某渠道图层，高亮+显示该渠道各月数据 tooltip
组件：<F4ChannelShareStream data={f4Records} months={f4Months} />
```

#### 图表 2：渠道效率雷达对比（Recharts `RadarChart`）

```
维度：注册付费率 / 预约率 / 预约出席率 / 出席付费率 / 客单价（归一化）
月份选择器（默认最近月）
每条线：一个渠道
交互：渠道多选 checkbox + 月份对比（本月 vs 上月）
组件：<F4ChannelRadarCompare data={f4Records} />
```

#### 图表 3：渠道×指标 MoM 变化矩阵（表格型热力图）

```
行：渠道
列：各月
单元格值：注册付费率（可切换为其他指标）
颜色：正向提升→绿，下降→红
切换 tabs：注册数 / 客单价 / 注册付费率 / 出席付费率
顶部选择器：指标下拉
组件：<F4MoMMatrix data={f4Records} months={f4Months} />
```

#### 图表 4（高价值）：渠道客单价趋势对比（Recharts `LineChart`）

```
X 轴：月份
Y 轴：客单价 $（格式化为 $X (฿Y)）
线：每个渠道
标注：最高/最低客单价月份 dot
组件：<F4ChannelUnitPriceTrend data={f4Records} months={f4Months} exchangeRate={34} />
```

### 前端 Spec

```
页面：/biz/channels（新建）或 /trend（新增渠道 Tab）
新组件：
  - frontend/components/charts/F4ChannelShareStream.tsx
  - frontend/components/charts/F4ChannelRadarCompare.tsx
  - frontend/components/charts/F4MoMMatrix.tsx
  - frontend/components/charts/F4ChannelUnitPriceTrend.tsx
新 API 调用：useF4ChannelMom() → GET /api/analysis/channel-mom
```

### 后端 Spec

```python
@router.get("/channel-mom")
def get_channel_mom() -> dict:
    """F4 渠道月度环比（宽表解析）"""
    result = _get_result()
    f4 = (result.get("ops_raw") or {}).get("channel_mom", {})
    return {
        "records": f4.get("records", []),
        "months": f4.get("months", []),
        # 转换为前端友好结构：{channel, metrics: [{month, reg, appt_rate, ...}]}
        "by_channel": _pivot_f4(f4.get("records", []), f4.get("months", [])),
    }
```

---

## F5 — 每日外呼（`daily_outreach`）

### 字段清单

```
date             日期（YYYY-MM-DD）
team             CC 小组
cc_name          CC 姓名
avg_calls        当日人均拨打数
avg_connects     当日人均接通数
avg_effective    当日人均有效接通数
avg_duration_min 当日人均通话时长（分钟）
total_calls      当日该 CC 总拨打
total_connects   当日总接通
total_effective  当日总有效接通
total_duration_min 当日总通话时长
```

**聚合层**：`by_cc`（每 CC 月度累计）/ `by_team`（团队累计）/ `by_date`（日期聚合，含 cc_count）

### 当前利用情况

- `_analyze_outreach` 消费 `by_date`（时间序列）+ `by_cc`（CC 级汇总），计算 `avg_calls_per_cc` 和 `compliance_rate`
- 前端 `/ops/outreach` 页已有：热力图（`OutreachHeatmap`）+ 趋势线（`TrendLineChart`）+ CC 表（`CCOutreachTable`）
- **价值洼地**：热力图当前是团队粒度（by_date 按日期聚合），**CC 级热力图（Y=CC，X=日期）未实现**；avg_duration_min 字段**完全未使用**

### 价值洼地

1. **CC 级外呼热力图** — X=日期，Y=CC 姓名，颜色=total_calls，可发现单 CC 活跃度波动、周末表现、缺勤日
2. **通话时长分析** — avg_duration_min 反映通话质量，低时长+高接通=快速挂机（低质量），可与 F1 funnel_paid_rate 关联
3. **外呼合规时段趋势** — 按周维度聚合，识别是否有系统性外呼低谷（如月中松懈）

### 可构建图表/交互（≥3）

#### 图表 1（高价值）：CC 外呼热力图（`CCOutreachHeatmap`）

```
当前 OutreachHeatmap 只展示日期维度，升级为二维：
X 轴：日期（日历格）
Y 轴：CC 姓名（排序可配置：按总通话量/按团队）
颜色：total_calls（蓝色深浅）
tooltip：CC + 日期 + 拨打/接通/有效接通数
交互：
  - 点击单元格，弹出当日该 CC 明细
  - Y 轴 CC 排序切换：按月总量 / 按合规率 / 按团队
  - 颜色维度切换：拨打量 / 接通率 / 有效接通率
组件：<CCOutreachHeatmap2D data={records} />
数据来源：F5 records（date + cc_name + total_calls + total_effective）
```

#### 图表 2：通话时长 vs 转化率关联散点图

```
X 轴：avg_duration_min（月均通话时长）
Y 轴：CC 漏斗付费率（从 F1 join by cc_name）
点大小：total_calls（月总拨打量）
颜色：team
参考线：avg_duration_min 中位数（垂直）
意义：时长短但付费高 → 高效 CC；时长长但付费低 → 沟通无效
组件：<F5DurationConversionScatter f5Data={byCc} f1Data={f1Records} />
```

#### 图表 3：周维度外呼节奏趋势（Recharts `BarChart`）

```
X 轴：周次（W01, W02...）
Y 轴：avg_calls（日均拨打）
bar：团队层（颜色区分）
折线叠加：目标线（30次/天）
tooltip：周次 + 各团队拨打量 + 合规率
交互：下钻到周内日度分布
组件：<F5WeeklyOutreachBar data={byDate} target={30} />
```

### 前端 Spec

```
页面：/ops/outreach（增强现有页面）
升级组件：
  - frontend/components/charts/OutreachHeatmap.tsx → 升级为二维 CC 热力图
新组件：
  - frontend/components/charts/CCOutreachHeatmap2D.tsx
  - frontend/components/charts/F5DurationConversionScatter.tsx
  - frontend/components/charts/F5WeeklyOutreachBar.tsx
后端已有 /api/analysis/outreach，需补充 records 字段（当前仅返回 by_date + by_cc）
```

### 后端 Spec

```python
# 修改现有 /api/analysis/outreach，补充 records 和 by_team
@router.get("/outreach")
def get_outreach() -> dict:
    result = _get_result()
    outreach = result.get("outreach_analysis", {}) or {}
    f5 = (result.get("ops_raw") or {}).get("daily_outreach", {})
    return {
        ...现有字段...,
        "records": f5.get("records", []),      # 新增：CC × 日期明细
        "by_team": f5.get("by_team", {}),       # 新增：团队聚合
        "avg_duration_by_cc": {                 # 新增：时长分析
            cc: data.get("avg_duration_min", 0)
            for cc, data in (f5.get("by_cc") or {}).items()
        },
    }
```

---

## F6 — 体验用户跟进明细（`trial_followup`）

### 字段清单

```
channel          渠道（市场/转介绍）
alloc_date       分配日期
team             CC 小组
cc_name          CC 姓名
student_id       学员 ID（可与 A3 leads_detail 联动）
called_24h       是否 24h 内拨打（0/1）
connected_24h    是否 24h 内接通（0/1）
called_48h       是否 48h 内拨打（0/1）
connected_48h    是否 48h 内接通（0/1）
```

**聚合层**：
- `by_cc`：每 CC 的 total/called_24h/connected_24h/called_48h/connected_48h + 计算出的四个比率
- `by_team`：团队维度同上
- `summary`：整体 total_leads + 四个比率

### 当前利用情况

- `_analyze_outreach` 消费 `summary`（24h 率）和 `by_cc`
- `_analyze_cc_ranking` 消费 `by_cc` 作为过程维度权重
- `_analyze_student_journey` 消费 `records`，通过 student_id 与 A3 leads_detail 做旅程联动
- **价值洼地**：
  - `alloc_date` 按日聚合的分配流量趋势**未使用**
  - 24h/48h 接通率的**渠道维度**（市场 vs 转介绍 leads 的响应速度差异）**未分析**
  - `channel` 字段完全未用于筛选分析

### 价值洼地

1. **渠道分配质量对比** — 市场 leads vs 转介绍 leads 的 24h 接通率差异，量化分配后的运营响应速度差异
2. **分配量日趋势** — by alloc_date 聚合的每日分配量，可与 F5 外呼数据对照（分配多但外呼少→跟进遗漏）
3. **CC 24h 响应率排行** — 与 F1 漏斗付费率联动：24h 接通率高的 CC 其漏斗转化率是否显著更高

### 可构建图表/交互（≥3）

#### 图表 1：渠道响应率对比双条图（Recharts `BarChart`）

```
X 轴：渠道（市场/转介绍）
Y 轴：比率（%）
分组 bars：called_24h / connected_24h / called_48h / connected_48h
颜色：24h 系列深蓝，48h 系列浅蓝
tooltip：渠道 + 各率 + 样本量（total）
意义：识别哪个渠道 leads 被更快跟进（转介绍 leads 价值更高，应优先响应）
组件：<F6ChannelResponseBar data={f6ByChannel} />
```

#### 图表 2：CC 响应矩阵表（带条件颜色的排名表）

```
列：CC姓名 / 小组 / 分配量 / 24h拨率 / 24h接通率 / 48h拨率 / 48h接通率 / 综合响应评分
评分 = (called_24h × 0.3 + connected_24h × 0.4 + called_48h × 0.2 + connected_48h × 0.1) / total
颜色：每列独立色阶（红→绿）
排序：默认按综合响应评分降序
交互：点击 CC 行展开 alloc_date 时序分布
组件：<F6CCResponseMatrix data={f6ByCc} />
```

#### 图表 3：分配量×跟进覆盖趋势（Recharts `ComposedChart`）

```
X 轴：alloc_date（分配日期）
Y 轴1（bar）：当日分配量（leads 数）
Y 轴2（line）：当日 24h 拨打覆盖率
意义：分配量激增时跟进覆盖是否同步跟上（识别跟进断层）
数据来源：F6 records 按 alloc_date 聚合
组件：<F6AllocationCoverageChart records={f6Records} />
```

#### 图表 4（联动）：F6 + A3 学员旅程 Sankey

```
节点：分配 → 24h外呼 → 24h接通 → 预约 → 出席 → 付费
流量：各阶段人数
颜色：按渠道区分（市场蓝/转介绍紫）
数据来源：F6 records × A3 leads_detail（student_id 联动）
组件：<F6JourneySankey f6Records={f6Records} a3Records={a3Records} />
注：Recharts 无 Sankey，需用 recharts + custom SVG 或 d3-sankey
```

### 前端 Spec

```
页面：/ops/funnel（新增 Tab：分配跟进）
新组件：
  - frontend/components/ops/F6ChannelResponseBar.tsx
  - frontend/components/ops/F6CCResponseMatrix.tsx
  - frontend/components/charts/F6AllocationCoverageChart.tsx
  - frontend/components/ops/F6JourneySankey.tsx（需要 recharts + d3-sankey）
新 API 调用：useF6TrialFollowup() → GET /api/analysis/trial-allocation
```

### 后端 Spec

```python
@router.get("/trial-allocation")
def get_trial_allocation() -> dict:
    """F6 体验用户分配跟进明细（渠道维度 + 日期维度）"""
    result = _get_result()
    f6 = (result.get("ops_raw") or {}).get("trial_followup", {})
    records = f6.get("records", [])

    # 按渠道聚合
    by_channel = {}
    for r in records:
        ch = r.get("channel", "未知")
        if ch not in by_channel:
            by_channel[ch] = {"total": 0, "called_24h": 0, "connected_24h": 0,
                               "called_48h": 0, "connected_48h": 0}
        by_channel[ch]["total"] += 1
        by_channel[ch]["called_24h"] += r.get("called_24h", 0)
        by_channel[ch]["connected_24h"] += r.get("connected_24h", 0)
        by_channel[ch]["called_48h"] += r.get("called_48h", 0)
        by_channel[ch]["connected_48h"] += r.get("connected_48h", 0)

    # 按日期聚合
    by_date = {}
    for r in records:
        d = r.get("alloc_date", "")
        if not d:
            continue
        if d not in by_date:
            by_date[d] = {"total": 0, "called_24h": 0, "connected_24h": 0}
        by_date[d]["total"] += 1
        by_date[d]["called_24h"] += r.get("called_24h", 0)
        by_date[d]["connected_24h"] += r.get("connected_24h", 0)

    return {
        "summary": f6.get("summary", {}),
        "by_cc": f6.get("by_cc", {}),
        "by_team": f6.get("by_team", {}),
        "by_channel": by_channel,
        "by_date": [{"date": d, **v} for d, v in sorted(by_date.items())],
    }
```

---

## 跨源联动分析

### 联动 1：F1 × F5 → CC 效率综合排名动态看板

```
逻辑：
  F5 by_cc → 外呼合规率（total_calls / 工作日 / 30 目标）
  F1 by cc_name → 漏斗转化率（funnel_paid_rate）
  联动字段：cc_name（需做姓名标准化）
输出：双轴散点图 — X=合规率，Y=付费转化率
价值：识别"外呼多但转化低"（需 coaching 技巧）vs "外呼少但转化高"（低外呼风险）
```

### 联动 2：F6 × A3 → 学员分配→付费完整旅程

```
逻辑（已在 _analyze_student_journey 部分实现）：
  F6.student_id 匹配 A3.leads_detail.学员ID
  追踪：分配 → 24h接通 → 预约 → 出席 → 付费
当前差距：journey 计算中 outreached_count 计算正确，但
  1. by_channel（市场 vs 转介绍旅程对比）未输出
  2. 前端 StudentJourneyFlow 组件不支持渠道分层显示
增强方向：双轨旅程（市场/转介绍），每轨独立漏斗
```

### 联动 3：F3 × F4 → 渠道效率 × 渠道结构 双维变化

```
逻辑：
  F3 by_month → 截面效率月度变化（出席付费率/预约率）
  F4 records → 渠道注册占比月度变化
  联合分析：注册占比↑ + 出席付费率↓ = 渠道量增但质降（稀释效应）
输出：双 Y 轴折线图（注册占比 vs 出席付费率，同月份）
```

---

## 汇总：各源价值评级

| 源 | 当前利用率 | 挖掘潜力 | 实现优先级 | 最高价值图表 |
|----|-----------|---------|-----------|------------|
| F1 | 10%（仅排名过程维度） | ★★★★☆ | P1（独立面板缺失） | CC 24h响应散点 × 漏斗付费率 |
| F2 | 20%（仅 by_channel 两行） | ★★★★☆ | P1（CC 级截面数据完全未展） | CC 截面效率四象限图 |
| F3 | 30%（by_month 进 trend） | ★★★☆☆ | P2（效率趋势矩阵） | CC Sparkline 月度环比矩阵 |
| F4 | 0%（完全未用） | ★★★★★ | P1（解析完成但零利用） | 渠道注册贡献流河图 + MoM热力图 |
| F5 | 60%（by_date/by_cc 已用） | ★★★☆☆ | P2（CC粒度热力图升级） | CC 外呼二维热力图 |
| F6 | 50%（24h率+学员旅程） | ★★★☆☆ | P2（渠道维度+分配趋势） | 分配量 × 跟进覆盖趋势图 |

**最高优先级：F4 完全零利用，建议 M16 补充后端端点 + 前端渠道趋势页**

---

## 建议 M16 新增 API 端点清单

| 端点 | 数据源 | 新增工作量 |
|------|--------|----------|
| `GET /api/analysis/funnel-detail` | F1 | 后端 adapter + 2 前端组件 |
| `GET /api/analysis/section-efficiency` | F2 | 后端 adapter + 2 前端组件 |
| `GET /api/analysis/section-mom` | F3 | 后端 adapter + 2 前端组件 |
| `GET /api/analysis/channel-mom` | F4（0利用率）| 后端 adapter（含 pivot）+ 4 前端组件 |
| `GET /api/analysis/outreach`（修改） | F5 增强 | 补 records + by_team 字段 |
| `GET /api/analysis/trial-allocation` | F6 增强 | 后端 adapter（渠道维度）+ 3 前端组件 |
