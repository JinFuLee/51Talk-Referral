# 前端达成归因分析页面交付报告

**任务**: 达成归因分析页 /attribution (P0)
**完成时间**: 2026-03-22

## 创建的文件

| 文件 | 说明 |
|------|------|
| `frontend/lib/types/cross-analysis.ts` | AttributionSummary / AttributionBreakdownItem / SimulationResult / Warroom 类型 |
| `frontend/components/attribution/AchievementRing.tsx` | Recharts PieChart 环形达成率组件 |
| `frontend/components/attribution/ContributionBreakdown.tsx` | Recharts 横向 BarChart 贡献排名 |
| `frontend/components/attribution/GapSimulator.tsx` | 漏斗段选择 + range slider + SWR simulation |
| `frontend/app/attribution/page.tsx` | 主页面：3 个区域 + loading/error/empty 三态 |

## 修改的文件

| 文件 | 变更 |
|------|------|
| `frontend/lib/api.ts` | 新增 `attributionAPI`（getSummary / getBreakdown / getSimulation 3 个函数） |
| `frontend/components/layout/NavSidebar.tsx` | 新增"交叉分析"分组 + `/attribution` 导航项（GitMerge 图标） |

## API 接口对接

- `GET /api/attribution/summary` → `AttributionSummary`
- `GET /api/attribution/breakdown?group_by=enclosure|cc|channel|lifecycle` → `AttributionBreakdownItem[]`
- `GET /api/attribution/simulation?segment=xxx&new_rate=0.5` → `SimulationResult`

## 设计规范落实

- 颜色: >=100% 绿(#16a34a) / 50-99% 蓝(#2563eb) / <50% 红(#dc2626)
- loading / error / empty 三态全覆盖
- formatRevenue() / formatRate() 工具函数复用
- Card 包裹所有区域
- Tabs(围场/CC/渠道/生命周期) → ContributionBreakdown
