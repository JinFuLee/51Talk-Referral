# M37 Phase 3A Batch Migration Results

## 迁移统计

| 类别 | 文件数 | 状态 |
|------|--------|------|
| checkin 组件 | 6 | 完成 |
| analytics 组件 | 2 | 完成（4 个跳过，见下方说明） |
| slides 组件 | 4 | 完成（4 个 slide 跳过，见下方） |
| layout/settings 组件 | 2 | 完成 |
| knowledge/attribution 组件 | 3 | 完成 |
| student-360/warroom 组件 | 2 | 完成 |
| cc-performance 组件 | 1 | 完成 |
| hooks.ts | 1 | 部分完成（useHealth 换，其余保留自定义 fetcher） |
| useWideConfig.ts | 1 | 完成 |
| useCheckinThresholds.ts | 1 | 完成 |
| useIndicatorMatrix.ts | 1 | 完成 |

**已迁移文件：24 个**

## 跳过文件（6 个，保留 useSWR）

以下文件使用了自定义 transformer fetcher（`.then(d => d?.blocks?.xxx)`），
`useFilteredSWR` 只接受 URL+config，不支持自定义 transformer，因此保持不变：

1. `components/analytics/DecompositionWaterfallSlide.tsx` — 读 `/api/report/daily` → `.blocks.decomposition`
2. `components/analytics/FunnelLeverageSlide.tsx` — 读 `/api/report/daily` → `.blocks.funnel_leverage`
3. `components/analytics/LeadAttributionSlide.tsx` — 读 `/api/report/daily` → `.blocks.lead_attribution`
4. `components/analytics/MomAttributionSlide.tsx` — 读 `/api/report/daily` → `.blocks.mom_attribution`
5. `components/analytics/ChannelThreeFactorSlide.tsx` — 读 `/api/report/daily` → `.blocks.channel_three_factor`
6. `components/analytics/ChannelRevenueSlide.tsx` — 读 `/api/report/daily` → `.blocks.channel_revenue`

## 验证

- `npx tsc --noEmit`: 0 errors
- commit: `feat(M37): migrate remaining component/hook files to useFilteredSWR`
- push: main 分支已更新
