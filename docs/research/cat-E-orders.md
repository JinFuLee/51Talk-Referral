# E 类 Orders 8 源 — 面板运营/业务价值调研

> 调研员：mk-orders-sonnet | 日期：2026-02-21 | M16 数据价值调研

---

## 一、源清单与字段总览

| 源 | 目录名 | 已加载键名 | 核心字段 | 当前利用状态 |
|----|--------|-----------|----------|------------|
| E1 | BI-订单_CC上班人数_D-1 | `cc_attendance` | `date`, `active_5min`, `active_30min` | 部分（人效分析取最新一天） |
| E2 | BI-订单_SS上班人数_D-1 | `ss_attendance` | `date`, `active_5min`, `active_30min` | 部分（同上） |
| E3 | BI-订单_明细_D-1 | `order_detail` → `records`, `by_team`, `by_channel`, `by_date`, `summary`, `referral_cc_new` | `student_id`, `team`, `seller`, `channel`, `order_tag`, `product`, `date`, `amount_thb/cny/usd`, `order_id`, `order_type` | 深度使用（收入/排名/旅程/转介绍过滤） |
| E4 | BI-订单_套餐类型订单日趋势_D-1 | `order_daily_trend` | `date`, `product_type`, `order_count` | 部分（与 E5 合并为日趋势） |
| E5 | BI-订单_业绩日趋势_D-1 | `revenue_daily_trend` | `date`, `product_type`, `revenue_cny` | 部分（预测/趋势/异常检测） |
| E6 | BI-订单_套餐类型占比_D-1 | `package_ratio` → `by_channel.records` | 多级表头展平后的渠道×套餐占比 | 极低（仅透传到 package_distribution，前端只做简单 by_type 列表） |
| E7 | BI-订单_分小组套餐类型占比_D-1 | `team_package_ratio` → `by_team` | 小组×套餐类型占比 | **完全未用**（加载后不进入任何分析方法） |
| E8 | BI-订单_套餐分渠道金额_D-1 | `channel_revenue` → `by_channel_product` | 套餐×渠道×金额 | **完全未用**（加载后不进入任何分析方法） |

---

## 二、逐源分析

### E1 — CC 上班人数（cc_attendance）

**频率**：日级，T-1
**字段**：`date` / `active_5min`（有效外呼≥5分钟的 CC 数）/ `active_30min`（≥30分钟）

**当前利用**：
- `_analyze_productivity()` 仅取最新一天 `e1[-1]["active_5min"]` 用于计算 CC 人均产出
- 历史序列完全未使用

**价值洼地**：
1. **人员出勤日历热图**：按日展示 active_5min 人数，识别周内/月内出勤高峰低谷（周三不开班应为 0）。
2. **产能利用率趋势线**（E1 × E3）：`daily_rev / active_5min` 构建日级人均产出序列，叠加月目标基准线，一眼看出团队"人少但高产"还是"人多低效"。
3. **出勤 vs 业绩散点图**（E1 × E3 × E5）：X 轴 active_5min，Y 轴当日 revenue_usd，识别高/低出勤-高/低业绩四象限。

**可构建图表/交互**：
- `LineChart`：CC 出勤人数日趋势（active_5min + active_30min 双线）
- `AreaChart`：active_5min × 人均收入双 Y 轴叠加
- `ScatterChart`：出勤人数 × 当日业绩散点（Recharts ComposedChart 实现）

---

### E2 — SS 上班人数（ss_attendance）

**频率**：日级，T-1
**字段**：`date` / `active_5min` / `active_30min`

**当前利用**：
- `_analyze_productivity()` 仅取 `e2[-1]["active_5min"]` 作为当日 SS 人数

**价值洼地**：
1. **CC vs SS 出勤对比折线**：同图展示 CC/SS 日出勤，运营即时发现某方大面积缺勤对业绩的冲击。
2. **SS 人均产出趋势**（E2 × E3）：`ss_rev_daily / ss_active_daily`，供 SS 负责人追踪团队效率演变。
3. **关键日异常预警**：出勤人数低于历史均值 2σ 时自动触发 AnomalyBanner（已有基础设施）。

