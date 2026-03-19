# MK1 产出：7 个汇报 Slide 组件

## 交付摘要

commit: 4ad464c1
路径: `frontend/components/slides/`

## 创建文件列表

| 文件 | API | 展示方式 |
|------|-----|---------|
| `RevenueContributionSlide.tsx` | `/api/channel/attribution` | 表格（注册数/占比/付费金额/付费率） |
| `NetAttributionSlide.tsx` | `/api/channel/attribution` | 表格（人均业绩/注册均价） |
| `RevenueDecompositionSlide.tsx` | `/api/channel` | 表格 + 进度条（差距红绿着色） |
| `LeadAttributionSlide.tsx` | `/api/channel` | 表格（注册→预约→出席→付费，含合计行） |
| `FunnelAttributionSlide.tsx` | `/api/channel` | 双表头表格 + 百分比 badge 着色 |
| `ChannelRevenueSlide.tsx` | `/api/channel/attribution` | Recharts PieChart + 表格 |
| `ThreeFactorSlide.tsx` | `/api/channel/three-factor` | 双表头表格 + 因素 badge |

## 质量说明

- 所有组件有 loading / empty / 正常 三态
- empty 态含操作指引（非空白）
- 使用 `formatRevenue` / `formatRate` 工具函数，零硬编码币种符号
- 无 mock/placeholder 数据，符合 CLAUDE.md 数据真实性政策
- 模式严格参照 TargetGapSlide.tsx（SlideShell + useSWR + Spinner）
