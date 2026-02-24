# Frontend Architecture — ref-ops-engine

> 设计基准：运营视图（数据密集型 / Grafana 风格）+ 业务视图（简洁卡片型 / Linear 风格）双模式并存。
> 现有代码：13 页面，43 组件，单层路由（无 /ops / /biz 分区）。
> 目标：扩展为双视角 11 页，补充 17 个新组件，全部 TypeScript 强类型。

---

## 1. 路由表

### 当前路由（保留）

| 路由 | 文件 | 状态 |
|------|------|------|
| `/` | `app/page.tsx` | 保留，重定向到 `/ops/dashboard` |
| `/datasources` | `app/datasources/page.tsx` | 保留 |
| `/settings` | `app/settings/page.tsx` | 保留 |
| `/reports` | `app/reports/page.tsx` | 保留 |
| `/snapshots` | `app/snapshots/page.tsx` | 保留 |
| `/history` | `app/history/page.tsx` | 保留 |

### 新增运营视图路由（ops — 数据密集型）

| 路由 | 文件 | 对应分析模块 |
|------|------|------------|
| `/ops/dashboard` | `app/ops/dashboard/page.tsx` | summary + anomalies + risk_alerts |
| `/ops/funnel` | `app/ops/funnel/page.tsx` | funnel + channel_comparison + student_journey |
| `/ops/ranking` | `app/ops/ranking/page.tsx` | cc_360 + ranking |
| `/ops/outreach` | `app/ops/outreach/page.tsx` | outreach_analysis + productivity |
| `/ops/trial` | `app/ops/trial/page.tsx` | trial_followup + checkin_impact |
| `/ops/orders` | `app/ops/orders/page.tsx` | order_analysis |

### 新增业务视图路由（biz — 简洁卡片型）

| 路由 | 文件 | 对应分析模块 |
|------|------|------------|
| `/biz/overview` | `app/biz/overview/page.tsx` | summary + prediction |
| `/biz/roi` | `app/biz/roi/page.tsx` | cohort_roi |
| `/biz/enclosure` | `app/biz/enclosure/page.tsx` | enclosure_cross |
| `/biz/trend` | `app/biz/trend/page.tsx` | trend + prediction + checkin_impact |
| `/biz/team` | `app/biz/team/page.tsx` | productivity + ranking |

---

## 2. 布局架构

```
RootLayout (app/layout.tsx)
├── WebMCPProvider
├── SWRProvider
└── div.flex.h-screen
    ├── NavSidebar (w-56, 双区折叠)   ← 扩展现有组件
    │   ├── [品牌区]
    │   ├── [运营视图 section]
    │   │   ├── /ops/dashboard  数据概览
    │   │   ├── /ops/funnel     转化漏斗
    │   │   ├── /ops/ranking    人员排名
    │   │   ├── /ops/outreach   外呼监控
    │   │   ├── /ops/trial      体验课跟进
    │   │   └── /ops/orders     订单分析
    │   ├── [业务视图 section]
    │   │   ├── /biz/overview   业务总览
    │   │   ├── /biz/roi        ROI 分析
    │   │   ├── /biz/enclosure  围场策略
    │   │   ├── /biz/trend      趋势预测
    │   │   └── /biz/team       团队概况
    │   └── [系统 section]
    │       ├── /datasources
    │       ├── /settings
    │       └── /snapshots
    └── div.flex-col.flex-1
        ├── Topbar (含 ViewModeBadge 运营/业务 标签)
        └── main.p-6
            └── {children}
```

**布局规则**
- 运营视图页面：`max-w-none`，内容满宽铺开，高密度网格
- 业务视图页面：`max-w-5xl mx-auto`，居中大卡片，呼吸感留白

---

## 3. 页面组件树

### 3.1 `/ops/dashboard` — 运营总览