**可构建图表/交互**：
- `ComposedChart`：CC/SS 出勤双折线 + 业绩柱 + 人均线（4 系列同图）
- `BarChart`：CC vs SS 出勤人数周汇总对比
- Badge：当日出勤异常标记（已有 AnomalyBadge 组件）

---

### E3 — 订单明细（order_detail）— 最核心源

**频率**：日级，T-1
**字段**：`student_id`, `team`, `seller(CC名)`, `channel(渠道)`, `order_tag(新单/续单)`, `product(套餐名)`, `date`, `amount_thb/cny/usd`, `order_id`, `order_type`

**当前利用**：
- `_analyze_summary()`：referral_cc_new 过滤（CC+新单+转介绍）→ 月收入核心数字
- `_analyze_orders()`：by_team / by_channel / by_date / summary 汇总
- `_analyze_cc_ranking()`：按 seller 聚合 revenue_usd + paid_count
- `_analyze_student_journey()`：E3 join A3(leads) 构建学员全旅程
- `_analyze_cc_360()`：CC 个人 revenue/paid_count/ASP 计算
- 前端 `/ops/orders`：已有日趋势+套餐饼图+渠道对比+明细表格（但字段映射有 miss：cc_name/student_name 未对应 E3 实际字段 seller/student_id）

**价值洼地（尚未实现）**：
1. **seller × channel × date 透视表**（Power-BI 风格）：CC 名 × 渠道 × 日期三维交叉，一行看清每个 CC 在每个渠道的单量和收入。
2. **转介绍 vs 市场渠道收入 Waterfall**：以 E3.by_channel 为基础，前端已有 `ImpactWaterfallChart` 组件可直接复用。
3. **新单 vs 续单结构饼+趋势**：目前 by_type 饼图数据来自 E6（package_distribution），但 E3 更细：直接从 records 按 order_tag 分新单/续单 + 按 product 分套餐，双层嵌套饼（Sunburst 或 两级 PieChart）。
4. **订单地图（时段热力）**：E3 有 deal_time_hms 字段（时分秒），可按小时统计付费高峰，输出 24×7 热力矩阵（Recharts 用 `<Cell>` 着色的表格热图）。
5. **lead→order 全旅程转化**（E3 join A3）：已有 student_journey 端点，但前端 StudentJourneyFlow 仅展示阶段步骤，未显示 E3 端每个学员实际付费金额 + 从注册到付款的天数分布（留存漏斗直方图）。
6. **ASP 分布直方图**：按 amount_usd 分桶（<$100, $100-$200, $200-$500, $500+），识别高单价客群占比，供产品定价决策。

**可构建图表/交互**：
- `ComposedChart`：日付款单量（柱）+ 日收入（线）双轴
- `BarChart`：seller 收入排名（top10），颜色区分新单/续单
- `PieChart`：渠道贡献占比（转介绍 vs 市场 vs 其他）
- `Treemap`（Recharts 已内置）：product × channel 收入 treemap，识别高价值套餐×渠道组合
- 交互：seller 下拉筛选 → 动态更新渠道/套餐/日趋势（已有 search state 基础）
- 交互：日期范围 picker → 订单明细表格过滤

---

### E4 — 套餐类型订单日趋势（order_daily_trend）

**频率**：日级，T-1
**字段**：`date`, `product_type(套餐类型)`, `order_count`

**当前利用**：
- `_analyze_orders()` + `_analyze_trend()`：按 date 聚合总 order_count，与 E5 合并为日趋势
- 但 `product_type` 维度完全丢弃

**价值洼地**：
1. **套餐类型单量日趋势堆叠柱**：按 product_type 分色堆叠，展示每天各套餐成交节奏，识别某套餐的爆发/萎缩。
2. **收入速度计 Gauge**（E4 + E5）：`当日累计单量 / 达标需日均` = 进度百分比，Recharts `RadialBarChart` 做 Gauge，一眼看今天是否"够快"。
3. **套餐类型月内累计折线**：每个 product_type 的月累计单量折线（X=日期，Y=累计），对比哪类套餐增长更快。

