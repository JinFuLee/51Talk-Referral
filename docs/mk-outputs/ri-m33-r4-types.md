# MK1 产出：Slide 共享类型提取 + SlideShell 清理

## 执行摘要

- **tsc --noEmit**: 0 errors
- **commit**: `271efaf9`
- **push**: main 已更新

## Item A：共享类型提取

### 新增类型（`frontend/lib/presentation/types.ts`）

| 类型名 | 来源组件 | 后端 API |
|--------|----------|---------|
| `SlideProps` | 全部 10 个组件 | — |
| `ChannelAttribution` | ChannelRevenueSlide / RevenueContributionSlide / NetAttributionSlide（3→1） | /api/channel/attribution |
| `ChannelFunnel` | LeadAttributionSlide | /api/channel |
| `ChannelRevenue` | RevenueDecompositionSlide | /api/channel |
| `ChannelFactor` | ThreeFactorSlide | /api/channel/three-factor |
| `FunnelStageOverview` + `OverviewData` | TargetGapSlide | /api/overview |
| `ChannelConversion` | FunnelAttributionSlide | /api/channel |

**说明**：ConversionRateSlide、ScenarioAnalysisSlide 已从 `@/lib/types/funnel` 导入，无局部 interface，改为导入 `SlideProps` 替换各自局部 props interface。

### 局部 interface 删除统计

- 删除局部 interface 数：**8 个**（含 3 个完全相同的 `ChannelAttribution`）
- 去重：`ChannelAttribution` 3 处 → 1 处共享类型
- 全部组件改为从 `@/lib/presentation/types` 导入

## Item B：SlideShell 清理

`revealStep` 和 `maxRevealSteps` 在函数体中**仅出现在解构处，完全不被引用**（无任何条件判断/渲染逻辑依赖这两个值），已直接删除。

- 删除位置：`SlideShellProps` interface + 函数参数解构默认值
- 影响：10 个 Slide 组件均未传递这两个 props，无破坏性变更