```
OpsDashboardPage
├── PageHeader (title, RunAnalysisButton)
├── AnomalyBanner                          [NEW] 跨页顶部异常横幅
├── div.grid.cols-4                        KPI 主卡
│   └── KPICard ×4 (注册/付费/收入/Leads)  [REUSE]
├── div.grid.cols-3                        进度行
│   ├── TimeProgressBar                    [NEW] 时间进度条组件
│   ├── GoalGapCard (注册缺口)              [NEW] 缺口卡片
│   └── GoalGapCard (付费缺口)
├── div.grid.cols-2
│   ├── RiskAlertList                      [REUSE] 风险预警
│   └── AnomalyBadge                       [REUSE] 异常检测
└── DataSourceGrid                         [REUSE] 数据源状态
```

### 3.2 `/ops/funnel` — 转化漏斗

```
OpsFunnelPage
├── PageHeader
├── div.grid.cols-2
│   ├── Card("转化漏斗")
│   │   └── FunnelChart                    [REUSE]
│   └── Card("口径对比")
│       └── ChannelBarChart                [REUSE]
├── Card("学员旅程")
│   └── StudentJourneySankey               [NEW] 桑基图（注册→付费→LTV）
└── Card("口径明细表")
    └── ChannelComparisonTable             [NEW] 窄口/宽口各口径对比表
```

### 3.3 `/ops/ranking` — 人员排名

```
OpsRankingPage
├── PageHeader + TopN 选择器
├── RoleTabBar (CC / SS / LP)              [REUSE pattern]
├── div.grid.cols-5                        (左 3 + 右 2)
│   ├── div.col-span-3
│   │   └── RankingTable                   [REUSE]
│   └── div.col-span-2
│       └── RadarChart360                  [NEW] CC 360°雷达图
│           (触达率/打卡率/注册/付费/综合)
└── Card("得分分布")
    └── ScoreDistributionBar               [NEW] 横向分布条
```

### 3.4 `/ops/outreach` — 外呼监控

```
OpsOutreachPage
├── PageHeader
├── div.grid.cols-4                        数字卡
│   └── StatMiniCard ×4                   [NEW] 精简数字卡（拨打量/触达率/有效通话/平均时长）
├── Card("日历热力图")
│   └── OutreachHeatmap                    [NEW] 按日拨打量热力图（类 GitHub contribution）
├── div.grid.cols-2
│   ├── Card("CC 达标率表格")
│   │   └── CCOutreachTable               [NEW] CC 级外呼达标明细
│   └── Card("时段分布")
│       └── HourlyBarChart                [NEW] 24h 外呼时段分布
└── Card("人效趋势")
    └── TrendLineChart (productivity)      [REUSE]
```

### 3.5 `/ops/trial` — 体验课跟进

```
OpsTrialPage
├── PageHeader
├── div.grid.cols-3                        率指标卡
│   ├── RateCard("课前拨打率")             [NEW] 单指标率卡
│   ├── RateCard("出席率")
│   └── RateCard("打卡率")
├── div.grid.cols-2
│   ├── Card("打卡→带新因果")
│   │   └── CheckinImpactCard             [NEW] 因果关系可视化（箭头+数字）
│   └── Card("出席率关联")
│       └── ScatterChart                  [NEW] 拨打次数 vs 出席率散点图
└── Card("体验课明细")
    └── TrialDetailTable                  [NEW] 课前/课后拨打 + 出席 + 付费明细
```

### 3.6 `/ops/orders` — 订单分析

```
OpsOrdersPage
├── PageHeader
├── div.grid.cols-2
│   ├── Card("日付费趋势")
│   │   └── TrendLineChart (orders)        [REUSE]
│   └── Card("套餐分布")
│       └── PieChart                       [REUSE]
├── div.grid.cols-2
│   ├── Card("渠道对比")
│   │   └── ChannelBarChart               [REUSE]
│   └── Card("ROI 速览")
│       └── ROICard                        [REUSE]
└── Card("订单明细")
    └── OrderDetailTable                  [NEW] 订单明细可筛选表格
```