**可构建图表/交互**：
- `BarChart` stacked：日订单按 product_type 分色堆叠
- `RadialBarChart`：收入/单量达标速度计（当前日均 vs 目标日均）
- `LineChart`：各套餐月内累计单量对比折线（多系列）

---

### E5 — 业绩日趋势（revenue_daily_trend）

**频率**：日级，T-1
**字段**：`date`, `product_type(套餐类型)`, `revenue_cny`

**当前利用**：
- `_analyze_trend()`：按 date 聚合总 revenue，构建日趋势
- `_analyze_prediction()`：基于日收入序列做三模型预测
- `_analyze_anomalies()`：日收入异常检测（±2σ）
- 但同样 `product_type` 维度未用

**价值洼地**：
1. **套餐收入贡献瀑布图**：以 product_type 为 X 轴，revenue_cny 为高度，展示哪类套餐是收入主力，哪类已经萎缩（`ImpactWaterfallChart` 已有，可直接复用）。
2. **日收入 vs 目标日均 Gauge**：与 E4 结合，同时展示单量和收入的当日完成进度，双指针 Gauge。
3. **月内收入累计面积图 + 预测置信带**（E5 + prediction）：实际曲线 + 预测中位线 + 上下置信区间，`PredictionBandChart` 已有基础，需接入 E5 精细数据。

**可构建图表/交互**：
- `AreaChart` stacked：各 product_type 日收入堆叠面积
- `ComposedChart`：实际日收入（柱）+ 目标日均线 + 预测月底值标注
- `LineChart`：月内累计收入 + 预测置信带（已有 PredictionBandChart 组件）

---

### E6 — 套餐类型占比（package_ratio）— 完全未深度使用

**频率**：日级，T-1（截至昨日数据）
**字段**：双层表头展平后为渠道×套餐的占比矩阵（具体列名依实际文件，含各渠道中各套餐占比百分比）

**当前利用**：
- `_analyze_orders()` 将 `e6` 作为 `package_distribution` 透传
- 前端 `_adapt_orders()` 只取 `by_type = Object.entries(package_distribution).filter(isNumeric)` 做简单饼图
- 渠道×套餐交叉维度完全丢弃

**价值洼地**：
1. **渠道×套餐产品结构饼/矩阵**：E6 的核心价值是同一套餐在不同渠道（市场/转介绍/宽口）的占比差异，可暴露"转介绍渠道高端套餐占比更高"等洞察。
2. **套餐占比趋势（月度对比）**：若历史快照中有多期 E6，可做套餐结构月度变化折线（识别产品升级/降级趋势）。
3. **渠道产品结构热力表**：行=渠道，列=套餐，格子填充颜色=占比，Recharts `<Cell>` + 手写表格，轻量但直观。

**可构建图表/交互**：
- `PieChart`（多个小饼，每个渠道一个）：各渠道内部套餐结构对比
- 热力矩阵：渠道×套餐占比（颜色深浅=占比高低）
- `BarChart` grouped：各套餐在不同渠道的占比对比（每套餐一组，每渠道一色）

---

### E7 — 分小组套餐类型占比（team_package_ratio）— 完全未用

**频率**：日级，T-1
**字段**：双层表头展平后为小组×套餐类型的占比矩阵（CC组/SS组 × 各套餐）

**当前利用**：**完全未接入分析，加载后孤立存放**

**价值洼地**：
1. **团队产品结构对比**：CC 组 vs SS 组各自的套餐占比是否有差异？如"CC 组偏好推短期套餐，SS 组偏好长期"，直接影响 ASP 管理策略。
2. **小组套餐排名柱图**：各小组按高价套餐占比排序，激励主推高价产品。
3. **套餐结构异动预警**：当某小组某套餐占比比上月下降 >10%，触发预警（接入 anomalies 框架）。

