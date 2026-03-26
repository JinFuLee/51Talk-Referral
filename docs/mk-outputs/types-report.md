# P1-Types 产出报告

## 任务
M33 运营分析报告前端 TypeScript 类型定义

## 产出文件
`frontend/lib/types/report.ts` — 352 行，ESLint+Prettier 通过，已 commit

## 类型结构摘要

### 顶层
- `DailyReport` — GET /api/report/daily 返回根类型（date, bm_pct, blocks, target_recommendations, comparisons）
- `ReportBlocks` — 11 区块容器，字段名与 report_engine.py 输出键名对齐

### 11 区块 interface
| Interface | 对应区块 | 关键字段 |
|-----------|---------|---------|
| `MonthlyOverview` | 1 | targets/actuals/bm_efficiency/gap/remaining_daily_avg/pace_daily_needed |
| `GapDashboard` | 2 | channel_targets/gaps（revenue/asp/bill/showup/appt/lead/channel） |
| `ScenarioAnalysis` | 3 | scenarios[]（含 channel 可选字段支持口径级） |
| `Projection` | 4 | projected_*/revenue_gap_to_target/asp_sensitivity_per_dollar |
| `RevenueContribution` | 5 | channels[]/narrow_subtotal/total（全部 ChannelMetrics） |
| `MomAttribution` | 6 | rows[]（MomAttributionRow：7 指标 × 7 列） |
| `LeadAttribution` | 7 | rows[]/total（LeadAttributionRow：完整漏斗 + 占比） |
| `Decomposition` | 8 | laspeyres/lmdi/display_method/base_period/current_period |
| `FunnelLeverage` | 9 | scores[]/top_bottleneck（LeverageScore）|
| `ChannelRevenue` | 10 | rows[]（ChannelRevenueRow：MoM + driver_text） |
| `ChannelThreeFactor` | 11 | channels[]（ChannelThreeFactorRow：各渠道独立 Laspeyres+LMDI） |

### 通用复用类型
- `ComparisonResult` — current/previous/delta/delta_pct/judgment（↑↓→），8 维环比统一格式
- `ChannelMetrics` — 渠道完整漏斗（注册/预约/出席/付费/业绩/客单价 + 4 率）
- `TargetRecommendation` — 三档推荐（tier: conservative|moderate|aggressive），含 channel_targets
- `LeverageScore` — 区块 9 单条（influence × feasibility × urgency = leverage_score）
- `LaspeyrersDecomposition` — 三因素加法分解（vol/conv/price/residual）
- `LMDIDecomposition` — 对数分解（残差恒为 0）
- `ReportSummary` — 轻量摘要（钉钉 + 首屏快速渲染）

### 设计决策
- 百分比字段统一 0-1 范围（appt_rate=0.815，非 81.5）
- judgment 字段用 string literal union（"↑" | "↓" | "→"），便于 Recharts 图标渲染
- display_method 自动切换字段（残差 > 3% → lmdi），前端逻辑由类型契约固化
- Record<string, number> 用于动态指标键（targets/actuals/gap 等按指标名索引）

## Commit
`9cdfcf4d` feat(m33): add report TypeScript type definitions