### 3.7 `/biz/overview` — 业务总览

```
BizOverviewPage
├── PageHeader (简洁版，无按钮)
├── div.grid.cols-2.gap-8
│   ├── BigMetricCard("本月收入")          [NEW] 大字卡，副标题环比
│   ├── BigMetricCard("ROI")
│   ├── BigMetricCard("付费增长")
│   └── BigMetricCard("月末预测")
├── Card("月末预测详情")
│   └── PredictionCard                    [REUSE]
└── Card("主要风险")
    └── RiskAlertList (精简版)             [REUSE]
```

### 3.8 `/biz/roi` — ROI 分析

```
BizROIPage
├── PageHeader
├── div.grid.cols-3
│   └── ROICard (大版本)                   [REUSE + 扩展]
├── Card("Cohort 衰减曲线")
│   └── CohortDecayChart                  [NEW] Cohort × ROI 折线（多 Cohort 叠加）
├── div.grid.cols-2
│   ├── Card("成本明细")
│   │   └── CostBreakdownTable            [NEW] 成本分项表
│   └── Card("LTV 估算")
│       └── LTVCard                        [NEW] LTV × 围场段卡片
└── Card("ROI 敏感度")
    └── SensitivityBarChart               [NEW] 各参数对 ROI 影响柱状图
```

### 3.9 `/biz/enclosure` — 围场策略

```
BizEnclosurePage
├── PageHeader
├── Card("围场 × ROI 热力图")
│   └── EnclosureHeatmap                  [NEW] 围场段(0-30/31-60/..) × 指标热力图
├── div.grid.cols-2
│   ├── Card("围场资源分配建议")
│   │   └── EnclosureRecommendationCard   [NEW] 文字 + 优先级标签
│   └── Card("围场分布饼图")
│       └── PieChart                      [REUSE]
└── Card("围场段明细")
    └── EnclosureDetailTable              [NEW] 每段学员数/ROI/触达率/打卡率
```

### 3.10 `/biz/trend` — 趋势 & 预测

```
BizTrendPage
├── PageHeader + 月环比/月同比 切换
├── Card("月度趋势")
│   └── TrendLineChart                    [REUSE]
├── Card("月末预测区间图")
│   └── PredictionBandChart               [NEW] 折线 + 置信区间阴影
├── div.grid.cols-2
│   ├── Card("打卡因果")
│   │   └── CheckinImpactCard             [REUSE from ops/trial]
│   └── Card("预测模型选用")
│       └── ModelSelectorCard             [NEW] 当前选优模型 + 置信度展示
└── Card("日级 KPI 曲线")
    └── DailyKPIChart                     [REUSE]
```

### 3.11 `/biz/team` — 团队概况

```
BizTeamPage
├── PageHeader
├── div.grid.cols-3
│   └── StatMiniCard ×3                   [REUSE from ops/outreach]
│       (在职CC/在职SS/今日上班)
├── div.grid.cols-2
│   ├── Card("人效趋势")
│   │   └── TrendLineChart (productivity) [REUSE]
│   └── Card("CC 成长曲线")
│       └── CCGrowthChart                 [REUSE]
└── Card("达标率总览")
    └── TeamAchievementTable              [NEW] CC/SS/LP 达标率对比表
```

---

## 4. 组件清单

### 4.1 可复用的现有组件（35 个）