**可构建图表/交互**：
- `BarChart` stacked（100% 堆叠）：各小组套餐结构横向对比
- `RadarChart`：各小组在高/中/低价套餐维度的能力雷达
- `Table`：小组×套餐占比交叉表，支持排序

**后端需做**：`_analyze_orders()` 方法补充读取 `team_package_ratio.by_team`，输出 `by_team_package` 字段；API `_adapt_orders()` 增加 `team_package` 字段透传。

---

### E8 — 套餐分渠道金额（channel_revenue）— 完全未用

**频率**：日级，T-1（XML 损坏，calamine + openpyxl 双引擎兼容）
**字段**：`by_channel_product` 记录列表（套餐名 × 渠道 × 金额）

**当前利用**：**完全未接入分析，加载后孤立存放**

**价值洼地**：
1. **渠道贡献 Waterfall**：以各渠道为 X 轴，实际金额为 Y 轴，展示转介绍/市场/其他渠道对总收入的绝对贡献和增量，`ImpactWaterfallChart` 可直接复用。
2. **套餐×渠道热力矩阵**：行=套餐，列=渠道，格子=金额，识别"哪个套餐在哪个渠道最赚钱"的高价值组合。
3. **渠道收入趋势（历史快照对比）**：若快照系统存有多期 E8，可做渠道月度收入对比折线，监控转介绍渠道占比是否健康增长。

**可构建图表/交互**：
- `ImpactWaterfallChart`（已有组件）：渠道收入贡献 Waterfall
- `BarChart` grouped：各套餐在不同渠道的金额对比（按渠道分色）
- 交互：点击渠道 → 展开该渠道各套餐明细

**后端需做**：`_analyze_orders()` 补充读取 `channel_revenue.by_channel_product`，做列名归一化（列名随实际 Excel 表头变化），输出标准 `{channel, product, amount_usd}` 列表；新增 `GET /api/analysis/channel-revenue` 端点。

---

## 三、跨源联动机会

### 联动 1：E1/E2 × E3 — 产能利用率仪表盘（Priority: P1）

```
数据链: cc_attendance(date, active_5min) + order_detail(date, seller, amount_usd)
计算: daily_revenue_per_cc = Σ(amount_usd by date) / active_5min
输出: 产能利用率折线 + 人均收入 Gauge
已有基础: _analyze_productivity() 已实现单日快照，需扩展为历史序列
```

### 联动 2：E3 × A3(leads) — Lead→Order 全旅程留存漏斗

```
数据链: leads_detail.records(student_id, register_date) JOIN order_detail.records(student_id, date)
计算: 注册→付款天数分布 Histogram
输出: 0-7天/8-30天/31-60天/60天+ 转化分布
已有基础: _analyze_student_journey() 已 join，未计算天数分布
```

### 联动 3：E6 × E8 × E3 — 全链产品结构分析（Priority: P1，当前零利用）

```
数据链: E3(明细级订单) + E6(套餐占比矩阵) + E8(渠道金额)
输出: 渠道×套餐×金额全维度透视
价值: 识别"哪个套餐在哪个渠道利润率最高"→ 指导销售策略
```

### 联动 4：E7 × CC排名(E3) — 小组产品策略对比

```
数据链: team_package_ratio + cc_ranking(by seller)
输出: CC 小组套餐策略雷达图 + 高价套餐占比 vs 收入排名的散点图
价值: 验证"主推高价套餐是否真的提升 ASP"
```

### 联动 5：E3 × B1(ROI) — 订单级 ROI 分析

```
数据链: order_detail.records(channel, amount_usd) + roi_loader.summary(cost_by_channel)
计算: ROI_channel = revenue_by_channel / cost_by_channel
输出: 各渠道 ROI 对比柱图（转介绍渠道 ROI vs 市场渠道 ROI）
已有基础: _analyze_roi_estimate() 已有总体 ROI，需细化到渠道级
```

---

## 四、前端 Spec（新增/增强组件）

### 4.1 增强：`/ops/orders` 页面

