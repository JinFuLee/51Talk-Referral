# MK2 产出：dashboard/funnel/channel 子组件（9个）

## 完成状态
commit: feat: add dashboard/funnel/channel sub-components (9 files)
hash: fb749209

## 创建的文件

### dashboard/（3个）
- `frontend/components/dashboard/TargetGapCard.tsx` — 单目标差距卡片，红绿着色 + 进度条
- `frontend/components/dashboard/FunnelSnapshot.tsx` — 漏斗转化率快照，PercentBar 三段
- `frontend/components/dashboard/AchievementGauge.tsx` — 圆形仪表盘（SVG arc），绿/黄/红

### funnel/（3个）
- `frontend/components/funnel/ScenarioTable.tsx` — 场景推演表，props: ScenarioResult[]
- `frontend/components/funnel/ConversionRateBar.tsx` — 转化率柱状图，Recharts BarChart + target 对比
- `frontend/components/funnel/ChannelFunnelTable.tsx` — 渠道漏斗拆分表，含合计行 + 各阶段转化率

### channel/（3个）
- `frontend/components/channel/RevenueContributionTable.tsx` — 贡献表，mini bar + 合计行
- `frontend/components/channel/ThreeFactorTable.tsx` — 三因素对标表，FactorBadge 着色
- `frontend/components/channel/ChannelPieChart.tsx` — 渠道饼图，Recharts PieChart donut

## TypeScript 状态
新增 9 个文件零 TS 错误。pre-existing 错误（swrFetcher/validator.ts/slides 等）非本 MK 引入。