| 组件 | 路径 | 复用于 |
|------|------|--------|
| `KPICard` | `components/charts/KPICard.tsx` | ops/dashboard, biz/overview |
| `SummaryCards` | `components/dashboard/SummaryCards.tsx` | ops/dashboard |
| `RiskAlertList` | `components/dashboard/RiskAlertList.tsx` | ops/dashboard, biz/overview |
| `AnomalyBadge` | `components/dashboard/AnomalyBadge.tsx` | ops/dashboard |
| `RunAnalysisButton` | `components/dashboard/RunAnalysisButton.tsx` | ops/dashboard |
| `FunnelChart` | `components/charts/FunnelChart.tsx` | ops/funnel |
| `ChannelBarChart` | `components/charts/ChannelBarChart.tsx` | ops/funnel, ops/orders |
| `TrendLineChart` | `components/charts/TrendLineChart.tsx` | ops/outreach, biz/trend, biz/team |
| `DailyKPIChart` | `components/charts/DailyKPIChart.tsx` | biz/trend |
| `CCGrowthChart` | `components/charts/CCGrowthChart.tsx` | biz/team |
| `PieChart` | `components/charts/PieChart.tsx` | ops/orders, biz/enclosure |
| `AttributionPieChart` | `components/charts/AttributionPieChart.tsx` | ops/funnel |
| `BarChart` | `components/charts/BarChart.tsx` | 通用 |
| `RankingTable` | `components/ranking/RankingTable.tsx` | ops/ranking |
| `ROICard` | `components/analysis/ROICard.tsx` | ops/orders, biz/roi |
| `PredictionCard` | `components/analysis/PredictionCard.tsx` | biz/overview, biz/trend |
| `DataSourceGrid` | `components/datasources/DataSourceGrid.tsx` | ops/dashboard |
| `FileUploadPanel` | `components/datasources/FileUploadPanel.tsx` | /settings |
| `NavSidebar` | `components/layout/NavSidebar.tsx` | 全局（需扩展双区） |
| `Topbar` | `components/layout/Topbar.tsx` | 全局（需加 ViewModeBadge） |
| `Card` | `components/ui/Card.tsx` | 全局 |
| `Spinner` | `components/ui/Spinner.tsx` | 全局 |
| `ProgressTable` | `components/charts/ProgressTable.tsx` | ops/dashboard |
| `SnapshotStatsCard` | `components/snapshots/SnapshotStatsCard.tsx` | /snapshots |
| `MarkdownRenderer` | `components/reports/MarkdownRenderer.tsx` | /reports |
| `ReportDownloader` | `components/reports/ReportDownloader.tsx` | /reports |
| `ReportViewer` | `components/reports/ReportViewer.tsx` | /reports |

### 4.2 需要新建的组件（17 个）

| 组件 | 路径 | 用途 |
|------|------|------|
| `AnomalyBanner` | `components/ops/AnomalyBanner.tsx` | 顶部全宽异常横幅 |
| `TimeProgressBar` | `components/ops/TimeProgressBar.tsx` | 月度时间进度独立组件 |
| `GoalGapCard` | `components/ops/GoalGapCard.tsx` | 目标缺口数值卡 |
| `StudentJourneySankey` | `components/charts/StudentJourneySankey.tsx` | 学员旅程桑基图（recharts/d3） |
| `ChannelComparisonTable` | `components/ops/ChannelComparisonTable.tsx` | 口径对比明细表 |
| `RadarChart360` | `components/charts/RadarChart360.tsx` | CC 360°雷达图（recharts RadarChart） |
| `ScoreDistributionBar` | `components/charts/ScoreDistributionBar.tsx` | 得分横向分布条 |
| `StatMiniCard` | `components/ui/StatMiniCard.tsx` | 精简数字卡（4 项一行） |
| `OutreachHeatmap` | `components/charts/OutreachHeatmap.tsx` | 日历热力图 |
| `CCOutreachTable` | `components/ops/CCOutreachTable.tsx` | CC 外呼达标明细表 |
| `HourlyBarChart` | `components/charts/HourlyBarChart.tsx` | 24h 时段分布 |
| `RateCard` | `components/ui/RateCard.tsx` | 单指标率展示卡 |
| `CheckinImpactCard` | `components/ops/CheckinImpactCard.tsx` | 打卡→带新因果可视化 |
| `BigMetricCard` | `components/biz/BigMetricCard.tsx` | 业务视图大字指标卡 |
| `CohortDecayChart` | `components/charts/CohortDecayChart.tsx` | Cohort 衰减折线图 |
| `EnclosureHeatmap` | `components/charts/EnclosureHeatmap.tsx` | 围场段 × 指标热力图 |
| `PredictionBandChart` | `components/charts/PredictionBandChart.tsx` | 预测区间置信带图 |