**当前缺陷修复**：
- 明细表格字段映射错误：E3 实际字段是 `seller`（不是 `cc_name`），`student_id`（不是 `student_name`）
- `channel_breakdown` 来自 E3 `by_channel`，但适配器中转 dict 未标准化为 `{ channels: ChannelStat[] }`

**增强方案**：

```typescript
// 新增 ProductTypeTrendChart 组件（E4 × E5 双 Y 轴）
// 数据来源: GET /api/analysis/orders → daily_trend（已含 order_count + revenue_cny）
// 组件: ComposedChart, Bar(order_count 左轴) + Line(revenue_usd 右轴)

// 新增 PackageStructureChart 组件（E6）
// 数据来源: GET /api/analysis/orders → package_distribution（需后端扩展为渠道×套餐）
// 组件: 多个 PieChart（每渠道一个小饼） 或 BarChart grouped

// 增强 ChannelBarChart（E8）
// 数据来源: 新增 GET /api/analysis/channel-revenue
// 组件: ImpactWaterfallChart（已有）+ BarChart grouped（套餐细分）
```

### 4.2 新增：ProductivityDashboard 页面或组件（E1 × E2 × E3）

```typescript
// 位置: /ops/dashboard 增加 ProductivityCard 区块，或新页面 /ops/productivity
//
// 组件结构:
// ┌────────────────────────────────────────────┐
// │ 产能仪表盘           当日 CC 在线: 12人   │
// │ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
// │ │CC人均收入│ │SS人均收入│ │CC vs SS出勤│ │
// │ │$1,234    │ │$567      │ │LineChart   │ │
// │ └──────────┘ └──────────┘ └────────────┘ │
// │ 出勤×业绩散点图 (ScatterChart E1×E3)      │
// └────────────────────────────────────────────┘
```

### 4.3 新增：ChannelProductMatrix 组件（E6 × E8）

```typescript
// 渠道×套餐矩阵热力表
interface ChannelProductMatrixProps {
  data: Array<{
    channel: string;
    product: string;
    amount_usd: number;
    ratio: number; // E6 占比
  }>;
}
// Recharts: 手写 table + <Cell> fill 颜色编码
// 交互: 点击格子展开该 channel+product 的明细订单
```

---

## 五、后端 Spec

### 5.1 `_analyze_orders()` 扩展

```python
def _analyze_orders(self) -> dict:
    # 现有: E3/E4/E5/E6 → summary + daily_trend + package_distribution + by_channel

    # 新增 E7 接入:
    e7 = self.data.get("order", {}).get("team_package_ratio", {}).get("by_team", []) or []
    # 归一化列名 → {team, package_type, ratio}
    team_package = self._normalize_team_package(e7)

    # 新增 E8 接入:
    e8 = self.data.get("order", {}).get("channel_revenue", {}).get("by_channel_product", []) or []
    # 归一化列名 → {channel, product, amount_usd}
    channel_product = self._normalize_channel_revenue(e8)

    return {
        # 现有字段不变...
        "team_package": team_package,         # 新增
        "channel_product": channel_product,   # 新增
    }
```

### 5.2 新增 `_analyze_productivity_history()` 方法

```python
def _analyze_productivity_history(self) -> dict:
    """E1/E2 历史序列 × E5 日收入 → 产能利用率历史"""
    e1 = self.data.get("order", {}).get("cc_attendance", []) or []
    e2 = self.data.get("order", {}).get("ss_attendance", []) or []
    e5 = self.data.get("order", {}).get("revenue_daily_trend", []) or []

    e5_by_date = {r["date"]: (r.get("revenue_cny") or 0) for r in e5}
    e1_by_date = {r["date"]: (r.get("active_5min") or 0) for r in e1}
    e2_by_date = {r["date"]: (r.get("active_5min") or 0) for r in e2}

    all_dates = sorted(set(e1_by_date) | set(e2_by_date) | set(e5_by_date))
    history = []
    for d in all_dates:
        cc_count = e1_by_date.get(d, 0)
        ss_count = e2_by_date.get(d, 0)
        rev = e5_by_date.get(d, 0)
        history.append({
            "date": d,
            "cc_active": cc_count,
            "ss_active": ss_count,
            "revenue_cny": rev,
            "cc_per_capita": round(rev / cc_count, 2) if cc_count else None,
            "ss_per_capita": round(rev / ss_count, 2) if ss_count else None,
        })
    return {"history": history, "latest": history[-1] if history else {}}
```

