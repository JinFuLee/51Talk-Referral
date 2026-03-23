# R3 Slide API 契约修复报告

## 验证结果

```
npx tsc --noEmit → 0 errors
```

## 修复清单

### Item 1：6 个 Slide `/api/channel` + `/api/channel/attribution` 包装对象 bug

| 文件 | 修复内容 |
|------|---------|
| `FunnelAttributionSlide.tsx` | 删除 `ChannelResponse` 包装 interface，`useSWR<ChannelConversion[]>`，`data ?? []` |
| `LeadAttributionSlide.tsx` | 删除 `ChannelResponse` 包装 interface，`useSWR<ChannelFunnel[]>`，`data ?? []` |
| `RevenueDecompositionSlide.tsx` | 删除 `ChannelResponse` 包装 interface，`useSWR<ChannelData[]>`，`data ?? []` |
| `RevenueContributionSlide.tsx` | 删除 `AttributionData` 包装 interface，`useSWR<ChannelAttribution[]>`，字段对齐：`paid_amount_usd→revenue`，`paid_ratio→share`，表头简化为 3 列 |
| `NetAttributionSlide.tsx` | 同上，字段对齐，渲染层改用 `revenue/share/per_capita`，补 `formatRate` import |
| `ChannelRevenueSlide.tsx` | 同上，`paid_amount_usd→revenue`，`per_capita_usd→per_capita`，pie/table 引用全更新 |

### Item 2：ThreeFactorSlide 字段名漂移

- `ChannelFactor` interface：`appointment_factor/attendance_factor/paid_factor` → `appt_factor/show_factor/pay_factor`
- 删除 `ThreeFactorResponse` 包装 interface
- `useSWR<ChannelFactor[]>`，`data ?? []`
- 渲染层 `FactorBadge` 调用同步更新

### Item 3：ScenarioAnalysisSlide 单对象消费

- `useSWR<ScenarioResult[]>` → `useSWR<ScenarioResult>`
- 渲染改为 card 布局展示单对象字段（current_rate/scenario_rate/impact_*）
- 添加 `!data` empty 态

### Item 4：ConversionRateSlide empty 态

- 在 error 分支后插入 `chartData.length === 0` 分支，显示"暂无漏斗数据"

### Item 7：SlideShell @keyframes 提取

- `SlideShell.tsx`：删除内联 `<style>` 块，保留 `style={{ animation: "slideIn 0.3s ease forwards" }}`
- `globals.css`：在 `@media (prefers-reduced-motion)` 前插入 `@keyframes slideIn` 定义

## 变更文件

- `frontend/components/slides/FunnelAttributionSlide.tsx`
- `frontend/components/slides/LeadAttributionSlide.tsx`
- `frontend/components/slides/RevenueDecompositionSlide.tsx`
- `frontend/components/slides/RevenueContributionSlide.tsx`
- `frontend/components/slides/NetAttributionSlide.tsx`
- `frontend/components/slides/ChannelRevenueSlide.tsx`
- `frontend/components/slides/ThreeFactorSlide.tsx`
- `frontend/components/slides/ScenarioAnalysisSlide.tsx`
- `frontend/components/slides/ConversionRateSlide.tsx`
- `frontend/components/presentation/SlideShell.tsx`
- `frontend/app/globals.css`