### 4.3 需修改的现有组件（3 个）

| 组件 | 修改内容 |
|------|---------|
| `NavSidebar` | 加 运营/业务/系统 三区折叠，新增 10 个路由项 |
| `Topbar` | 加 `ViewModeBadge`（运营视图 / 业务视图 标签），按当前路由前缀自动切换 |
| `RankingTable` | 扩展支持 SS/LP 额外列（EA/CM 字段映射显示） |

---

## 5. TypeScript 类型接口

与分析引擎输出对应的类型定义，统一放在 `frontend/lib/types/analysis.ts`：

```typescript
// ─── 基础类型 ────────────────────────────────────────────────────────────────

export type Status = "green" | "yellow" | "red";
export type RoleType = "CC" | "SS" | "LP";
export type EnclosureBand = "0-30" | "31-60" | "61-90" | "91-180" | "181+";

export interface MetricWithTarget {
  actual: number;
  target: number;
  unit?: string;
  status?: Status;
}

// ─── 模块 1: summary ─────────────────────────────────────────────────────────

export interface SummaryData {
  registrations: MetricWithTarget;
  payments: MetricWithTarget;
  revenue: MetricWithTarget;
  leads: MetricWithTarget;
  time_progress: number; // 0~1
  date: string;          // YYYY-MM-DD
}

// ─── 模块 2: funnel ───────────────────────────────────────────────────────────

export interface FunnelStage {
  name: string;
  value: number;
  conversion_rate?: number; // 0~1
}

export interface FunnelData {
  stages: FunnelStage[];
  total_registered: number;
  total_paid: number;
  overall_conversion: number;
}

// ─── 模块 3: channel_comparison ──────────────────────────────────────────────

export interface ChannelStat {
  channel: "CC_narrow" | "SS_narrow" | "LP_narrow" | "wide";
  label: string;
  registrations: number;
  payments: number;
  conversion_rate: number;
}

export interface ChannelComparisonData {
  channels: ChannelStat[];
  date: string;
}

// ─── 模块 4: student_journey ──────────────────────────────────────────────────

export interface JourneyNode {
  id: string;
  label: string;
  value: number;
}

export interface JourneyLink {
  source: string;
  target: string;
  value: number;
}

export interface StudentJourneyData {
  nodes: JourneyNode[];
  links: JourneyLink[];
}

// ─── 模块 5: cc_360 ───────────────────────────────────────────────────────────

export interface CC360Profile {
  name: string;
  rank: number;
  composite_score: number;
  registrations: number;
  payments: number;
  contact_rate: number;     // 触达率 0~1
  checkin_rate: number;     // 打卡率 0~1
  participation_rate: number; // 参与率 0~1
  outreach_count: number;
}

export interface CC360Data {
  rankings: CC360Profile[];
  top_n: number;
  date: string;
}

// ─── 模块 6: cohort_roi ───────────────────────────────────────────────────────

export interface CohortPoint {
  cohort: string;  // e.g. "2026-01"
  day: number;     // 0, 30, 60, 90...
  roi: number;
  revenue: number;
  cost: number;
}

export interface CohortROIData {
  cohorts: string[];
  series: CohortPoint[];
  ltv_estimate: number;
  currency: string;
}

// ─── 模块 7: enclosure_cross ─────────────────────────────────────────────────

export interface EnclosureRow {
  band: EnclosureBand;
  student_count: number;
  roi: number;
  contact_rate: number;
  checkin_rate: number;
  payments: number;
  recommendation?: string;
  priority?: "high" | "medium" | "low";
}

export interface EnclosureCrossData {
  rows: EnclosureRow[];
  best_band: EnclosureBand;
  date: string;
}

// ─── 模块 8: checkin_impact ──────────────────────────────────────────────────

export interface CheckinImpactData {
  checkin_rate: number;
  referral_rate: number;      // 带新系数
  causal_strength: number;    // 0~1，因果强度
  p_value?: number;
  description: string;
}

// ─── 模块 9: productivity ─────────────────────────────────────────────────────

export interface ProductivityData {
  active_cc: number;
  active_ss: number;
  active_lp: number;
  revenue_per_cc: number;
  payments_per_cc: number;
  achievement_rate: number; // 0~1
  trend: Array<{ date: string; revenue_per_cc: number }>;
}

// ─── 模块 10: order_analysis ─────────────────────────────────────────────────

export interface OrderItem {
  order_id: string;
  student_name?: string;
  channel: string;
  package: string;
  amount: number;
  currency: string;
  date: string;
}

export interface OrderAnalysisData {
  total_orders: number;
  total_revenue: number;
  package_distribution: Array<{ package: string; count: number; revenue: number }>;
  channel_breakdown: ChannelStat[];
  daily_trend: Array<{ date: string; orders: number; revenue: number }>;
  items: OrderItem[];
}

// ─── 模块 11: outreach_analysis ──────────────────────────────────────────────

export interface OutreachDailyPoint {
  date: string;
  calls: number;
  contacted: number;
  effective_calls: number; // >=120s
}

export interface CCOutreachRow {
  name: string;
  calls: number;
  contact_rate: number;
  effective_rate: number;
  avg_duration_s: number;
  achieved: boolean;
}

export interface OutreachAnalysisData {
  total_calls: number;
  contact_rate: number;
  effective_rate: number;
  avg_duration_s: number;
  daily_trend: OutreachDailyPoint[];
  cc_breakdown: CCOutreachRow[];
  hourly_distribution: Array<{ hour: number; calls: number }>;
}

// ─── 模块 12: trial_followup ─────────────────────────────────────────────────

export interface TrialFollowupRow {
  student_id: string;
  pre_call: boolean;
  post_call: boolean;
  attended: boolean;
  paid: boolean;
  checkin: boolean;
}

export interface TrialFollowupData {
  pre_call_rate: number;
  attendance_rate: number;
  checkin_rate: number;
  post_call_rate: number;
  scatter: Array<{ calls: number; attended: boolean }>;
  items: TrialFollowupRow[];
}

// ─── 模块 13: ranking ────────────────────────────────────────────────────────

export interface RankingEntry {
  rank: number;
  name: string;
  role: RoleType;
  composite_score: number;
  registrations: number;
  payments: number;
  contact_rate: number;
  checkin_rate: number;
}

export interface RankingData {
  CC: RankingEntry[];
  SS: RankingEntry[];
  LP: RankingEntry[];
  top_n: number;
  date: string;
}

// ─── 模块 14: trend ──────────────────────────────────────────────────────────

export interface TrendPoint {
  date: string;
  registrations: number;
  payments: number;
  revenue: number;
  mom_rate?: number; // 月环比
  yoy_rate?: number; // 月同比
}

export interface TrendData {
  compare_type: "mom" | "yoy";
  series: TrendPoint[];
  summary: {
    avg_mom_payments?: number;
    avg_yoy_payments?: number;
  };
}

// ─── 模块 15: prediction ─────────────────────────────────────────────────────

export interface PredictionBand {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

export interface PredictionData {
  eom_registrations: number;
  eom_payments: number;
  eom_revenue: number;
  confidence: number;
  model_used: string;
  band: PredictionBand[];  // 置信区间序列
}

// ─── 模块 16: anomalies ──────────────────────────────────────────────────────

export interface AnomalyItem {
  metric: string;
  severity: "high" | "medium" | "low";
  description?: string;
  value?: number;
  expected?: number;
  date?: string;
}

// ─── 模块 17: risk_alerts ────────────────────────────────────────────────────

export interface RiskAlert {
  level: "critical" | "warning" | "info";
  message: string;
  metric?: string;
  date?: string;
}

// ─── 组合页面 Props 类型 ──────────────────────────────────────────────────────

export interface DashboardPageData {
  summary: SummaryData;
  anomalies: AnomalyItem[];
  alerts: RiskAlert[];
  datasources: DataSourceStatus[];
  time_progress: number;
}

export interface DataSourceStatus {
  name: string;
  status: "ok" | "stale" | "missing";
  last_updated?: string;
  row_count?: number;
}
```