### 5.3 新增 API 端点

```python
# backend/api/analysis.py 新增:

@router.get("/channel-revenue")
def get_channel_revenue() -> dict[str, Any]:
    """E8: 渠道×套餐金额矩阵（完全新端点）"""
    raw = _require_cache("order_analysis")
    return {"data": raw.get("channel_product", [])}

@router.get("/team-package")
def get_team_package() -> dict[str, Any]:
    """E7: 小组套餐结构（完全新端点）"""
    raw = _require_cache("order_analysis")
    return {"data": raw.get("team_package", [])}

@router.get("/productivity-history")
def get_productivity_history() -> dict[str, Any]:
    """E1/E2/E5: 产能历史序列（扩展现有 /productivity 端点）"""
    raw = _require_cache("productivity")
    return _adapt_productivity(raw)
```

---

## 六、优先级排序

| 优先级 | 内容 | 涉及源 | 工作量 | 业务价值 |
|--------|------|--------|--------|---------|
| P0 | 修复订单明细字段映射（seller/student_id）| E3 | 0.5h | 中（当前数据显示"—"） |
| P0 | 产品类型日趋势（E4 product_type 堆叠柱）| E4 | 1h | 高 |
| P1 | 产能利用率历史序列（E1/E2 × E5）| E1/E2/E5 | 2h | 高 |
| P1 | E7 接入 _analyze_orders()，小组套餐对比图 | E7 | 2h | 高（完全新洞察） |
| P1 | E8 接入 _analyze_orders()，渠道收入 Waterfall | E8 | 2h | 高（完全新洞察） |
| P2 | E6 渠道×套餐结构矩阵热力表 | E6 | 2h | 中 |
| P2 | ASP 分布直方图（E3 amount_usd 分桶）| E3 | 1h | 中 |
| P2 | 注册→付款天数分布（E3 × A3）| E3/A3 | 2h | 中 |
| P3 | 订单时段热力图（deal_time_hms）| E3 | 1.5h | 低（次级运营洞察） |
| P3 | 渠道 ROI 细化（E3 × B1）| E3/B1 | 3h | 中（需 ROI 真实数据）|

---

## 七、结论摘要

E 类 8 源的当前利用呈严重不均衡：

- **深度使用（E3/E5）**：订单明细和业绩日趋势是整个引擎收入数字的核心来源，已在 summary/ranking/trend/prediction/anomalies 五个分析模块中被消费。
- **浅度使用（E1/E2/E4）**：上班人数仅取最新一天快照（丢弃历史序列），套餐日趋势丢弃 product_type 维度——两处都是低成本高价值的改进点。
- **零利用（E7/E8）**：小组套餐占比和渠道金额两源完全未进入分析管线，是最大价值洼地。E8 的渠道×产品金额矩阵直接支持"哪个渠道卖什么套餐最赚钱"的运营决策，优先级应拉到 P1。
- **E6 深度开发不足**：当前仅做一维饼图，渠道×套餐二维占比矩阵完全浪费。

**最高 ROI 的下一步行动**：
1. `_analyze_orders()` 补充 E7/E8 接入（后端 2 个方法 + 2 个 API 端点）
2. E4 `product_type` 维度接入前端（堆叠柱图，1 个新组件）
3. 修复 E3 明细表字段映射（`seller` → CC 列，`student_id` → 学员列）
4. 将 E1/E2 从单日快照扩展为历史序列，构建产能利用率趋势

这 4 项合计约 6-8h 工作量，可将 E 类利用率从当前约 35% 提升到 80%+，直接支撑 M16 的核心分析深度目标。