---

## 6. API Hooks 扩展

在 `frontend/lib/hooks.ts` 中补充以下 hooks（与现有模式一致）：

```typescript
// 新增 hooks（示例，与现有 useSummary 等保持相同模式）
export const useOutreachAnalysis = () => useSWR<OutreachAnalysisData>("/api/analysis/outreach");
export const useTrialFollowup   = () => useSWR<TrialFollowupData>("/api/analysis/trial");
export const useOrderAnalysis   = () => useSWR<OrderAnalysisData>("/api/analysis/orders");
export const useCohortROI       = () => useSWR<CohortROIData>("/api/analysis/cohort-roi");
export const useEnclosureCross  = () => useSWR<EnclosureCrossData>("/api/analysis/enclosure");
export const useCheckinImpact   = () => useSWR<CheckinImpactData>("/api/analysis/checkin-impact");
export const useProductivity    = () => useSWR<ProductivityData>("/api/analysis/productivity");
export const useCC360           = (topN = 10) => useSWR<CC360Data>(`/api/analysis/cc360?top_n=${topN}`);
export const useStudentJourney  = () => useSWR<StudentJourneyData>("/api/analysis/student-journey");
```

---

## 7. 视图切换机制

NavSidebar 的运营/业务区用 `<details>/<summary>` 或 Disclosure 模式折叠。
Topbar 中的 `ViewModeBadge` 依据 `usePathname()` 前缀自动渲染：

```
/ops/* → "运营视图" badge (slate-700 bg)
/biz/* → "业务视图" badge (indigo-600 bg)
其他   → 不显示
```

不引入全局状态，路由即状态，零额外 store。

---

## 8. 实施优先级

| 优先级 | 页面/组件 | 理由 |
|--------|---------|------|
| P0 | NavSidebar 双区扩展 | 所有新页面入口依赖 |
| P0 | `/ops/dashboard` | 主运营入口，直接复用现有组件 |
| P0 | `/biz/overview` | GM 最常看，最少新组件 |
| P1 | `/ops/funnel` + `/ops/ranking` | 核心数据密集页，现有组件基本够 |
| P1 | `/biz/roi` + `/biz/trend` | 业务决策核心，需 3 个新图表 |
| P2 | `/ops/outreach` + `/ops/trial` | 需要新热力图组件 |
| P2 | `/biz/enclosure` + `/biz/team` | 围场热力图 + 达标表 |
| P3 | `/ops/orders` | 数据依赖订单明细 loader 已就绪 |

---

## 9. 设计原则摘要

1. **双视角一套布局**：共用 layout.tsx，通过路由前缀和 CSS 参数区分密度
2. **组件优先复用**：35 个现有组件覆盖 ~70% 需求，新建 17 个补齐剩余
3. **路由即状态**：视图切换不引入额外 store，pathname 驱动
4. **类型先行**：所有分析引擎输出在 `lib/types/analysis.ts` 有对应接口，禁用 `as unknown`
5. **SWR 一致性**：所有数据获取走 hooks.ts，统一错误/加载态处理
6. **零额外依赖**：图表全用 Recharts，样式全用 Tailwind + shadcn/ui，无新引入
